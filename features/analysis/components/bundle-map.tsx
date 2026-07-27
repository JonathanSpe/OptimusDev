"use client";

import { scaleLinear } from "d3-scale";
import { motion } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { toEvidenceLevel, type FocusEntry } from "../rules";
import {
  CONFIDENCE_MAX,
  SCORE_MAX,
  categoryNameById,
  type Bundle,
} from "../sample-data";

/*
 * ============================================================================
 * DAS FELD DER BEFUND-LANDKARTE
 * ============================================================================
 * ⚠️ Sichtbar heisst ein `Bundle` "Befund" und `confidence` "Datenlage" — siehe
 * den Kopf von bundle-focus.tsx. Die Bezeichner hier bleiben englisch.
 *
 * Alle Befunde in einer Flaeche: Datenlage nach rechts, Score nach oben.
 *
 * Das Feld beantwortet eine Frage, die keine Liste beantworten kann: WO lohnt
 * sich Arbeit? Ein niedriger Wert allein sagt das nicht. Erst zusammen mit der
 * Belastbarkeit der Messung wird daraus eine Entscheidung — und genau diese
 * beiden Groessen sind die beiden Richtungen. Der Fall, an dem man es sieht,
 * ist 2.1: der niedrigste Score der ganzen Analyse, und trotzdem nichts zu tun,
 * weil er ganz links steht.
 *
 * DIE FLAECHE ZEIGT LAGE, NICHT WERTE. Deshalb hat sie kein Raster, keine
 * Achsenzahlen, keine Legende — nur vier Richtungswoerter an ihren Enden. Wer
 * eine Zahl braucht, findet sie in der Liste daneben und in der Tabelle unter
 * der Kachel; hier soll man auf den ersten Blick sehen, wo etwas liegt, und
 * nicht anfangen, Werte abzulesen, die man ohnehin nicht genau treffen kann.
 *
 * Das Feld gehoert zur Liste daneben und umgekehrt: dieselben drei Befunde,
 * dieselben Nummern, eine gemeinsame Hervorhebung. Der aktive Zustand liegt
 * deshalb NICHT hier, sondern in der Klammer um beide (bundle-focus.tsx).
 *
 * KEINE FARBKODIERUNG NACH KATEGORIE und keine Formen mehr: vier gedeckte
 * Farbtoene sind bei normalem Sehen nicht sicher auseinanderzuhalten, und ein
 * Formenschluessel ist eine Legende, die man erst lernen muss. Es gibt genau
 * eine Unterscheidung im Feld — Ansatzpunkt oder nicht —, und die traegt der
 * Marken-Akzent zusammen mit Groesse, Schein und Nummer.
 */

/*
 * DAS KREUZ IST EIN ANKER UND BEHAUPTET NICHTS.
 *
 * Es liegt in der Mitte der Flaeche und gibt dem Auge etwas, woran es die Lage
 * eines Punktes misst — mehr nicht. Es ist KEINE Schwelle: weder auf der
 * Score-Richtung (das waere eine Aussage ueber den Menschen, die klinisch
 * gesetzt und nicht geschaetzt wird) noch auf der Konfidenz-Richtung (das waere
 * die Grenze der Datenlage, und die steht heute nur noch in rules.ts, weil eine
 * gezeichnete Linie sofort als Urteil gelesen wird).
 *
 * ⚠️ Es bekommt deshalb KEINE Beschriftung, und kein Text in dieser Kachel darf
 * sich auf es beziehen. Sobald es etwas bedeutet, ist es kein Anker mehr.
 */
const ANCHOR = 50;

/*
 * Beide Richtungen rechnen in PROZENT der Flaeche, nicht in Pixeln. Damit
 * folgen die Marken ihrer Stelle, ohne feste Groesse — sie sitzen als HTML
 * ueber der Flaeche, kein verzerrter viewBox, keine Ellipsen aus Kreisen.
 *
 * Die Konfidenz-Domaene reicht eine halbe Stufe ueber beide Enden hinaus. So
 * kleben die Punkte der Randstufen nicht an der Kante.
 */
const toX = scaleLinear()
  .domain([0.5, CONFIDENCE_MAX + 0.5])
  .range([0, 100])
  .clamp(true);

/*
 * DIE SCORE-RICHTUNG IST EIN AUSSCHNITT. Ueber die volle Skala 0–100 draengen
 * sich alle Buendel in die obere Haelfte, und der Unterschied zwischen 58 und
 * 94 — der einzige, um den es hier geht — schrumpft auf ein Drittel.
 *
 * Zulaessig ist der Ausschnitt, weil in einem Punktfeld die POSITION vergleicht
 * und keine Laenge; uebertrieben waere er dort, wo der Wert als Balkenlaenge
 * oder Kurvensteigung gelesen wird (deshalb behaelt der Verlaufsgraph seine
 * volle Achse). Bedingung ist, dass er ANGESCHRIEBEN ist — der Satz dazu steht
 * unten am Feld, nicht im Kleingedruckten.
 *
 * ENTSCHEIDUNG: Der Ausschnitt rastet NICHT mehr auf Fuenferschritte ein. Das
 * Einrasten gab es fuer die Achsenzahlen, und die sind weg; heute schoebe es
 * die obere Kante bloss auf 100 und liesse die Flaeche wieder eine volle Skala
 * behaupten.
 */
const SCORE_PAD_RATIO = 0.1;
/** Rand, den die Flaeche innen frei laesst, damit keine Marke die Kante kuesst. */
const FIELD_INSET = 8;

function toScoreScale(bundles: readonly Bundle[]) {
  const scores = bundles.map((bundle) => bundle.score);
  const lowest = Math.min(...scores);
  const highest = Math.max(...scores);
  /* Ein einzelnes Buendel hat keine Spanne — dann traegt der Rand die Skala. */
  const padding = (highest - lowest || 1) * SCORE_PAD_RATIO;

  return scaleLinear()
    .domain([lowest - padding, highest + padding])
    .range([100 - FIELD_INSET, FIELD_INSET])
    .clamp(true);
}

/* ------------------------------------------------------------------------- */
/* Marken                                                                      */
/* ------------------------------------------------------------------------- */

/** Wie weit das uebrige Feld zuruecktritt, solange eine Marke aktiv ist. */
const MARK_DIMMED = 0.28;
/** Vergroesserung der angefassten Marke. */
const MARK_STEP = 1.35;

interface BundleMarkProps {
  bundle: Bundle;
  rank: number | undefined;
  x: number;
  y: number;
  isActive: boolean;
  isDimmed: boolean;
  /** Nur EIN Punkt liegt in der Tab-Reihenfolge; die Pfeiltasten fuehren weiter. */
  isRoving: boolean;
  onActivate: (id: string | null) => void;
  onRove: (id: string) => void;
  /** Pfeiltasten. Sie haengen an der Schaltflaeche, weil dort der Fokus liegt. */
  onNavigate: (event: KeyboardEvent<Element>) => void;
  registerMark: (id: string, node: HTMLButtonElement | null) => void;
}

function BundleMark({
  bundle,
  rank,
  x,
  y,
  isActive,
  isDimmed,
  isRoving,
  onActivate,
  onRove,
  onNavigate,
  registerMark,
}: BundleMarkProps) {
  const motionPreset = useMotionPreset();
  const tooltipId = useId();
  const category = categoryNameById(bundle.categoryId);
  const isPriority = rank !== undefined;

  return (
    /* Die aktive Marke steigt ueber die Nummern: ihre Karte liegt in ihrem
     * eigenen Stapel und kaeme sonst hinter einer Beschriftung zu liegen. */
    <div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2",
        isActive ? "z-40" : isPriority ? "z-20" : "z-10",
      )}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <motion.div
        variants={motionPreset.scanIn}
        /* Die Lage auf der Traverse — der Scan legt die Marke frei, wenn er
         * bei ihr ankommt, nicht nach einem Reihenplatz. */
        custom={x / 100}
        className="relative grid size-7 place-items-center"
      >
        <motion.span
          aria-hidden="true"
          animate={{ opacity: isDimmed ? MARK_DIMMED : 1 }}
          transition={motionPreset.hover}
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          {/* Der Schein vergroessert den Ansatzpunkt optisch, ohne ihn
           * groesser zu machen — Groesse ist schon vergeben. */}
          {isPriority ? (
            <span className="map-glow absolute size-11 rounded-full" />
          ) : null}
          <motion.span
            animate={{ scale: isActive ? MARK_STEP : 1 }}
            transition={motionPreset.hover}
            className={cn(
              "rounded-full",
              isPriority ? "bg-map-priority size-3" : "bg-map-mark size-2",
            )}
          />
        </motion.span>

        {/*
         * TODO(L3-Buendelansicht): oeffnet spaeter das Buendel mit seinen
         * Markern. Heute ist die Schaltflaeche der GRIFF — 28px gegen eine
         * 8px-Marke, damit man sie auch mit dem Daumen trifft.
         */}
        <button
          ref={(node) => {
            registerMark(bundle.id, node);
          }}
          type="button"
          tabIndex={isRoving ? 0 : -1}
          aria-label={`Befund ${bundle.id}, ${bundle.name}, ${category}, Score ${bundle.score} von ${SCORE_MAX}, Datenlage ${toEvidenceLevel(
            bundle.confidence,
          )}${rank === undefined ? "" : `, Ansatzpunkt ${rank}`}`}
          aria-describedby={isActive ? tooltipId : undefined}
          onMouseEnter={() => onActivate(bundle.id)}
          onMouseLeave={() => onActivate(null)}
          onFocus={() => {
            onRove(bundle.id);
            onActivate(bundle.id);
          }}
          onBlur={() => onActivate(null)}
          onKeyDown={onNavigate}
          onClick={() => onActivate(bundle.id)}
          className="focus-visible:outline-ring absolute inset-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
        />

        {/*
         * ENTSCHEIDUNG: Es bleibt bei EINER Karte am Punkt, und sie traegt
         * genau die vier Angaben, die auch eine Zeile der Liste traegt. Ohne
         * sie waeren sieben der zehn Marken dauerhaft namenlos, und die Marke
         * mit Tastaturfokus zeigte einem sehenden Menschen weniger, als der
         * Screenreader in diesem Moment vorliest. Ein Aufklappen der Marker
         * gehoert NICHT hierher — das ist der erste Blick, nicht die Begruendung.
         */}
        {isActive ? (
          <div
            id={tooltipId}
            role="tooltip"
            className={cn(
              "border-border bg-popover shadow-card pointer-events-none absolute z-30 w-max max-w-56 rounded-lg border px-3 py-2",
              x <= 20
                ? "left-0"
                : x >= 80
                  ? "right-0"
                  : "left-1/2 -translate-x-1/2",
              /* Oben im Feld klappt die Karte nach unten, sonst stuende sie
               * ueber der Kante der Kachel. */
              y <= 25 ? "top-full mt-2" : "bottom-full mb-2",
            )}
          >
            <p className="text-popover-foreground text-xs font-medium">
              {bundle.name}
            </p>
            <p className="text-muted-foreground text-2xs mt-0.5">{category}</p>
            {/* Die Karte am Punkt ist der Ort, an dem die Datenlage in Worten
             * steht: die Punkte unter den Ringen zeigen eine Stufe, hier wird
             * sie benannt. */}
            <p className="text-popover-foreground text-2xs mt-1">
              <span className="tabular-nums">Score {bundle.score}</span> ·
              Datenlage {toEvidenceLevel(bundle.confidence)}
            </p>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Beschriftung der Ansatzpunkte                                               */
/* ------------------------------------------------------------------------- */

/** Abstand zwischen Marke und Beschriftung, in Pixeln des Feldes. */
const LABEL_GAP = 14;
/** Mindestabstand zweier Beschriftungen auf derselben Seite. */
const LABEL_ROW = 24;
/*
 * Grobe Breitenschaetzung der Beschriftung: Zeichenbreite bei text-2xs plus
 * Nummernscheibe und ihr Abstand. Sie schaetzt absichtlich eher zu GROSS — ein
 * Wort, das links steht, obwohl es rechts knapp gepasst haette, ist ein
 * Schoenheitsfehler; ein Wort, das rechts abgeschnitten wird, ist keiner.
 */
const LABEL_CHAR = 6;
const LABEL_CHROME = 24;

interface FieldSize {
  width: number;
  height: number;
}

interface PlacedLabel extends FocusEntry {
  /** Mitte der Marke, in Pixeln des Feldes. */
  dotX: number;
  dotY: number;
  /** Hoehe der Beschriftung — gleich dotY, solange sie nicht ausweichen muss. */
  y: number;
  side: "left" | "right";
  displaced: boolean;
}

/*
 * Die drei Nummern stehen DAUERHAFT im Feld, und dauerhaft heisst: sie duerfen
 * einander nicht ueberdecken und nicht am Rand abgeschnitten werden. Die
 * Platzierung geht deshalb in PIXELN, nicht in Prozent — in Prozent kennt man
 * die Breite eines Wortes nicht.
 *
 * Regel: rechts von der Marke, ausser es passt dort nicht mehr; dann links.
 * Liegen zwei Beschriftungen derselben Seite zu dicht uebereinander, weicht die
 * untere nach unten aus, und wenn dabei das Feldende erreicht ist, schiebt der
 * Rueckwaertsgang die Gruppe wieder nach oben. Jede verschobene Beschriftung
 * bekommt eine duenne Fuehrungslinie zurueck zu ihrem Punkt — sonst zeigte sie
 * auf einen Punkt, neben dem sie gar nicht steht.
 */
function toPlacedLabels(
  focus: readonly FocusEntry[],
  field: FieldSize,
  toY: (score: number) => number,
): PlacedLabel[] {
  if (field.width === 0 || field.height === 0) {
    return [];
  }

  const placed: PlacedLabel[] = focus.map((entry) => {
    const dotX = (toX(entry.bundle.confidence) / 100) * field.width;
    const dotY = (toY(entry.bundle.score) / 100) * field.height;
    const width = LABEL_CHROME + entry.bundle.name.length * LABEL_CHAR;
    const roomRight = field.width - dotX - LABEL_GAP;
    const roomLeft = dotX - LABEL_GAP;

    return {
      ...entry,
      dotX,
      dotY,
      y: dotY,
      side:
        width <= roomRight || roomRight >= roomLeft
          ? ("right" as const)
          : ("left" as const),
      displaced: false,
    };
  });

  const edge = LABEL_ROW / 2;

  for (const side of ["left", "right"] as const) {
    const group = placed
      .filter((label) => label.side === side)
      .sort((left, right) => left.y - right.y);

    let ceiling = edge;
    for (const label of group) {
      label.y = Math.max(label.y, ceiling);
      ceiling = label.y + LABEL_ROW;
    }

    let floor = field.height - edge;
    for (const label of [...group].reverse()) {
      label.y = Math.min(label.y, floor);
      floor = label.y - LABEL_ROW;
    }

    for (const label of group) {
      label.y = Math.max(label.y, edge);
      label.displaced = Math.abs(label.y - label.dotY) > 1;
    }
  }

  return placed;
}

/* ------------------------------------------------------------------------- */
/* Feld                                                                        */
/* ------------------------------------------------------------------------- */

export interface BundleMapProps {
  bundles: readonly Bundle[];
  /**
   * Die Ansatzpunkte mit ihrer Nummer. Das Feld waehlt sie NICHT selbst aus —
   * es bekommt dieselbe Liste wie die Rangfolge daneben.
   */
  focus: readonly FocusEntry[];
  /** Hervorgehobenes Buendel, gesteuert von aussen: Feld und Liste teilen es. */
  activeId: string | null;
  onActivate: (id: string | null) => void;
  className?: string;
}

export function BundleMap({
  bundles,
  focus,
  activeId,
  onActivate,
  className,
}: BundleMapProps) {
  const motionPreset = useMotionPreset();
  const fieldRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef(new Map<string, HTMLButtonElement>());
  const [field, setField] = useState<FieldSize>({ width: 0, height: 0 });
  const [rovingId, setRovingId] = useState<string | null>(null);

  /*
   * Die Beschriftungen brauchen echte Pixel: ob ein Wort noch ins Feld passt,
   * laesst sich in Prozent nicht beantworten. Die Marken bleiben in Prozent —
   * nur die Platzierung rechnet gemessen.
   */
  useEffect(() => {
    const node = fieldRef.current;
    if (!node) {
      return;
    }

    /* Einmal SOFORT messen. Der Beobachter allein liefert seinen ersten Wert
     * erst mit dem naechsten Frame, und bis dahin stuende das Feld ohne die
     * drei Namen da — die Namen sind Inhalt, kein Nachtrag. */
    const first = node.getBoundingClientRect();
    setField({ width: first.width, height: first.height });

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) {
        setField({ width: box.width, height: box.height });
      }
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const scoreScale = toScoreScale(bundles);
  const toY = (score: number) => scoreScale(score);

  const rankById = new Map(focus.map((entry) => [entry.bundle.id, entry.rank]));
  const placedLabels = toPlacedLabels(focus, field, toY);

  /* Tastaturreihenfolge = Leserichtung des Feldes: erst Datenlage, dann Score. */
  const navOrder = bundles
    .toSorted(
      (left, right) =>
        left.confidence - right.confidence || left.score - right.score,
    )
    .map((bundle) => bundle.id);
  const rovingActive =
    rovingId && navOrder.includes(rovingId) ? rovingId : (navOrder[0] ?? null);

  function moveRoving(event: KeyboardEvent<Element>, target: number) {
    const nextId = navOrder[Math.min(navOrder.length - 1, Math.max(0, target))];
    if (!nextId) {
      return;
    }
    event.preventDefault();
    setRovingId(nextId);
    markRefs.current.get(nextId)?.focus();
  }

  function onMarkKeyDown(event: KeyboardEvent<Element>) {
    const current = rovingActive ? navOrder.indexOf(rovingActive) : 0;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        moveRoving(event, current + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        moveRoving(event, current - 1);
        break;
      case "Home":
        moveRoving(event, 0);
        break;
      case "End":
        moveRoving(event, navOrder.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex gap-2">
        {/* Die senkrechte Richtung, als Wort. Keine Zahl, kein Strich: die
         * Flaeche zeigt Lage, und "hoch" oder "niedrig" ist alles, was eine
         * Lage braucht. */}
        <div
          aria-hidden="true"
          className="text-muted-foreground text-3xs flex w-4 shrink-0 flex-col items-center justify-between py-2 tracking-wider uppercase"
        >
          <span className="text-vertical">hoch</span>
          <span className="text-vertical">Score niedrig</span>
        </div>

        {/*
         * Ein Griff fuer die Tastatur: die Marken sind EINE Gruppe, in die man
         * einmal hineintabbt und in der die Pfeiltasten weiterfuehren. Zehn
         * einzelne Tab-Stopps mitten in der Seite waeren eine Sackgasse.
         */}
        <div
          ref={fieldRef}
          role="group"
          aria-label="Befunde nach Datenlage und Score. Mit den Pfeiltasten zwischen den Befunden wechseln."
          className="bg-map-field relative h-80 flex-1 rounded-xl"
        >
          {/* Der Anker. Er steht ab dem ersten Frame — er ist die Flaeche und
           * nicht ihr Inhalt. Beschriftet wird er NIE, siehe oben. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
          >
            <line
              x1={ANCHOR}
              x2={ANCHOR}
              y1={0}
              y2={100}
              vectorEffect="non-scaling-stroke"
              className="stroke-map-anchor"
            />
            <line
              x1={0}
              x2={100}
              y1={ANCHOR}
              y2={ANCHOR}
              vectorEffect="non-scaling-stroke"
              className="stroke-map-anchor"
            />
          </svg>

          {/*
           * DER SCAN. Ein Band laeuft einmal von links nach rechts und legt
           * dabei jede Marke frei, an der es vorbeikommt — das Feld fuellt sich
           * wie eine Messung, die einlaeuft, statt als fertiges Bild
           * dazustehen. Bei reduzierter Bewegung entfaellt das Band ganz; die
           * Marken stehen dann sofort da (die Verzoegerungen in scanIn sind
           * dann null).
           *
           * Nur DIESE Ebene schneidet ab, nicht das ganze Feld: der Schein
           * einer Marke am Rand darf ueberstehen, und die Karte am Punkt muss
           * es sogar. Das Band ist ein Drittel breit, x rechnet in seiner
           * eigenen Breite — von -50 % bis 250 % laeuft seine MITTE damit genau
           * von der linken bis zur rechten Feldkante, und das ist die Strecke,
           * auf die sich die Verzoegerungen in scanIn beziehen.
           */}
          {motionPreset.reduced ? null : (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl"
            >
              <motion.div
                initial={{ x: "-50%" }}
                animate={{ x: "250%" }}
                transition={motionPreset.scan}
                className="map-scan absolute inset-y-0 left-0 w-1/3"
              />
            </div>
          )}

          {/* Fuehrungslinien nur fuer ausgewichene Beschriftungen. */}
          {placedLabels.some((label) => label.displaced) ? (
            <svg
              aria-hidden="true"
              width={field.width}
              height={field.height}
              className="pointer-events-none absolute inset-0 z-10"
            >
              {placedLabels
                .filter((label) => label.displaced)
                .map((label) => {
                  const direction = label.side === "right" ? 1 : -1;
                  return (
                    <line
                      key={label.bundle.id}
                      x1={label.dotX + direction * 6}
                      y1={label.dotY}
                      x2={label.dotX + direction * LABEL_GAP}
                      y2={label.y}
                      className="stroke-map-anchor"
                    />
                  );
                })}
            </svg>
          ) : null}

          {bundles.map((bundle) => (
            <BundleMark
              key={bundle.id}
              bundle={bundle}
              rank={rankById.get(bundle.id)}
              x={toX(bundle.confidence)}
              y={toY(bundle.score)}
              isActive={activeId === bundle.id}
              isDimmed={activeId !== null && activeId !== bundle.id}
              isRoving={rovingActive === bundle.id}
              onActivate={onActivate}
              onRove={setRovingId}
              onNavigate={onMarkKeyDown}
              registerMark={(id, node) => {
                if (node) {
                  markRefs.current.set(id, node);
                } else {
                  markRefs.current.delete(id);
                }
              }}
            />
          ))}

          {/* Die Nummern sind fuer das AUGE — der Screenreader hoert sie schon
           * im Namen der Marke und in der Rangfolge daneben. */}
          {placedLabels.map((label) => (
            <motion.div
              key={label.bundle.id}
              aria-hidden="true"
              variants={motionPreset.scanIn}
              custom={label.dotX / Math.max(field.width, 1)}
              className="pointer-events-none absolute z-30 -translate-y-1/2"
              style={
                label.side === "right"
                  ? { left: label.dotX + LABEL_GAP, top: label.y }
                  : {
                      right: field.width - label.dotX + LABEL_GAP,
                      top: label.y,
                    }
              }
            >
              <motion.span
                animate={{
                  opacity:
                    activeId !== null && activeId !== label.bundle.id
                      ? MARK_DIMMED
                      : 1,
                }}
                transition={motionPreset.hover}
                className={cn(
                  "flex w-max items-center gap-1.5",
                  /* Die Nummer bleibt immer am Punkt: rechts der Marke steht
                   * sie vor dem Namen, links dahinter. */
                  label.side === "left" && "flex-row-reverse",
                )}
              >
                <span className="bg-brand text-on-brand text-3xs grid size-4 shrink-0 place-items-center rounded-full font-semibold tabular-nums">
                  {label.rank}
                </span>
                <span className="text-foreground text-2xs font-medium">
                  {label.bundle.name}
                </span>
              </motion.span>
            </motion.div>
          ))}
        </div>
      </div>

      {/*
       * Die waagerechte Richtung, an ihren beiden Enden — und in denselben
       * Worten, die auch die Karte am Punkt und die Tabelle benutzen
       * (toEvidenceLevel). Drei Stellen, EIN Wortschatz.
       *
       * Dass die Score-Richtung ein Ausschnitt ist, steht nicht mehr als
       * eigener Absatz darunter, sondern im Erklaersatz der Kachel
       * ("verglichen werden sie nur untereinander"). Die Kachel erklaert sich
       * einmal, nicht dreimal.
       */}
      <div
        aria-hidden="true"
        className="text-muted-foreground text-3xs mt-2 flex justify-between pl-6 tracking-wider uppercase"
      >
        <span>Datenlage gering</span>
        <span>gut</span>
      </div>
    </div>
  );
}
