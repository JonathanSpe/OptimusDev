"use client";

import { scaleLinear } from "d3-scale";
import { motion } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { CONFIDENCE_SOLID, type FocusEntry } from "../rules";
import {
  CONFIDENCE_MAX,
  SCORE_MAX,
  SCORE_MIN,
  categoryNameById,
  type Bundle,
} from "../sample-data";

/*
 * DAS FELD DER BUENDEL-LANDKARTE — alle Buendel in einem Koordinatenfeld: Score
 * nach oben, Konfidenz nach rechts.
 *
 * Das Feld beantwortet eine Frage, die keine Liste beantworten kann: WO lohnt
 * sich Arbeit? Ein niedriger Wert allein sagt das nicht. Erst zusammen mit der
 * Belastbarkeit der Messung wird daraus eine Entscheidung — und genau diese
 * beiden Groessen sind hier die beiden Achsen. Der Fall, an dem man es sieht,
 * ist 2.1: der niedrigste Score der ganzen Analyse, und trotzdem nichts zu tun,
 * weil er ganz links steht.
 *
 * Das Feld gehoert zur Liste daneben und umgekehrt: dieselben drei Buendel,
 * dieselben Nummern, eine gemeinsame Hervorhebung. Der aktive Zustand liegt
 * deshalb NICHT hier, sondern in der Klammer um beide (bundle-focus.tsx).
 *
 * KEINE FARBKODIERUNG NACH KATEGORIE. Vier gedeckte Farbtoene sind bei normalem
 * Sehen nicht sicher auseinanderzuhalten (schlechtestes Paar ΔE 4) — und was
 * nicht unterscheidbar ist, kodiert nichts, es faerbt nur.
 *
 * ENTSCHEIDUNG (loest die frueher hier notierte Gegenentscheidung ab): Die
 * Kategorie kodiert die FORM. Form ueberlebt Graustufen, Farbsinnstoerungen und
 * jeden Ausdruck; sie ist der einzige Kanal, der neben der Position noch frei
 * ist, ohne dass Groesse (= Hervorhebung) oder Farbe (= Urteil) doppelt belegt
 * werden. Die Nummer im Bezeichner sagt die Kategorie zwar auch, aber nur, wenn
 * man den Schluessel kennt — die Form zeigt sie ohne Rechnen.
 */

/*
 * ENTSCHEIDUNG: Es gibt NUR die senkrechte Trennung, kein Quadrantenraster.
 * Eine Grenze auf der Konfidenz-Achse sagt etwas ueber die DATEN ("ab hier ist
 * die Messung belastbar") — das ist eine Aussage ueber unsere Arbeit, und die
 * duerfen wir treffen. Eine Grenze auf der Score-Achse waere eine Aussage ueber
 * den Menschen ("ab hier ist es schlecht"), und die ist klinisch zu setzen,
 * nicht zu schaetzen. Die Stufe selbst ist ein PLATZHALTER und steht in
 * rules.ts, zusammen mit der Auswahl der Ansatzpunkte.
 */

/** Stufen der Konfidenz-Achse. Sie ist ganzzahlig, nicht stufenlos. */
const CONFIDENCE_STEPS = [1, 2, 3, 4, 5] as const;

/*
 * Beide Achsen rechnen in PROZENT des Zeichenfelds, nicht in Pixeln. Damit
 * folgen die Marken ihrer Spalte, ohne feste Groesse — sie sitzen als HTML
 * ueber dem Raster, kein verzerrter viewBox, keine Ellipsen aus Kreisen.
 *
 * Die Konfidenz-Domaene reicht eine halbe Stufe ueber beide Enden hinaus. So
 * sitzt jede Stufe in der MITTE ihrer Spalte statt am Rand, und die Punkte der
 * Randstufen kleben nicht an der Kante.
 */
const toX = scaleLinear()
  .domain([0.5, CONFIDENCE_MAX + 0.5])
  .range([0, 100])
  .clamp(true);

/** Die Trennung liegt zwischen den Stufen, nicht auf einer. */
const DIVIDER_X = toX(CONFIDENCE_SOLID - 0.5);

/*
 * DIE SCORE-ACHSE IST EIN AUSSCHNITT. Ueber die volle Skala 0–100 draengen sich
 * alle Buendel in die obere Haelfte, und der Unterschied zwischen 58 und 94 —
 * der einzige, um den es hier geht — schrumpft auf ein Drittel des Feldes.
 *
 * ENTSCHEIDUNG (loest die frueher hier notierte Gegenentscheidung ab): Der
 * Ausschnitt ist hier zulaessig, weil in einem Punktfeld die POSITION vergleicht
 * und keine Laenge. Uebertrieben wird ein Ausschnitt dort, wo der Wert als
 * Balkenlaenge oder Kurvensteigung gelesen wird — deshalb behaelt der
 * Verlaufsgraph seine volle Achse und dieses Feld nicht. Bedingung ist, dass der
 * Ausschnitt ANGESCHRIEBEN ist: die Achsenbeschriftung nennt Anfang und Ende und
 * dazu die volle Skala, damit niemand die untere Kante fuer die Null haelt.
 */
const SCORE_PAD_RATIO = 0.08;
const SCORE_SNAP = 5;

function toScoreDomain(bundles: readonly Bundle[]): [number, number] {
  const scores = bundles.map((bundle) => bundle.score);
  const lowest = Math.min(...scores);
  const highest = Math.max(...scores);
  const padding = (highest - lowest || SCORE_SNAP) * SCORE_PAD_RATIO;

  return [
    Math.max(
      SCORE_MIN,
      Math.floor((lowest - padding) / SCORE_SNAP) * SCORE_SNAP,
    ),
    Math.min(
      SCORE_MAX,
      Math.ceil((highest + padding) / SCORE_SNAP) * SCORE_SNAP,
    ),
  ];
}

/* ------------------------------------------------------------------------- */
/* Formen                                                                      */
/* ------------------------------------------------------------------------- */

type MarkShape = "circle" | "square" | "triangle" | "diamond";

/*
 * Die Zuordnung ist DARSTELLUNG, keine Domaenendaten — dieselbe Trennung wie
 * beim Symbol der Marker-Gruppen. Die Reihenfolge folgt den Kategorien K1–K4;
 * unbekannte Kategorien bekommen den Kreis, damit nie eine Marke fehlt.
 */
const SHAPE_BY_CATEGORY: Readonly<Record<string, MarkShape>> = {
  k1: "circle",
  k2: "square",
  k3: "triangle",
  k4: "diamond",
};

function toShape(categoryId: string): MarkShape {
  return SHAPE_BY_CATEGORY[categoryId] ?? "circle";
}

/*
 * Die vier Umrisse sitzen in derselben 12er-Box und sind nach AUGENMASS auf
 * gleiche Wirkung gebracht, nicht auf gleiche Flaeche: Dreieck und Raute wirken
 * bei gleicher Flaeche groesser als Kreis und Quadrat und laufen deshalb knapper.
 */
const SHAPE_PATH: Readonly<Record<MarkShape, ReactNode>> = {
  circle: <circle cx="6" cy="6" r="4.5" />,
  square: <rect x="2" y="2" width="8" height="8" rx="1" />,
  triangle: <path d="M6 1.2 11.3 10.6 0.7 10.6Z" />,
  diamond: <path d="M6 1 11 6 6 11 1 6Z" />,
};

/** Marke und Schluessel zeichnen denselben Umriss — sonst ist er kein Schluessel. */
function ShapeGlyph({
  shape,
  size,
  ringed = false,
}: {
  shape: MarkShape;
  size: number;
  /** Der Ring in Flaechenfarbe hebt die Marke aus dem Feld, ohne sie umzufaerben. */
  ringed?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      width={size}
      height={size}
      className="overflow-visible"
    >
      <g
        className="fill-map-mark stroke-card transition-[stroke-width]"
        strokeWidth={ringed ? 3 : 0}
        paintOrder="stroke"
      >
        {SHAPE_PATH[shape]}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* Beschriftung der Ansatzpunkte                                               */
/* ------------------------------------------------------------------------- */

/** Abstand zwischen Marke und Beschriftung, in Pixeln des Feldes. */
const LABEL_GAP = 12;
/** Mindestabstand zweier Beschriftungen auf derselben Seite. */
const LABEL_ROW = 24;
/** Grobe Breitenschaetzung: Zeichenbreite bei text-2xs plus Nummer und Rahmen. */
const LABEL_CHAR = 5.8;
const LABEL_CHROME = 42;

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
 * Die drei Nummern stehen dauerhaft im Feld, und dauerhaft heisst: sie duerfen
 * einander nicht ueberdecken und nicht am Rand abgeschnitten werden. Die
 * Platzierung geht deshalb in PIXELN, nicht in Prozent — in Prozent kennt man
 * die Breite eines Wortes nicht.
 *
 * Regel: rechts von der Marke, ausser es passt dort nicht mehr; dann links.
 * Liegen zwei Beschriftungen derselben Seite zu dicht uebereinander, weicht die
 * untere nach unten aus, und wenn dabei das Feldende erreicht ist, schiebt der
 * Rueckwaertsgang die Gruppe wieder nach oben. Jede verschobene Beschriftung
 * bekommt eine duenne Fuehrungslinie zurueck zu ihrem Punkt.
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
/* Marke                                                                       */
/* ------------------------------------------------------------------------- */

/** Groesse der Marke und ihres Griffs. Der Griff ist deutlich groesser. */
const MARK_SIZE = 12;
const MARK_STEP = 1.4;
/** Wie weit das uebrige Feld zuruecktritt, solange eine Marke aktiv ist. */
const MARK_DIMMED = 0.32;

interface BundleMarkProps {
  bundle: Bundle;
  rank: number | undefined;
  index: number;
  isActive: boolean;
  isDimmed: boolean;
  /** Nur EIN Punkt liegt in der Tab-Reihenfolge; die Pfeiltasten fuehren weiter. */
  isRoving: boolean;
  onActivate: (id: string | null) => void;
  onRove: (id: string) => void;
  /** Pfeiltasten. Sie haengen an der Schaltflaeche, weil dort der Fokus liegt. */
  onNavigate: (event: KeyboardEvent<Element>) => void;
  onOpenBundle?: (id: string) => void;
  registerMark: (id: string, node: HTMLButtonElement | null) => void;
  toY: (score: number) => number;
}

function BundleMark({
  bundle,
  rank,
  index,
  isActive,
  isDimmed,
  isRoving,
  onActivate,
  onRove,
  onNavigate,
  onOpenBundle,
  registerMark,
  toY,
}: BundleMarkProps) {
  const motionPreset = useMotionPreset();
  const tooltipId = useId();
  const x = toX(bundle.confidence);
  const y = toY(bundle.score);
  const category = categoryNameById(bundle.categoryId);

  return (
    /* Die aktive Marke steigt ueber die Nummern-Schilder: ihr Tooltip liegt in
     * ihrem eigenen Stapel und kaeme sonst hinter einem Schild zu liegen. */
    <div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2",
        isActive && "z-40",
      )}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <motion.div
        variants={motionPreset.fadeRise}
        custom={index}
        className="relative grid size-7 place-items-center"
      >
        {/*
         * TODO(L3-Buendelansicht): oeffnet spaeter das Buendel mit seinen
         * Markern. Bis dahin ist die Schaltflaeche der Griff fuer Tooltip und
         * Tastatur — 28px gegen eine 12px-Marke, damit man sie auch mit dem
         * Daumen trifft.
         */}
        <button
          ref={(node) => {
            registerMark(bundle.id, node);
          }}
          type="button"
          tabIndex={isRoving ? 0 : -1}
          aria-label={`Bündel ${bundle.id}, ${bundle.name}, ${category}, Score ${bundle.score} von ${SCORE_MAX}, Konfidenz ${bundle.confidence} von ${CONFIDENCE_MAX}${
            rank === undefined ? "" : `, Ansatzpunkt ${rank}`
          }`}
          aria-describedby={isActive ? tooltipId : undefined}
          onMouseEnter={() => onActivate(bundle.id)}
          onMouseLeave={() => onActivate(null)}
          onFocus={() => {
            onRove(bundle.id);
            onActivate(bundle.id);
          }}
          onBlur={() => onActivate(null)}
          onKeyDown={onNavigate}
          onClick={() => {
            onActivate(bundle.id);
            onOpenBundle?.(bundle.id);
          }}
          className="focus-visible:outline-ring absolute inset-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
        />

        <motion.span
          aria-hidden="true"
          animate={{
            scale: isActive ? MARK_STEP : 1,
            opacity: isDimmed ? MARK_DIMMED : 1,
          }}
          transition={motionPreset.hover}
          className="pointer-events-none"
        >
          <ShapeGlyph
            shape={toShape(bundle.categoryId)}
            size={MARK_SIZE}
            ringed={isActive}
          />
        </motion.span>

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
              <span className="tabular-nums">{bundle.id}</span> {bundle.name}
            </p>
            <p className="text-muted-foreground text-2xs mt-0.5">{category}</p>
            <p className="text-popover-foreground text-2xs mt-1 tabular-nums">
              Score {bundle.score} · Konfidenz {bundle.confidence} von{" "}
              {CONFIDENCE_MAX}
            </p>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Feld                                                                        */
/* ------------------------------------------------------------------------- */

export interface BundleMapProps {
  bundles: readonly Bundle[];
  /**
   * Die Ansatzpunkte mit ihrer Nummer. Das Feld waehlt sie NICHT selbst aus —
   * es bekommt dieselbe Liste wie die Rangliste daneben.
   */
  focus: readonly FocusEntry[];
  /** Hervorgehobenes Buendel, gesteuert von aussen: Feld und Liste teilen es. */
  activeId: string | null;
  onActivate: (id: string | null) => void;
  onOpenBundle?: (id: string) => void;
  className?: string;
}

export function BundleMap({
  bundles,
  focus,
  activeId,
  onActivate,
  onOpenBundle,
  className,
}: BundleMapProps) {
  const motionPreset = useMotionPreset();
  const fieldRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef(new Map<string, HTMLButtonElement>());
  const [field, setField] = useState<FieldSize>({ width: 0, height: 0 });
  const [rovingId, setRovingId] = useState<string | null>(null);

  /*
   * Die Beschriftungen brauchen echte Pixel: ob ein Wort noch ins Feld passt,
   * laesst sich in Prozent nicht beantworten. Raster und Marken bleiben in
   * Prozent — nur die Platzierung rechnet gemessen.
   */
  useEffect(() => {
    const node = fieldRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) {
        setField({ width: box.width, height: box.height });
      }
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const [scoreLow, scoreHigh] = toScoreDomain(bundles);
  const scoreScale = scaleLinear()
    .domain([scoreLow, scoreHigh])
    .range([100, 0])
    .clamp(true);
  const toY = (score: number) => scoreScale(score);
  const scoreGrid = scoreScale.ticks(5).filter((tick) => tick >= scoreLow);

  const rankById = new Map(focus.map((entry) => [entry.bundle.id, entry.rank]));
  const placedLabels = toPlacedLabels(focus, field, toY);

  /*
   * AUFTRITTSREIHENFOLGE: nach Konfidenz, von links nach rechts. Nicht ein
   * Punkt je Schritt, sondern eine SPALTE je Schritt — das Feld fuellt sich wie
   * eine Messung, die einlaeuft, und bleibt dabei unter dem Stagger-Deckel.
   * Die Ansatzpunkte kommen einen Schritt spaeter, ihre Nummern noch einen
   * danach: die Rangfolge ist das Letzte, was ankommt, und bleibt stehen.
   */
  const confidenceSteps = [
    ...new Set(bundles.map((bundle) => bundle.confidence)),
  ].sort((left, right) => left - right);
  const focusIndex = confidenceSteps.length;
  const labelIndex = confidenceSteps.length + 1;

  /* Tastaturreihenfolge = Leserichtung des Feldes: erst Konfidenz, dann Score. */
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
      {/* Der Ausschnitt steht in der Achsenbeschriftung, nicht im Kleingedruckten:
       * eine beschnittene Achse ohne Ansage ist eine Uebertreibung. */}
      <p className="text-muted-foreground text-2xs">
        Score{" "}
        <span className="tabular-nums">
          {scoreLow}–{scoreHigh}
        </span>{" "}
        (Ausschnitt aus{" "}
        <span className="tabular-nums">
          {SCORE_MIN}–{SCORE_MAX}
        </span>
        )
      </p>

      <div className="mt-1 flex gap-2">
        {/* Achsenbeschriftung ausserhalb des Feldes: im Feld saesse sie unter
         * den Marken und liesse jede Zahl zweimal lesen. */}
        <div aria-hidden="true" className="relative h-96 w-8 shrink-0">
          {scoreGrid.map((score) => (
            <span
              key={score}
              className="text-faint text-3xs absolute right-0 -translate-y-1/2 tabular-nums"
              style={{ top: `${toY(score)}%` }}
            >
              {score}
            </span>
          ))}
        </div>

        {/*
         * Ein Griff fuer die Tastatur: die Marken sind EINE Gruppe, in die man
         * einmal hineintabbt und in der die Pfeiltasten weiterfuehren. Zehn
         * einzelne Tab-Stopps mitten in der Seite waeren eine Sackgasse.
         */}
        <div
          ref={fieldRef}
          role="group"
          aria-label="Bündel im Koordinatenfeld. Mit den Pfeiltasten zwischen den Bündeln wechseln."
          className="relative h-96 flex-1"
        >
          {/*
           * Raster, Achsen und Trennung stehen ab dem ersten Frame. Sie sind das
           * Feld, nicht der Inhalt — ein Koordinatenfeld, das sich erst aufbaut,
           * laesst die Punkte im Nichts landen. preserveAspectRatio="none" dehnt
           * die Linien auf das Feld, non-scaling-stroke haelt sie dabei ueberall
           * gleich duenn.
           */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
          >
            {scoreGrid.map((score) => (
              <line
                key={score}
                x1={0}
                x2={100}
                y1={toY(score)}
                y2={toY(score)}
                vectorEffect="non-scaling-stroke"
                className="stroke-map-grid"
              />
            ))}
            {CONFIDENCE_STEPS.map((step) => (
              <line
                key={step}
                x1={toX(step)}
                x2={toX(step)}
                y1={0}
                y2={100}
                vectorEffect="non-scaling-stroke"
                className="stroke-map-grid"
              />
            ))}
            {/* Viel Luecke statt blasser Farbe: so bleibt jeder Punkt der
             * Linie ueber der 3:1-Schwelle, waehrend die Linie als Ganzes
             * hinter den Marken zurueckbleibt. */}
            <line
              x1={DIVIDER_X}
              x2={DIVIDER_X}
              y1={0}
              y2={100}
              strokeDasharray="1 5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-map-divider"
            />
          </svg>

          {/* Fuehrungslinien nur fuer ausgewichene Beschriftungen. */}
          {placedLabels.some((label) => label.displaced) ? (
            <svg
              aria-hidden="true"
              width={field.width}
              height={field.height}
              className="pointer-events-none absolute inset-0"
            >
              {placedLabels
                .filter((label) => label.displaced)
                .map((label) => {
                  const direction = label.side === "right" ? 1 : -1;
                  return (
                    <line
                      key={label.bundle.id}
                      x1={label.dotX + direction * (MARK_SIZE / 2)}
                      y1={label.dotY}
                      x2={label.dotX + direction * LABEL_GAP}
                      y2={label.y}
                      className="stroke-map-mark"
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
              index={
                rankById.has(bundle.id)
                  ? focusIndex
                  : confidenceSteps.indexOf(bundle.confidence)
              }
              isActive={activeId === bundle.id}
              isDimmed={activeId !== null && activeId !== bundle.id}
              isRoving={rovingActive === bundle.id}
              onActivate={onActivate}
              onRove={setRovingId}
              onNavigate={onMarkKeyDown}
              onOpenBundle={onOpenBundle}
              registerMark={(id, node) => {
                if (node) {
                  markRefs.current.set(id, node);
                } else {
                  markRefs.current.delete(id);
                }
              }}
              toY={toY}
            />
          ))}

          {/* Die Nummern sind fuer das AUGE — der Screenreader hoert sie schon
           * im Namen der Marke und in der Rangliste daneben. */}
          {placedLabels.map((label) => (
            <motion.div
              key={label.bundle.id}
              aria-hidden="true"
              variants={motionPreset.fadeRise}
              custom={labelIndex}
              className="pointer-events-none absolute z-20 -translate-y-1/2"
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
                className="bg-card border-border flex w-max items-center gap-1.5 rounded-full border py-0.5 pr-2 pl-0.5"
              >
                <span className="bg-foreground text-background text-3xs grid size-4 place-items-center rounded-full font-semibold tabular-nums">
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

      <div aria-hidden="true" className="mt-2 flex gap-2">
        <div className="w-8 shrink-0" />
        <div className="relative h-4 flex-1">
          {CONFIDENCE_STEPS.map((step) => (
            <span
              key={step}
              className="text-faint text-3xs absolute -translate-x-1/2 tabular-nums"
              style={{ left: `${toX(step)}%` }}
            >
              {step}
            </span>
          ))}
        </div>
      </div>
      <p
        aria-hidden="true"
        className="text-muted-foreground text-2xs mt-1 text-center"
      >
        Konfidenz
      </p>

      {/*
       * Der Formenschluessel ist reine Sehhilfe: welche Form welche Kategorie
       * meint, muss nur wissen, wer das Feld ansieht. Am Screenreader steht die
       * Kategorie im Namen jeder Marke, deshalb bleibt der Schluessel dort still.
       */}
      <ul
        aria-hidden="true"
        className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-dashed pt-3"
      >
        {[...new Set(bundles.map((bundle) => bundle.categoryId))].map(
          (categoryId) => (
            <li
              key={categoryId}
              className="text-muted-foreground text-3xs flex items-center gap-1.5"
            >
              <ShapeGlyph shape={toShape(categoryId)} size={10} />
              {categoryNameById(categoryId)}
            </li>
          ),
        )}
      </ul>

      <details className="mt-4">
        <summary className="text-muted-foreground focus-visible:outline-ring text-2xs w-fit cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
          Alle Bündel als Tabelle
        </summary>
        <table className="mt-3 w-full text-left">
          <caption className="text-muted-foreground text-2xs sr-only">
            Alle Bündel mit Score, Konfidenz und Rang unter den Ansatzpunkten —
            dieselben Werte wie im Feld.
          </caption>
          <thead>
            <tr className="border-border border-b">
              <th
                scope="col"
                className="text-muted-foreground text-2xs pb-2 font-medium"
              >
                Bündel
              </th>
              <th
                scope="col"
                className="text-muted-foreground text-2xs pb-2 text-right font-medium"
              >
                Score
              </th>
              <th
                scope="col"
                className="text-muted-foreground text-2xs pb-2 text-right font-medium"
              >
                Konfidenz
              </th>
              <th
                scope="col"
                className="text-muted-foreground text-2xs pb-2 text-right font-medium"
              >
                Ansatzpunkt
              </th>
            </tr>
          </thead>
          <tbody>
            {bundles.map((bundle) => (
              <tr key={bundle.id} className="border-border/60 border-b">
                <th
                  scope="row"
                  className="text-foreground py-2 pr-3 text-xs font-normal"
                >
                  <span className="tabular-nums">{bundle.id}</span>{" "}
                  {bundle.name}
                  <span className="text-muted-foreground text-2xs block">
                    {categoryNameById(bundle.categoryId)}
                  </span>
                </th>
                <td className="text-foreground py-2 text-right text-xs tabular-nums">
                  {bundle.score}
                </td>
                <td className="text-foreground py-2 text-right text-xs tabular-nums">
                  {bundle.confidence} von {CONFIDENCE_MAX}
                </td>
                <td className="text-foreground py-2 text-right text-xs tabular-nums">
                  {rankById.get(bundle.id) ?? "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
