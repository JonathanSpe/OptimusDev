"use client";

import { scaleLinear, scalePoint } from "d3-scale";
import { area, line } from "d3-shape";
import { motion } from "motion/react";
import { useEffect, useId, useRef, useState, type RefObject } from "react";

import { PanelExplainer } from "@/components/common/panel-explainer";
import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  toCategoryMovements,
  toChangeReading,
  toTopChanges,
  type CategoryMovement,
  type ChangeVerdict,
} from "../rules";
import {
  SCORE_MAX,
  categoryIdByMarker,
  type CategorySeries,
  type MarkerChange,
  type ScoreSummary,
} from "../sample-data";
import { ScoreDelta, toDeltaText } from "./score-delta";

/*
 * ============================================================================
 * DIE ENTWICKLUNG — ein Feld, fünf Linien, drei Namen.
 * ============================================================================
 * Diese Kachel ersetzt zwei: den Verlauf (fuenf gleichberechtigte Linien) und
 * die Aufschluesselung (dreizehn Marker-Zeilen). Beide beantworteten dieselbe
 * Frage — "was hat sich veraendert?" — und beide antworteten mit einer Liste.
 * Zwei Listen nebeneinander sind aber keine Antwort, sondern eine Aufgabe: der
 * Leser muss selbst herausfinden, was davon zaehlt.
 *
 * Hier steht die Antwort ZWEIMAL, in zwei Auflösungen, und beide stehen offen
 * da:
 *
 *   DAS FELD     wohin es ging. Jede Linie ist ein Bereich, ihre Beschriftung
 *                steht an ihrem ENDE — dort, wo sie aufhoert, und nicht in einer
 *                Legende, die man erst zuordnen muss.
 *   DIE LISTE    was es getragen hat. Die drei groessten Marker-Bewegungen mit
 *                Werten, Einheit und Urteil.
 *
 * WAS HIER NICHT MEHR STEHT, IST DIE ZAHL. Der Gesamtscore stand als 71 am Kopf
 * dieser Kachel — und zugleich in 72px auf der dunklen Kachel derselben Seite.
 * Dieselbe Zahl zweimal auf einem Bildschirm ist keine Betonung, sondern die
 * Frage, ob es zwei Zahlen sind.
 *
 * ES GIBT AUCH KEINE CHIPS MEHR. Sie waren ein Umweg: man hielt einen Chip, um
 * eine Linie vortreten zu sehen, und klickte ihn, um Marker aufzuklappen. Die
 * Beschriftung am Linienende macht den ersten Schritt unnoetig, die Liste
 * darunter den zweiten — und beides steht jetzt da, ohne dass jemand danach
 * greifen muss.
 *
 * DIE MARKE TRITT GENAU EINMAL AUF: als die eine Linie des Gesamtscores. Sie
 * ist damit kein Schmuck, sondern die Antwort auf die Frage, die das Feld
 * stellt. Jede zweite rote Linie wuerde diese Aussage halbieren.
 */

/*
 * DIE ERKLAERUNG DER KACHEL — hinter dem ⓘ am Kopf, einmal im Code.
 *
 * Sie muss die eine Notation in Worte fassen, die man sonst nicht erraten kann:
 * dass eine BLASSE Linie eine Bewegung im Rauschband ist. Ohne diesen Satz waere
 * der Blassgrad eine Farbe mit Bedeutung und sonst nichts — genau das, was
 * Farbe nie sein darf.
 */
const PROGRESSION_EXPLAINER =
  "Jede Linie ist ein Bereich, die rote der Gesamtscore. Blass gezeichnet sind Bereiche, deren Bewegung im Rauschband liegt: dort ist der Unterschied kleiner als die Streuung zwischen zwei Tests, also noch kein Trend.";

/* ------------------------------------------------------------------------- */
/* Formate                                                                     */
/* ------------------------------------------------------------------------- */

const markerFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

/* Dieselbe Rundung wie die Delta-Pille auf dem Dashboard. */
const percentFormat = new Intl.NumberFormat("de-DE", {
  style: "percent",
  signDisplay: "exceptZero",
  maximumFractionDigits: 0,
});

/** Dimensionslose Marker bekommen keine Einheit angehaengt. */
function withUnit(value: number, unit: string): string {
  const text = markerFormat.format(value);
  return unit ? `${text} ${unit}` : text;
}

/** "2026-05-26" wird zu "26.05." — ohne Date-Objekt, also ohne Zeitzone. */
function toShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return month && day ? `${day}.${month}.` : isoDate;
}

function toLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}

/**
 * Aufzaehlung in deutschem Satzbau: "A", "A und B", "A, B und C". Ein Komma vor
 * dem letzten Eintrag waere hier ein Aufzaehlungszeichen, kein Satz.
 */
function toGermanList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} und ${parts.at(-1)}`;
}

/** Wort und Ton der Marker-Bewegung. Ohne hinterlegte Richtung: kein Urteil. */
const VERDICT_TONE: Readonly<
  Record<ChangeVerdict, { tone: string; label: string }>
> = {
  guenstig: { tone: "text-success", label: "günstig" },
  unguenstig: { tone: "text-warning", label: "ungünstig" },
  unbewertet: { tone: "text-muted-foreground", label: "ohne Urteil" },
  unveraendert: { tone: "text-muted-foreground", label: "unverändert" },
};

/* ------------------------------------------------------------------------- */
/* Geometrie                                                                   */
/* ------------------------------------------------------------------------- */

/**
 * Luft ueber und unter der Spanne aller gezeichneten Werte, als Anteil dieser
 * Spanne. Ohne sie liefen die aeussersten Linien auf den Feldkanten.
 */
const FIELD_PADDING = 0.12;

/** Hoehe des Feldes in Pixeln. */
const FIELD_HEIGHT = 224;

/**
 * Breite der Beschriftungsspur rechts. Sie ist aus dem INHALT gerechnet:
 * Punkt, der laengste Bereichsname ("Herz-Kreislauf") und ein Delta stehen bei
 * diesem Mass umbruchfrei nebeneinander. Breiter gezogen nimmt sie dem Feld die
 * Breite, in der die Steigungen ueberhaupt sichtbar sind.
 */
const LABEL_WIDTH = 152;

/** Abstand zwischen Feld und Spur. */
const LABEL_GAP = 8;

/**
 * Ab dieser Zeilenbreite steht die Spur NEBEN dem Feld. Darunter waere das Feld
 * schmaler als 200px, und auf 200px sind vier Testtermine keine Kurve mehr,
 * sondern ein Zickzack — dann rutschen die Beschriftungen unter das Feld und
 * bekommen die ganze Breite.
 */
const STACK_BELOW = LABEL_WIDTH + LABEL_GAP + 200;

/**
 * Mindestabstand zweier Beschriftungen am Linienende, in Pixeln — von Mitte zu
 * Mitte. Eine Beschriftung ist 16px hoch (leading-4), 18px liessen also zwei
 * Pixel Luft zwischen zwei Zeilen: rechnerisch kollisionsfrei und trotzdem ein
 * Block. Vier Punkte plus vier Namen plus vier Deltas brauchen eine Fuge, die
 * man als Fuge erkennt.
 */
const END_LABEL_GAP = 24;

/**
 * Halbe Zeilenhoehe. Die Beschriftungen sitzen auf ihrer Mitte
 * (-translate-y-1/2), also ist das der Abstand, den die oberste und die
 * unterste zum Feldrand halten muessen, um nicht angeschnitten zu werden.
 */
const END_LABEL_HALF = 8;

/**
 * Eine gezeichnete Reihe: ihre Werte, ihre Beschriftung und ihr Rang im Feld.
 * Feld und Beschriftungsspur lesen BEIDE aus dieser Liste — eine Linie, die
 * anders eingefaerbt waere als ihr Punkt in der Spur, waere zwei Linien.
 */
interface Trace {
  id: string;
  /** Beschriftung am Linienende. Kurzform, siehe CategoryScore.shortName. */
  label: string;
  /** Punkte gegenueber dem vorherigen Test. */
  delta: number;
  /** true = Bewegung im Rauschband: blasse Linie, graues Delta. */
  quiet: boolean;
  /** true = die tragende Linie (Gesamtscore). Genau EINE traegt das. */
  lead: boolean;
  /** Ein Eintrag je Testtermin; null heisst: an diesem Termin nicht erhoben. */
  values: readonly (number | null)[];
}

interface FieldSize {
  width: number;
  height: number;
}

/**
 * Misst die ZEILE in echten Pixeln — Feld plus Spur. Gerechnet wird NICHT in
 * Prozent: die Zeichenbewegung laeuft ueber stroke-dasharray, und in einem
 * gedehnten Koordinatensystem zerfaellt ein gestrichelter Strich in Stuecke.
 *
 * Gemessen wird die Zeile und nicht das Feld: die Breite des Feldes ist das
 * ERGEBNIS dieser Messung (Zeile minus Spur), und ein Feld, das seine eigene
 * Breite misst, waehrend sie von der Messung abhaengt, schwingt.
 */
function useRowSize(): [RefObject<HTMLDivElement | null>, FieldSize] {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<FieldSize>({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) setSize({ width: box.width, height: box.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

interface EndSlot {
  id: string;
  /** Hoehe des letzten Messpunkts. */
  dataY: number;
  /** Hoehe der Beschriftung — gleich dataY, solange nichts kollidiert. */
  labelY: number;
}

/**
 * Schiebt Beschriftungen auseinander, die uebereinander laegen. Die REIHENFOLGE
 * bleibt die der Messwerte: keine Beschriftung wandert an einer anderen vorbei,
 * sonst stuende sie an der falschen Linie.
 *
 * ZWEI DURCHGAENGE, und der zweite ist der Grund, warum die Spur jetzt haelt.
 * Ein einzelner Durchgang von oben nach unten schiebt jede Kollision nach
 * UNTEN; liegen alle vier Enden dicht beieinander — und genau dann braucht man
 * die Funktion — wandert der ganze Stapel aus dem Feld, und das Zurueckschieben
 * am Stueck presste die oberste Beschriftung wieder gegen ihre Nachbarin.
 *
 * Der Rueckwaertsdurchgang schiebt stattdessen von unten nach oben nach: erst
 * wird jede Beschriftung mindestens END_LABEL_GAP unter ihre Vorgaengerin
 * gelegt, dann jede mindestens so weit ueber ihre Nachfolgerin. Was danach
 * bleibt, ist die dichteste Anordnung, die die Reihenfolge und beide Feldraender
 * respektiert.
 */
function toEndSlots(
  ends: readonly { id: string; y: number }[],
  height: number,
): readonly EndSlot[] {
  const slots: EndSlot[] = ends
    .toSorted((left, right) => left.y - right.y)
    .map((end) => ({ id: end.id, dataY: end.y, labelY: end.y }));

  /* Hin: niemand liegt hoeher als der Feldrand oder zu dicht unter dem
   * Vorgaenger. */
  let floor = END_LABEL_HALF;
  for (const slot of slots) {
    slot.labelY = Math.max(slot.labelY, floor);
    floor = slot.labelY + END_LABEL_GAP;
  }

  /* Zurueck: niemand liegt tiefer als der Feldrand oder zu dicht ueber dem
   * Nachfolger. Diese Richtung darf die erste ueberstimmen — laeuft der Stapel
   * unten an, muss er oben nachgeben. */
  let ceiling = height - END_LABEL_HALF;
  for (let index = slots.length - 1; index >= 0; index -= 1) {
    const slot = slots[index];
    if (!slot) continue;
    slot.labelY = Math.min(slot.labelY, ceiling);
    ceiling = slot.labelY - END_LABEL_GAP;
  }

  return slots;
}

/* ------------------------------------------------------------------------- */
/* Das Feld                                                                    */
/* ------------------------------------------------------------------------- */

interface TrendFieldProps {
  dates: readonly string[];
  /** Alle Reihen; genau eine davon traegt lead. */
  traces: readonly Trace[];
  /** Beschreibung des ganzen Bildes fuer Screenreader. */
  fieldLabel: string;
  /** Reihe, deren Linie gerade vortritt. */
  activeId: string | null;
  onHover: (id: string | null) => void;
}

function TrendField({
  dates,
  traces,
  fieldLabel,
  activeId,
  onHover,
}: TrendFieldProps) {
  const motionPreset = useMotionPreset();
  const [row, rowSize] = useRowSize();
  /*
   * Die Haarlinien warten auf das ENDE der tragenden Linie, nicht auf eine
   * Zahl: so gibt es keine zweite Zeitangabe im Code, und bei reduzierter
   * Bewegung ist die Linie sofort fertig — dann steht alles zusammen da.
   */
  const [leadDrawn, setLeadDrawn] = useState(false);

  const stacked = rowSize.width > 0 && rowSize.width < STACK_BELOW;
  const fieldWidth = Math.max(
    0,
    rowSize.width - (stacked ? 0 : LABEL_WIDTH + LABEL_GAP),
  );
  const isMeasured = fieldWidth > 0;

  const lead = traces.find((trace) => trace.lead);
  const hairlines = traces.filter((trace) => !trace.lead);

  /*
   * EINE Skala fuer alle Linien. Sie umfasst die Spanne der gezeichneten Werte
   * und nicht die volle Score-Skala: das Feld traegt keine Achsenbeschriftung
   * und behauptet damit keine absolute Hoehe — es zeigt Verlaeufe zueinander.
   * Die absoluten Werte stehen am Ring, als Delta und in der Tabelle.
   *
   * ENTSCHEIDUNG: Bekommt das Feld je eine beschriftete y-Achse, muss diese
   * Spanne zurueck auf 0–100. Eine beschriftete, aber zugeschnittene Achse
   * macht aus drei Punkten Unterschied einen halben Bildschirm.
   */
  const values = traces
    .flatMap((trace) => trace.values)
    .filter((value): value is number => value !== null);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const air = (high - low || 1) * FIELD_PADDING;

  const toY = scaleLinear()
    .domain([low - air, high + air])
    .range([FIELD_HEIGHT, 0]);

  /*
   * Die Termine sind eine ORDINALE Achse: zwischen zwei Tests liegt kein halber
   * Test, und ungleiche Abstaende wuerden hier eine Geschwindigkeit behaupten,
   * die der Score nicht hat.
   */
  const toX = scalePoint<string>().domain(dates).range([0, fieldWidth]);
  const positions = dates.map((date) => toX(date) ?? 0);

  /*
   * Gerade Verbindungen, keine Glaettung: eine Spline erfindet zwischen zwei
   * Tests Werte, die niemand gemessen hat.
   */
  const toPath = line<number | null>()
    .defined((value) => value !== null)
    .x((_, index) => positions[index] ?? 0)
    .y((value) => toY(value ?? 0));

  /*
   * Die Flaeche beginnt am HOECHSTEN Punkt der Linie und nicht an der
   * Feldkante: ihr Farbverlauf soll DORT dicht sein, wo er die Linie traegt.
   * Ueber die ganze Feldhoehe gestreckt waere er an der Linie schon fast
   * ausgelaufen. Ihre Koordinaten sind deshalb um denselben Betrag verschoben
   * wie ihr Container.
   */
  const leadValues = lead?.values ?? [];
  const washTop = Math.min(
    ...leadValues.map((value) => (value === null ? FIELD_HEIGHT : toY(value))),
  );
  const toArea = area<number | null>()
    .defined((value) => value !== null)
    .x((_, index) => positions[index] ?? 0)
    .y0(FIELD_HEIGHT - washTop)
    .y1((value) => toY(value ?? 0) - washTop);

  const lastX = positions.at(-1) ?? 0;
  const leadEnd = leadValues.at(-1);
  const endY = leadEnd === null || leadEnd === undefined ? 0 : toY(leadEnd);

  const ends = traces.flatMap((trace) => {
    const value = trace.values.at(-1);
    return value === null || value === undefined
      ? []
      : [{ id: trace.id, y: toY(value) }];
  });
  const slotById = new Map(
    toEndSlots(ends, FIELD_HEIGHT).map((slot) => [slot.id, slot]),
  );

  /*
   * EIN Markup fuer beide Lagen. Was sich zwischen "neben dem Feld" und "unter
   * dem Feld" aendert, ist ausschliesslich die POSITIONIERUNG — nicht der
   * Inhalt und nicht die Reihenfolge. Zwei Zweige mit denselben Zeilen liefen
   * irgendwann auseinander, und dann truege eine Lage eine Angabe, die die
   * andere nicht hat.
   */
  const labels = (
    <ul
      className={cn(
        stacked ? "mt-3 flex flex-wrap gap-x-5 gap-y-1" : "relative shrink-0",
      )}
      style={stacked ? undefined : { width: LABEL_WIDTH, height: FIELD_HEIGHT }}
    >
      {traces.map((trace, position) => {
        const slot = slotById.get(trace.id);
        const isRecessed = activeId !== null && activeId !== trace.id;

        return (
          <motion.li
            key={trace.id}
            variants={motionPreset.fadeIn}
            initial="hidden"
            animate={leadDrawn ? "visible" : "hidden"}
            custom={position}
            onMouseEnter={() => onHover(trace.id)}
            onMouseLeave={() => onHover(null)}
            style={
              stacked || slot === undefined ? undefined : { top: slot.labelY }
            }
            className={cn(
              "text-2xs flex items-center gap-1.5 leading-4 transition-opacity",
              stacked ? null : "absolute left-0 -translate-y-1/2",
              isRecessed && "opacity-55",
            )}
          >
            {/*
             * Der Punkt traegt die Farbe SEINER Linie — er ist die ganze
             * Verbindung zwischen Beschriftung und Kurve.
             *
             * ⚠️ HIER KOMMT KEINE STATUSFARBE HIN, auch nicht, seit das
             * Bereichsfeld darueber eine traegt. Die Farben dort beantworten
             * "wo stehst du"; dieses Feld beantwortet "wohin geht es". Ein
             * bernsteiner Punkt an einer steigenden Linie waere beides
             * gleichzeitig, und die Linie verloere ihre einzige Aussage. Der
             * Akzent bleibt der tragenden Linie vorbehalten, die vier
             * Bereichslinien bleiben Haarlinien — unterschieden durch Staerke
             * und Beschriftung, nicht durch Ton.
             */}
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                trace.lead
                  ? "bg-trend-line"
                  : trace.quiet
                    ? "bg-trend-hairline-muted"
                    : "bg-trend-hairline",
              )}
            />
            {/*
             * Der NAME bleibt neutral, auch der der tragenden Linie. Zwei
             * Gruende, und beide zaehlen: die Marke tritt in diesem Feld genau
             * EINMAL auf, als die Linie selbst — ein zweites Mal als Schrift
             * halbierte diese Aussage. Und im Dunkelmodus haelt der Markenton
             * auf der Karte nur 3,7:1; das genuegt einer Linie (Grafik, 3:1),
             * nicht einer 11px-Schrift (4,5:1). Die Verbindung zur Linie macht
             * der Punkt davor, und der ist Grafik.
             */}
            <span
              className={cn(
                "text-foreground",
                trace.lead && "font-semibold",
                stacked ? null : "min-w-0 truncate",
              )}
            >
              {trace.label}
            </span>
            <ScoreDelta
              delta={trace.delta}
              quiet={trace.quiet}
              className="shrink-0"
            />
          </motion.li>
        );
      })}
    </ul>
  );

  return (
    <div ref={row}>
      <div className="flex items-start" style={{ gap: LABEL_GAP }}>
        {/*
         * Das Feld ist EIN Bild mit einer Beschreibung. Die Einzelteile darin
         * bleiben fuer Screenreader unsichtbar — vorgelesen waeren sie eine
         * Reihe zusammenhangloser Zahlen. Denselben Inhalt tragen die
         * Beschriftungen DANEBEN (echter Text, deshalb ausserhalb dieses Bildes)
         * und die Tabelle unter der Kachel.
         */}
        <div
          role="img"
          aria-label={fieldLabel}
          className="relative shrink-0"
          style={{ width: fieldWidth, height: FIELD_HEIGHT }}
        >
          {isMeasured && lead ? (
            <>
              {/*
               * Die Flaeche unter der Linie. Ihre FORM ist Geometrie und steht
               * deshalb im style-Attribut, ihre FARBE kommt aus trend-wash — im
               * style-Attribut steht hier nie eine Farbe.
               */}
              <motion.div
                aria-hidden="true"
                variants={motionPreset.fadeIn}
                initial="hidden"
                animate={leadDrawn ? "visible" : "hidden"}
                style={{
                  top: `${washTop}px`,
                  height: `${FIELD_HEIGHT - washTop}px`,
                  clipPath: `path('${toArea(lead.values) ?? ""}')`,
                }}
                className="trend-wash pointer-events-none absolute inset-x-0"
              />

              {/* Der Schein sitzt UNTER dem Punkt und macht ihn nicht groesser —
               * Groesse waere hier ein groesserer Wert. */}
              <motion.span
                aria-hidden="true"
                variants={motionPreset.fadeIn}
                initial="hidden"
                animate={leadDrawn ? "visible" : "hidden"}
                style={{ left: `${lastX}px`, top: `${endY}px` }}
                className="trend-glow pointer-events-none absolute size-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
              />

              <svg
                aria-hidden="true"
                width={fieldWidth}
                height={FIELD_HEIGHT}
                className="absolute inset-0 overflow-visible"
              >
                {/*
                 * Die Haarlinien liegen UNTER der tragenden Linie: kreuzen sie
                 * sich, gehoert die Kreuzung der Linie, die die Aussage traegt.
                 */}
                {hairlines.map((trace, position) => {
                  const isActive = activeId === trace.id;
                  const isRecessed = activeId !== null && !isActive;

                  return (
                    <motion.g
                      key={trace.id}
                      variants={motionPreset.fadeIn}
                      initial="hidden"
                      animate={leadDrawn ? "visible" : "hidden"}
                      /* Platz 1 aufwaerts: die tragende Linie ist Platz 0. */
                      custom={position + 1}
                    >
                      <motion.path
                        d={toPath(trace.values) ?? ""}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        /* initial={false}: die Staerke ist ein ZUSTAND und kein
                         * Auftritt — sie steht beim ersten Frame da und wird
                         * erst beim Betonen animiert. Ohne das sucht Motion
                         * einen Ausgangswert im DOM, findet keinen und meldet
                         * "undefined is not an animatable value". */
                        initial={false}
                        animate={{ strokeWidth: isActive ? 1.75 : 1 }}
                        transition={motionPreset.hover}
                        className={cn(
                          "transition-colors",
                          isActive
                            ? "stroke-trend-hairline-active"
                            : isRecessed || trace.quiet
                              ? "stroke-trend-hairline-muted"
                              : "stroke-trend-hairline",
                        )}
                      />
                      <circle
                        cx={lastX}
                        cy={toY(trace.values.at(-1) ?? 0)}
                        r={isActive ? 3 : 2}
                        className={cn(
                          "transition-colors",
                          isActive
                            ? "fill-trend-hairline-active"
                            : isRecessed || trace.quiet
                              ? "fill-trend-hairline-muted"
                              : "fill-trend-hairline",
                        )}
                      />
                    </motion.g>
                  );
                })}

                {/* Die tragende Linie zeichnet sich EINMAL, in der Richtung der
                 * Zeit. Alles Weitere im Feld wartet auf ihr Ende. */}
                <motion.path
                  d={toPath(lead.values) ?? ""}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-trend-line"
                  variants={motionPreset.drawPath}
                  initial="hidden"
                  animate="visible"
                  onAnimationComplete={() => setLeadDrawn(true)}
                />

                <motion.circle
                  cx={lastX}
                  cy={endY}
                  r={4}
                  className="fill-trend-line"
                  variants={motionPreset.fadeIn}
                  initial="hidden"
                  animate={leadDrawn ? "visible" : "hidden"}
                />

                {/*
                 * Griffe fuer die Maus: eine Haarlinie ist einen Pixel breit,
                 * und niemand trifft einen Pixel. Das sind keine
                 * Bedienelemente, sondern grosszuegigere Trefferflaechen fuer
                 * dieselbe Betonung, die auch die Beschriftung daneben ausloest.
                 */}
                {hairlines.map((trace) => (
                  <path
                    key={`griff-${trace.id}`}
                    d={toPath(trace.values) ?? ""}
                    fill="none"
                    strokeWidth={16}
                    pointerEvents="stroke"
                    className="stroke-transparent"
                    onMouseEnter={() => onHover(trace.id)}
                    onMouseLeave={() => onHover(null)}
                  />
                ))}
              </svg>
            </>
          ) : null}
        </div>

        {stacked ? null : labels}
      </div>

      {/* Die Achse steht unter dem FELD und ist genau so breit wie es. */}
      <div
        aria-hidden="true"
        className="relative mt-2 h-4"
        style={{ width: fieldWidth }}
      >
        {dates.map((date, index) => (
          <span
            key={`achse-${date}`}
            className={cn(
              "text-faint text-3xs absolute tabular-nums",
              /* Die aeusseren Beschriftungen stehen buendig statt mittig —
               * zentriert liefen sie aus dem Feld. */
              index === 0
                ? "left-0"
                : index === dates.length - 1
                  ? "right-0"
                  : "-translate-x-1/2",
            )}
            style={
              index === 0 || index === dates.length - 1
                ? undefined
                : {
                    left: `${(index / Math.max(1, dates.length - 1)) * 100}%`,
                  }
            }
          >
            {toShortDate(date)}
          </span>
        ))}
      </div>

      {stacked ? labels : null}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Die groessten Bewegungen                                                    */
/* ------------------------------------------------------------------------- */

interface MovementListProps {
  changes: readonly MarkerChange[];
  /** Fuer den Bereich hinter dem Markernamen. */
  categories: readonly CategorySeries[];
  /** Platz des ERSTEN Eintrags in der Auftrittsreihe der Kachel. */
  index: number;
}

/**
 * Die drei groessten Marker-Bewegungen, mit Werten und Urteil.
 *
 * Sie stand vorher hinter einem Chip-Klick, je Kategorie getrennt. Aufgeklappt
 * zeigte sie alle Marker EINER Kategorie — vollstaendig, aber erst nachdem man
 * geraten hatte, welche Kategorie interessant ist. Offen und ueber alle
 * Kategorien hinweg antwortet dieselbe Liste auf die Frage, die man wirklich
 * hat: was hat sich bewegt?
 */
function MovementList({ changes, categories, index }: MovementListProps) {
  const motionPreset = useMotionPreset();

  return (
    <div className="border-border mt-6 border-t pt-4">
      <h3 className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Grösste Bewegungen
      </h3>
      <ul className="mt-1">
        {changes.map((change, position) => {
          const reading = toChangeReading(change);
          const verdict = VERDICT_TONE[reading.verdict];
          /* Der Bereich steht nur da, wenn er hinterlegt ist: ein geratener
           * Bereich neben einem Markernamen ist schlimmer als keiner. */
          const areaName = categories.find(
            (category) => category.id === categoryIdByMarker(change.id),
          )?.shortName;

          return (
            <motion.li
              key={change.id}
              variants={motionPreset.fadeRise}
              custom={index + position}
              /*
               * IMMER zwei Spalten — Name links, Zahlen rechts. Erst ab 32rem
               * Kachelbreite werden es drei, und dann stehen Messwerte und
               * Urteil nebeneinander auf einer Grundlinie.
               *
               * Warum nicht drei ab null: die Kachel steht in Zeile 2 ueber
               * sechs von zwoelf Spalten, und das sind auf einem 1440er Schirm
               * MIT Kontext-Leiste rund 350px Inhaltsbreite. Dort brauchen
               * 'LDL-Cholesterin Herz-Kreislauf', '102 → 88 mg/dl' und
               * '−14 % günstig' nebeneinander mehr Platz als da ist — also
               * bricht die Zeile, aber nur EINMAL und immer an derselben
               * Stelle. Drei untereinander gestapelte Angaben waeren dreimal so
               * hoch und liessen den Namen mit den Zahlen um die Zeile streiten.
               */
              className="border-border/60 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 border-b py-2 last:border-b-0 @lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
            >
              <span className="min-w-0">
                <span className="text-foreground text-xs font-semibold">
                  {change.name}
                </span>
                {areaName ? (
                  <span className="text-muted-foreground text-2xs ml-2">
                    {areaName}
                  </span>
                ) : null}
              </span>
              <span className="text-muted-foreground text-2xs text-right tabular-nums">
                {withUnit(change.previous, change.unit)}
                <span aria-hidden="true"> → </span>
                <span className="sr-only">auf</span>
                <span className="text-foreground font-medium">
                  {withUnit(change.current, change.unit)}
                </span>
              </span>
              {/*
               * In der zweispaltigen Form steht das Urteil UNTER den Messwerten
               * und rechts an derselben Kante — col-start-2 haelt es aus der
               * Namensspalte heraus. In der dreispaltigen faellt beides weg und
               * es rueckt in seine eigene Spalte.
               */}
              <span
                className={cn(
                  "text-2xs col-start-2 text-right tabular-nums @lg:col-start-3 @lg:justify-self-end",
                  verdict.tone,
                )}
              >
                {reading.verdict === "unveraendert"
                  ? "unverändert"
                  : percentFormat.format(reading.ratio)}
                {/* Das Wort neben dem Prozentwert, sichtbar: bei einem Marker
                 * sagt das VORZEICHEN nichts ueber gut oder schlecht — minus 14
                 * Prozent LDL ist die Erholung, plus 14 Prozent hs-CRP das
                 * Problem. Ohne das Wort waere die Farbe hier das einzige
                 * Signal. */}
                {reading.verdict === "unveraendert" ? null : (
                  <span className="text-3xs ml-1.5">{verdict.label}</span>
                )}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Tabelle                                                                     */
/* ------------------------------------------------------------------------- */

export interface ProgressionTableProps {
  score: ScoreSummary;
  /** Alle Kategorien mit ihrer Bewegung — auch die im Rauschband. */
  movements: readonly CategoryMovement[];
  categories: readonly CategorySeries[];
  className?: string;
}

/**
 * Dieselben Werte in Zeilen — und zwar ALLE. Sie steht UNTER der Kachel und
 * nicht in ihr: ein Umschalter dort machte aus der Entwicklung eine
 * Ansichtsoption. Draussen ist sie das, was sie sein soll — der vollstaendige,
 * lineare Weg zu denselben Zahlen.
 */
export function ProgressionTable({
  score,
  movements,
  categories,
  className,
}: ProgressionTableProps) {
  const dates = score.history.map((point) => point.date);
  const totalValues = score.history.map((point) => point.value);

  const valuesAt = (id: string): readonly (number | null)[] => {
    const history = categories.find((entry) => entry.id === id)?.history ?? [];
    return dates.map(
      (date) => history.find((point) => point.date === date)?.value ?? null,
    );
  };

  return (
    <details className={cn(className)}>
      <summary className="text-muted-foreground focus-visible:outline-ring text-2xs w-fit cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
        Alle Werte als Tabelle
      </summary>
      <table className="mt-3 w-full text-left">
        <caption className="text-muted-foreground text-2xs sr-only">
          Gesamtscore und Kategorie-Scores je Testtermin, Punkte von 0 bis{" "}
          {SCORE_MAX}, dazu die Veränderung seit dem vorherigen Test.
        </caption>
        <thead>
          <tr className="border-border border-b">
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 font-medium"
            >
              Reihe
            </th>
            {dates.map((date) => (
              <th
                key={`kopf-${date}`}
                scope="col"
                className="text-muted-foreground text-2xs pb-2 text-right font-medium tabular-nums"
              >
                {toLongDate(date)}
              </th>
            ))}
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 text-right font-medium"
            >
              Seit letztem Test
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-border border-b">
            <th
              scope="row"
              className="text-foreground py-2 text-xs font-medium"
            >
              Gesamtscore
            </th>
            {totalValues.map((value, index) => (
              <td
                key={`gesamt-${dates[index]}`}
                className="text-foreground py-2 text-right text-xs font-medium tabular-nums"
              >
                {value}
              </td>
            ))}
            <td className="text-foreground py-2 text-right text-xs tabular-nums">
              {toDeltaText(
                (totalValues.at(-1) ?? 0) - (totalValues.at(-2) ?? 0),
              )}
            </td>
          </tr>

          {movements.map((movement) => (
            <tr key={`zeile-${movement.id}`} className="border-border border-b">
              <th
                scope="row"
                className="text-muted-foreground py-2 text-xs font-medium"
              >
                {movement.name}
              </th>
              {valuesAt(movement.id).map((value, index) => (
                <td
                  key={`zelle-${movement.id}-${dates[index]}`}
                  className="text-muted-foreground py-2 text-right text-xs tabular-nums"
                >
                  {value ?? "nicht erhoben"}
                </td>
              ))}
              <td className="text-muted-foreground py-2 text-right text-xs tabular-nums">
                {toDeltaText(movement.delta)}
                {movement.insideNoise ? (
                  <span className="text-2xs block">im Rauschband</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/* ------------------------------------------------------------------------- */
/* Die Kachel                                                                  */
/* ------------------------------------------------------------------------- */

export interface ProgressionPanelProps {
  /** Der Gesamtverlauf. Seine Termine spannen die Achse auf. */
  score: ScoreSummary;
  categories: readonly CategorySeries[];
  /**
   * Die Marker-Bewegungen, aus denen die Liste unter dem Feld ihre Namen zieht.
   * Ohne sie bleibt die Kachel vollstaendig — sie sagt dann nur nicht, woher
   * eine Bewegung kommt.
   */
  changes?: readonly MarkerChange[];
  /**
   * Platz in der Auftrittsreihe der SEITE. Er verzoegert nur den Auftritt der
   * Kachel; Feld und Liste behalten ihre eigene Reihenfolge.
   */
  index?: number;
  className?: string;
}

/**
 * Der Kopf der Kachel: Titel links, ⓘ rechts. Als eigenes Bauteil, damit der
 * Leerzustand denselben Kopf traegt wie die gefuellte Kachel.
 */
function ProgressionHeading({ id }: { id?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2
        id={id}
        className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase"
      >
        Entwicklung
      </h2>
      <PanelExplainer label="Was die Entwicklung zeigt" className="-mt-1 -mr-1">
        {PROGRESSION_EXPLAINER}
      </PanelExplainer>
    </div>
  );
}

/** Leerzustand: eine Entwicklung entsteht erst zwischen zwei Messungen. */
function EmptyProgression({ className }: { className?: string }) {
  return (
    <section
      aria-label="Entwicklung"
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <ProgressionHeading />
      <p className="text-foreground mt-4 text-sm font-medium">
        Noch keine Entwicklung
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Eine Entwicklung braucht zwei Tests. Nach deinem nächsten Bluttest steht
        hier, wohin sich dein Score bewegt hat — und welche Bereiche ihn bewegt
        haben.
      </p>
    </section>
  );
}

/** Die tragende Linie. Genau eine, und sie gehoert dem Gesamtscore. */
const TOTAL_ID = "gesamt";

export function ProgressionPanel({
  score,
  categories,
  changes = [],
  index = 0,
  className,
}: ProgressionPanelProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();

  /* Fluechtig: Maus. Betont eine Linie, oeffnet nichts. */
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const current = score.history.at(-1);
  const previous = score.history.at(-2);
  if (!current || !previous) {
    return <EmptyProgression className={className} />;
  }

  const dates = score.history.map((point) => point.date);
  const movements = toCategoryMovements(categories);

  /*
   * ALLE vier Bereiche werden gezeichnet, plus der Gesamtscore. Das Rauschband
   * entscheidet nicht mehr, OB eine Linie da ist, sondern WIE LAUT sie ist —
   * siehe den Block dazu in rules.ts.
   */
  const traces: readonly Trace[] = [
    {
      id: TOTAL_ID,
      label: "Gesamt",
      delta: current.value - previous.value,
      quiet: false,
      lead: true,
      values: score.history.map((point) => point.value),
    },
    ...movements.map((movement) => {
      const history =
        categories.find((entry) => entry.id === movement.id)?.history ?? [];
      return {
        id: movement.id,
        label: movement.shortName,
        delta: movement.delta,
        quiet: movement.insideNoise,
        lead: false,
        values: dates.map(
          (date) => history.find((point) => point.date === date)?.value ?? null,
        ),
      };
    }),
  ];

  const topChanges = toTopChanges(changes);

  const fieldLabel = `Entwicklung über ${dates.length} Tests. ${toGermanList(
    traces.map(
      (trace) =>
        `${trace.label} ${toDeltaText(trace.delta)} Punkte auf ${
          trace.values.at(-1) ?? "nicht erhoben"
        }`,
    ),
  )}. Stand ${toLongDate(current.date)}.`;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <motion.section
        variants={motionPreset.fadeRise}
        custom={index}
        initial="hidden"
        animate="visible"
        aria-labelledby={titleId}
        /* Die Kachel ist ihr eigener Container: ob die Liste darunter drei
         * Spalten traegt oder eine, richtet sich nach IHRER Breite. */
        className="surface-card @container rounded-2xl p-6"
      >
        <ProgressionHeading id={titleId} />

        <div className="mt-5">
          <TrendField
            dates={dates}
            traces={traces}
            fieldLabel={fieldLabel}
            activeId={hoveredId}
            onHover={setHoveredId}
          />
        </div>

        {topChanges.length === 0 ? null : (
          <MovementList
            changes={topChanges}
            categories={categories}
            /* Die Kachel ist Element 0, die Beschriftungen laufen mit dem Feld —
             * die Liste folgt ihnen. */
            index={traces.length}
          />
        )}
      </motion.section>

      <ProgressionTable
        score={score}
        movements={movements}
        categories={categories}
      />
    </div>
  );
}
