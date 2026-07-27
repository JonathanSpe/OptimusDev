"use client";

import NumberFlow from "@number-flow/react";
import { scaleLinear, scalePoint } from "d3-scale";
import { area, line } from "d3-shape";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type RefObject } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  toChangeReading,
  toCategoryMovements,
  type CategoryMovement,
  type ChangeVerdict,
} from "../rules";
import {
  SCORE_MAX,
  toCategoryEvidence,
  type CategorySeries,
  type MarkerChange,
  type ScoreSummary,
} from "../sample-data";

/*
 * ============================================================================
 * DIE ENTWICKLUNG — eine Kachel, eine Aussage, drei Tiefen.
 * ============================================================================
 * Diese Kachel ersetzt zwei: den Verlauf (fuenf gleichberechtigte Linien) und
 * die Aufschluesselung (dreizehn Marker-Zeilen). Beide beantworteten dieselbe
 * Frage — "was hat sich veraendert?" — und beide antworteten mit einer Liste.
 * Zwei Listen nebeneinander sind aber keine Antwort, sondern eine Aufgabe: der
 * Leser muss selbst herausfinden, was davon zaehlt.
 *
 * Hier steht die Antwort in drei Tiefen, und jede naechste holt man sich
 * bewusst:
 *
 *   ERSTER BLICK   die Zahl, ihre Bewegung, eine Linie. Die Kategorien, die
 *                  sich bewegt haben, liegen als Haarlinien darunter — genug,
 *                  um sie zu finden, zu wenig, um mit der Linie zu streiten.
 *   BERUEHRUNG     ein Chip gehalten: seine Linie tritt vor, die anderen
 *                  zurueck. Nichts oeffnet sich, nichts springt.
 *   KLICK          die Marker hinter der Bewegung. Erst hier stehen Zahlen mit
 *                  Einheiten, und erst hier wird eine Richtung bewertet.
 *
 * WAS NICHT GEZEIGT WIRD, IST TEIL DER AUSSAGE. Eine Kategorie im Rauschband
 * bekommt keine Linie und keinen Chip — sie steht in einem Satz unter der
 * Kachel und in der Tabelle darunter. Sie wird also weder verschwiegen noch zum
 * Trend erklaert, und sie fuellt vor allem nicht das Layout auf: drei Chips
 * sind hier kein Raster, sondern ein Befund.
 *
 * DIE MARKE TRITT GENAU EINMAL AUF: als die eine Linie des Gesamtscores. Sie
 * ist damit kein Schmuck, sondern die Antwort auf die Frage, die das Feld
 * stellt. Jede zweite rote Linie wuerde diese Aussage halbieren.
 */

/* ------------------------------------------------------------------------- */
/* Formate                                                                     */
/* ------------------------------------------------------------------------- */

const markerFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

const deltaFormat = new Intl.NumberFormat("de-DE", {
  signDisplay: "exceptZero",
  maximumFractionDigits: 0,
});

/* Dieselbe Rundung wie die Delta-Pille auf dem Dashboard. */
const percentFormat = new Intl.NumberFormat("de-DE", {
  style: "percent",
  signDisplay: "exceptZero",
  maximumFractionDigits: 0,
});

/**
 * "±0" statt "0": eine Null OHNE Vorzeichen liest sich wie ein fehlender Wert,
 * eine Null MIT Vorzeichen behauptet eine Richtung, die es nicht gab.
 */
function toDeltaText(points: number): string {
  return points === 0 ? "±0" : deltaFormat.format(points);
}

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

/* ------------------------------------------------------------------------- */
/* Bewertung einer Bewegung                                                    */
/* ------------------------------------------------------------------------- */

/*
 * HIER DARF DIE RICHTUNG BEWERTET WERDEN — aber nur bei SCORES. Ein Score ist
 * per Konstruktion so gebaut, dass hoeher besser ist; er hat keine zwei Enden
 * wie ein Laborwert. Genau deshalb gilt diese Zuordnung ausschliesslich fuer
 * Gesamt- und Kategorie-Scores. Fuer die Marker in der Detailflaeche entscheidet
 * weiterhin die am Marker hinterlegte guenstige Richtung (rules.ts) — dort ist
 * ein fallender Wert mal die Erholung und mal das Problem.
 */
type ScoreMove = "gestiegen" | "gefallen" | "unveraendert";

interface MoveLook {
  /** Wort neben Pfeil und Zahl. Die Farbe steht nie allein. */
  label: string;
  /** Textfarbe von Pfeil, Zahl und Wort. */
  tone: string;
  /** Zarte Flaeche der Ziffer am Chip. */
  tint: string;
}

const MOVE_LOOK: Readonly<Record<ScoreMove, MoveLook>> = {
  gestiegen: {
    label: "gestiegen",
    tone: "text-success",
    tint: "bg-success-subtle",
  },
  gefallen: {
    label: "gefallen",
    tone: "text-warning",
    tint: "bg-warning-subtle",
  },
  unveraendert: {
    label: "unverändert",
    tone: "text-muted-foreground",
    tint: "bg-muted",
  },
};

const MOVE_ICON = {
  gestiegen: ArrowUpRight,
  gefallen: ArrowDownRight,
  unveraendert: ArrowRight,
} as const;

function toScoreMove(delta: number): ScoreMove {
  if (delta > 0) return "gestiegen";
  if (delta < 0) return "gefallen";
  return "unveraendert";
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

/** Mindestabstand zweier Ziffern am Linienende, in Pixeln. */
const END_LABEL_GAP = 15;

interface FieldSize {
  width: number;
  height: number;
}

interface PlottedSeries {
  id: string;
  /** Ein Eintrag je Testtermin; null heisst: an diesem Termin nicht erhoben. */
  values: readonly (number | null)[];
}

/**
 * Misst das Feld in echten Pixeln. Gerechnet wird NICHT in Prozent: die
 * Zeichenbewegung laeuft ueber stroke-dasharray, und in einem gedehnten
 * Koordinatensystem zerfaellt ein gestrichelter Strich in Stuecke.
 */
function useFieldSize(): [RefObject<HTMLDivElement | null>, FieldSize] {
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
  /** Hoehe der Ziffer — gleich dataY, solange nichts kollidiert. */
  labelY: number;
}

/**
 * Schiebt Ziffern auseinander, die uebereinander laegen. Die REIHENFOLGE bleibt
 * die der Messwerte: keine Ziffer wandert an einer anderen vorbei, sonst stuende
 * sie an der falschen Linie.
 */
function toEndSlots(
  ends: readonly { id: string; y: number }[],
  height: number,
): readonly EndSlot[] {
  const slots: EndSlot[] = ends
    .toSorted((left, right) => left.y - right.y)
    .map((end) => ({ id: end.id, dataY: end.y, labelY: end.y }));

  for (let index = 1; index < slots.length; index += 1) {
    const current = slots[index];
    const above = slots[index - 1];
    if (!current || !above) continue;
    current.labelY = Math.max(current.labelY, above.labelY + END_LABEL_GAP);
  }

  /* Laeuft die unterste Ziffer aus dem Feld, rutscht der ganze Stapel hoch. */
  const overflow = (slots.at(-1)?.labelY ?? 0) - height;
  if (overflow > 0) {
    for (const slot of slots) {
      slot.labelY = Math.max(0, slot.labelY - overflow);
    }
  }

  return slots;
}

/* ------------------------------------------------------------------------- */
/* Das Feld                                                                    */
/* ------------------------------------------------------------------------- */

interface TrendFieldProps {
  dates: readonly string[];
  total: PlottedSeries;
  /** Die bewegten Kategorien, in der Reihenfolge ihrer Chips. */
  moved: readonly CategoryMovement[];
  movedSeries: readonly PlottedSeries[];
  /** Kategorie, deren Linie gerade vortritt. */
  activeId: string | null;
  onHover: (id: string | null) => void;
}

function TrendField({
  dates,
  total,
  moved,
  movedSeries,
  activeId,
  onHover,
}: TrendFieldProps) {
  const motionPreset = useMotionPreset();
  const [field, fieldSize] = useFieldSize();
  /*
   * Die Haarlinien warten auf das ENDE der tragenden Linie, nicht auf eine
   * Zahl: so gibt es keine zweite Zeitangabe im Code, und bei reduzierter
   * Bewegung ist die Linie sofort fertig — dann steht alles zusammen da.
   */
  const [leadDrawn, setLeadDrawn] = useState(false);

  /*
   * EINE Skala fuer alle Linien. Sie umfasst die Spanne der gezeichneten Werte
   * und nicht die volle Score-Skala: das Feld traegt keine Achsenbeschriftung
   * und behauptet damit keine absolute Hoehe — es zeigt Verlaeufe zueinander.
   * Die absoluten Werte stehen als Zahl, als Delta und in der Tabelle.
   *
   * ENTSCHEIDUNG: Bekommt das Feld je eine beschriftete y-Achse, muss diese
   * Spanne zurueck auf 0–100. Eine beschriftete, aber zugeschnittene Achse
   * macht aus drei Punkten Unterschied einen halben Bildschirm.
   */
  const plotted = [total, ...movedSeries];
  const values = plotted
    .flatMap((series) => series.values)
    .filter((value): value is number => value !== null);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const air = (high - low || 1) * FIELD_PADDING;

  const toY = scaleLinear()
    .domain([low - air, high + air])
    .range([fieldSize.height, 0]);

  /*
   * Die Termine sind eine ORDINALE Achse: zwischen zwei Tests liegt kein halber
   * Test, und ungleiche Abstaende wuerden hier eine Geschwindigkeit behaupten,
   * die der Score nicht hat.
   */
  const toX = scalePoint<string>().domain(dates).range([0, fieldSize.width]);
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
  const washTop = Math.min(
    ...total.values.map((value) =>
      value === null ? fieldSize.height : toY(value),
    ),
  );
  const toArea = area<number | null>()
    .defined((value) => value !== null)
    .x((_, index) => positions[index] ?? 0)
    .y0(fieldSize.height - washTop)
    .y1((value) => toY(value ?? 0) - washTop);

  const lastX = positions.at(-1) ?? 0;
  const totalEnd = total.values.at(-1);
  const endY = totalEnd === null || totalEnd === undefined ? 0 : toY(totalEnd);

  const ends = movedSeries.flatMap((series) => {
    const value = series.values.at(-1);
    return value === null || value === undefined
      ? []
      : [{ id: series.id, y: toY(value) }];
  });
  const slots = toEndSlots(ends, fieldSize.height);
  const rankById = new Map(moved.map((entry, index) => [entry.id, index + 1]));

  const isMeasured = fieldSize.width > 0 && fieldSize.height > 0;

  return (
    <div className="flex gap-1.5">
      <div ref={field} className="relative h-56 flex-1">
        {isMeasured ? (
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
                height: `${fieldSize.height - washTop}px`,
                clipPath: `path('${toArea(total.values) ?? ""}')`,
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
              width={fieldSize.width}
              height={fieldSize.height}
              className="absolute inset-0 overflow-visible"
            >
              {/*
               * Die Haarlinien liegen UNTER der tragenden Linie: kreuzen sie
               * sich, gehoert die Kreuzung der Linie, die die Aussage traegt.
               */}
              {movedSeries.map((series, index) => {
                const isActive = activeId === series.id;
                const isRecessed = activeId !== null && !isActive;

                return (
                  <motion.g
                    key={series.id}
                    variants={motionPreset.fadeIn}
                    initial="hidden"
                    animate={leadDrawn ? "visible" : "hidden"}
                    /* Platz 1 aufwaerts: die tragende Linie ist Platz 0. */
                    custom={index + 1}
                  >
                    <motion.path
                      d={toPath(series.values) ?? ""}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animate={{ strokeWidth: isActive ? 1.75 : 1 }}
                      transition={motionPreset.hover}
                      className={cn(
                        "transition-colors",
                        isActive
                          ? "stroke-trend-hairline-active"
                          : isRecessed
                            ? "stroke-trend-hairline-muted"
                            : "stroke-trend-hairline",
                      )}
                    />
                    <circle
                      cx={lastX}
                      cy={toY(series.values.at(-1) ?? 0)}
                      r={isActive ? 3 : 2}
                      className={cn(
                        "transition-colors",
                        isActive
                          ? "fill-trend-hairline-active"
                          : isRecessed
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
                d={toPath(total.values) ?? ""}
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
               * Griffe fuer die Maus: eine Haarlinie ist einen Pixel breit, und
               * niemand trifft einen Pixel. Der Tastaturweg laeuft ueber die
               * Chips — deshalb sind das hier keine Bedienelemente, sondern
               * grosszuegigere Trefferflaechen fuer dieselbe Bewegung.
               */}
              {movedSeries.map((series) => (
                <path
                  key={`griff-${series.id}`}
                  d={toPath(series.values) ?? ""}
                  fill="none"
                  strokeWidth={16}
                  pointerEvents="stroke"
                  className="stroke-transparent"
                  onMouseEnter={() => onHover(series.id)}
                  onMouseLeave={() => onHover(null)}
                />
              ))}
            </svg>
          </>
        ) : null}
      </div>

      {/*
       * Die Ziffern stehen NEBEN dem Feld, nicht darin: im Feld waeren sie eine
       * weitere Marke auf einer Linie. Dieselbe Ziffer traegt der Chip — sie ist
       * die ganze Verbindung zwischen beiden, und deshalb traegt sie auch
       * dieselbe Statusfarbe.
       */}
      <div aria-hidden="true" className="relative h-56 w-4 shrink-0">
        {slots.map((slot) => {
          const movement = moved.find((entry) => entry.id === slot.id);
          if (!movement) return null;
          const look = MOVE_LOOK[toScoreMove(movement.delta)];

          return (
            <motion.span
              key={`ziffer-${slot.id}`}
              variants={motionPreset.fadeIn}
              initial="hidden"
              animate="visible"
              custom={1}
              style={{ top: `${slot.labelY}px` }}
              className={cn(
                "text-3xs absolute right-0 -translate-y-1/2 font-semibold tabular-nums",
                activeId !== null && activeId !== slot.id
                  ? "text-faint"
                  : look.tone,
                "transition-colors",
              )}
            >
              {rankById.get(slot.id)}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Chips                                                                       */
/* ------------------------------------------------------------------------- */

interface CategoryChipProps {
  movement: CategoryMovement;
  rank: number;
  index: number;
  isEmphasised: boolean;
  isOpen: boolean;
  detailId: string;
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
}

function CategoryChip({
  movement,
  rank,
  index,
  isEmphasised,
  isOpen,
  detailId,
  onHover,
  onToggle,
}: CategoryChipProps) {
  const motionPreset = useMotionPreset();
  const move = toScoreMove(movement.delta);
  const look = MOVE_LOOK[move];
  const Icon = MOVE_ICON[move];

  return (
    <motion.li variants={motionPreset.fadeRise} custom={index}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? detailId : undefined}
        onMouseEnter={() => onHover(movement.id)}
        onMouseLeave={() => onHover(null)}
        /* Der Fokus spiegelt den Hover: wer mit der Tastatur durchgeht, sieht
         * dieselbe Linie vortreten wie mit der Maus. */
        onFocus={() => onHover(movement.id)}
        onBlur={() => onHover(null)}
        onClick={() => onToggle(movement.id)}
        className={cn(
          "focus-visible:outline-ring flex w-full flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          isOpen || isEmphasised
            ? "bg-chip-active border-border"
            : "bg-chip border-transparent",
        )}
      >
        <span className="flex w-full items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "text-3xs grid size-5 shrink-0 place-items-center rounded-full font-semibold tabular-nums",
              look.tint,
              look.tone,
            )}
          >
            {rank}
          </span>
          <span
            className={cn(
              "text-2xs ml-auto inline-flex items-center gap-1 font-medium tabular-nums",
              look.tone,
            )}
          >
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            {toDeltaText(movement.delta)}
            {/* Die Farbe steht nie allein: Pfeil, Vorzeichen und Wort sagen
             * dasselbe. Das Wort nur fuer Screenreader — sichtbar traegt es
             * schon der Pfeil. */}
            <span className="sr-only">Punkte, {look.label}</span>
          </span>
        </span>

        <span className="text-foreground text-sm font-medium text-balance">
          {movement.name}
        </span>
      </button>
    </motion.li>
  );
}

/* ------------------------------------------------------------------------- */
/* Detailflaeche                                                               */
/* ------------------------------------------------------------------------- */

interface EvidenceListProps {
  movement: CategoryMovement;
  evidence: readonly MarkerChange[];
}

function EvidenceList({ movement, evidence }: EvidenceListProps) {
  return (
    <div className="border-border mt-3 border-t pt-3">
      <p className="text-muted-foreground text-2xs">
        Die Marker hinter{" "}
        <span className="text-foreground">{movement.name}</span>
        {movement.previousDate ? (
          <> — seit dem Test vom {toLongDate(movement.previousDate)}</>
        ) : null}
      </p>

      {evidence.length === 0 ? (
        /* Leerzustand mit Grund: "keine Marker" allein liest sich wie "nichts
         * gemessen", gemeint ist "nichts VERGLEICHBAR gemessen". */
        <p className="text-muted-foreground max-w-measure mt-2 text-sm">
          Zu dieser Kategorie gibt es noch keinen Marker mit zwei Messungen —
          die Bewegung des Scores lässt sich hier deshalb nicht aufschlüsseln.
        </p>
      ) : (
        <ul className="mt-1">
          {evidence.map((change) => {
            const reading = toChangeReading(change);
            const verdict = VERDICT_TONE[reading.verdict];

            return (
              <li
                key={change.id}
                className="border-border/60 grid gap-x-4 gap-y-0.5 border-b py-2 last:border-b-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-baseline"
              >
                <span className="text-foreground text-xs font-medium">
                  {change.name}
                </span>
                <span className="text-muted-foreground text-2xs tabular-nums">
                  {withUnit(change.previous, change.unit)}
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only">auf</span>
                  <span className="text-foreground font-medium">
                    {withUnit(change.current, change.unit)}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-2xs tabular-nums sm:justify-self-end",
                    verdict.tone,
                  )}
                >
                  {reading.verdict === "unveraendert"
                    ? "unverändert"
                    : percentFormat.format(reading.ratio)}
                  {reading.verdict === "unveraendert" ? null : (
                    <span className="text-3xs ml-1.5">{verdict.label}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
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
 * Dieselben Werte in Zeilen — und zwar ALLE, auch die der Kategorien im
 * Rauschband. Sie steht UNTER der Kachel und nicht in ihr: ein Umschalter dort
 * machte aus der Entwicklung eine Ansichtsoption. Draussen ist sie das, was sie
 * sein soll — der vollstaendige, lineare Weg zu denselben Zahlen.
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
   * Die Marker-Bewegungen, aus denen die Detailflaeche ihre Belege zieht.
   * Ohne sie bleibt die Kachel vollstaendig — sie sagt dann nur nicht, woher
   * eine Bewegung kommt.
   */
  changes?: readonly MarkerChange[];
  className?: string;
}

/** Leerzustand: eine Entwicklung entsteht erst zwischen zwei Messungen. */
function EmptyProgression({ className }: { className?: string }) {
  return (
    <section
      aria-label="Entwicklung"
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Entwicklung
      </p>
      <p className="text-foreground mt-3 text-sm font-medium">
        Noch keine Entwicklung
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Eine Entwicklung braucht zwei Tests. Nach deinem nächsten Bluttest steht
        hier, wohin sich dein Score bewegt hat — und welche Kategorien ihn
        bewegt haben.
      </p>
    </section>
  );
}

export function ProgressionPanel({
  score,
  categories,
  changes = [],
  className,
}: ProgressionPanelProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();
  const detailId = useId();

  /*
   * Der Score zaehlt hoch, statt einzublenden: eine Zahl, die auftaucht, liest
   * sich als Ladezustand, eine zaehlende als Ergebnis. Der echte Wert steht
   * zusaetzlich als Text da — er haengt nie an einer Animation.
   */
  const [countedValue, setCountedValue] = useState(0);
  /* Fluechtig: Maus oder Fokus. Betont die Linie, oeffnet nichts. */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  /* Gehalten: ein Klick. Haelt die Betonung UND die Detailflaeche. */
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const current = score.history.at(-1);
  const previous = score.history.at(-2);
  if (!current || !previous) {
    return <EmptyProgression className={className} />;
  }

  const dates = score.history.map((point) => point.date);
  const total: PlottedSeries = {
    id: "gesamt",
    values: score.history.map((point) => point.value),
  };

  const movements = toCategoryMovements(categories);
  const moved = movements.filter((movement) => !movement.insideNoise);
  const quiet = movements.filter((movement) => movement.insideNoise);

  const movedSeries: PlottedSeries[] = moved.map((movement) => {
    const history =
      categories.find((entry) => entry.id === movement.id)?.history ?? [];
    return {
      id: movement.id,
      values: dates.map(
        (date) => history.find((point) => point.date === date)?.value ?? null,
      ),
    };
  });

  /* Hover gewinnt gegen Klick: sonst zeigte das Feld eine andere Kategorie als
   * die, ueber der die Maus steht. */
  const emphasisId = hoveredId ?? pinnedId;
  const openMovement = moved.find((movement) => movement.id === pinnedId);

  const delta = current.value - previous.value;
  const move = toScoreMove(delta);
  const look = MOVE_LOOK[move];
  const DeltaIcon = MOVE_ICON[move];

  const fieldLabel = `Entwicklung des Gesamtscores: ${score.history
    .map((point) => `${point.value} am ${toLongDate(point.date)}`)
    .join(", ")}. ${
    moved.length === 0
      ? "Keine Kategorie hat sich aus dem Rauschband bewegt."
      : `Mitgezeichnet sind ${toGermanList(
          moved.map(
            (movement) =>
              `${movement.name} ${toDeltaText(movement.delta)} Punkte`,
          ),
        )}.`
  }`;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <motion.section
        variants={motionPreset.fadeRise}
        initial="hidden"
        animate="visible"
        onAnimationStart={() => setCountedValue(current.value)}
        aria-labelledby={titleId}
        className="surface-card rounded-2xl p-6"
      >
        <h2
          id={titleId}
          className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase"
        >
          Entwicklung
        </h2>

        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-foreground text-metric font-semibold tracking-tight tabular-nums">
            <span aria-hidden="true">
              <NumberFlow
                value={countedValue}
                locales="de-DE"
                willChange
                transformTiming={motionPreset.number}
                spinTiming={motionPreset.number}
                /* Der Wert soll steigen, auch wenn er von 0 kommt. */
                trend={1}
              />
            </span>
            <span className="sr-only">
              {current.value} von {SCORE_MAX} Punkten
            </span>
          </p>

          <p
            className={cn(
              "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
              look.tone,
            )}
          >
            <DeltaIcon aria-hidden="true" className="size-4 shrink-0" />
            {toDeltaText(delta)}
            <span className="sr-only">Punkte, {look.label},</span>
            <span className="text-muted-foreground font-normal">
              seit {toShortDate(previous.date)}
            </span>
          </p>
        </div>

        {/*
         * Das Feld ist EIN Bild mit einer Beschreibung. Die Einzelteile darin
         * bleiben fuer Screenreader unsichtbar — vorgelesen waeren sie eine
         * Reihe zusammenhangloser Zahlen. Denselben Inhalt tragen die Chips und
         * die Tabelle, beide vollstaendig bedienbar.
         */}
        <div role="img" aria-label={fieldLabel} className="mt-6">
          <TrendField
            dates={dates}
            total={total}
            moved={moved}
            movedSeries={movedSeries}
            activeId={emphasisId}
            onHover={setHoveredId}
          />
        </div>

        <div aria-hidden="true" className="mt-2 flex gap-1.5">
          <div className="relative h-4 flex-1">
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
          <div className="w-4 shrink-0" />
        </div>

        {moved.length === 0 ? (
          /*
           * Kein Chip, kein Ersatzraster: wenn keine Kategorie das Band
           * verlassen hat, ist genau DAS der Befund. Ihn mit den drei
           * groessten Ausschlaegen aufzufuellen hiesse, Rauschen zu Trends zu
           * erklaeren.
           */
          <motion.p
            variants={motionPreset.fadeRise}
            custom={1}
            className="text-muted-foreground max-w-measure mt-5 text-sm"
          >
            Keine Kategorie hat sich seit dem letzten Test aus dem Rauschband
            bewegt. Der Gesamtscore steht {toDeltaText(delta)} Punkte gegenüber
            dem letzten Test — aufschlüsseln lässt sich das heute nicht.
          </motion.p>
        ) : (
          <>
            {/*
             * Intrinsisches Raster: die Spaltenzahl haengt an der Breite der
             * KACHEL, nicht am Fenster — im Bento kann sie schmal stehen,
             * waehrend das Fenster breit ist.
             */}
            <ul className="chip-grid mt-5">
              {moved.map((movement, index) => (
                <CategoryChip
                  key={movement.id}
                  movement={movement}
                  rank={index + 1}
                  /* Die Kachel ist Element 0; die Chips folgen ihr. */
                  index={index + 1}
                  isEmphasised={emphasisId === movement.id}
                  isOpen={pinnedId === movement.id}
                  detailId={detailId}
                  onHover={setHoveredId}
                  onToggle={(id) =>
                    setPinnedId((open) => (open === id ? null : id))
                  }
                />
              ))}
            </ul>

            {/*
             * Die Detailflaeche steht UNTER allen Chips und nicht in einem
             * davon: aufgeklappt im Raster verschoebe sie die Nachbarn, und
             * beim Wechsel zwischen zwei Chips sprang das ganze Feld.
             */}
            <AnimatePresence initial={false} mode="wait">
              {openMovement ? (
                <motion.div
                  key={openMovement.id}
                  id={detailId}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={motionPreset.layout}
                  className="overflow-hidden"
                >
                  <EvidenceList
                    movement={openMovement}
                    evidence={toCategoryEvidence(openMovement.id, changes)}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        )}

        {quiet.length > 0 ? (
          /*
           * Der leise Satz. Er nennt die Kategorien im Rauschband MIT ihrem
           * Delta — verschwiegen wird nichts, aber eine Zahl unter der Schwelle
           * bekommt weder Linie noch Chip.
           */
          <motion.p
            variants={motionPreset.fadeRise}
            custom={moved.length + 1}
            className="text-muted-foreground max-w-measure text-2xs mt-4"
          >
            {toGermanList(
              quiet.map(
                (movement) =>
                  `${movement.name} (${toDeltaText(movement.delta)})`,
              ),
            )}{" "}
            {quiet.length === 1 ? "blieb" : "blieben"} im Rauschband — kein
            belastbarer Trend.
          </motion.p>
        ) : null}
      </motion.section>

      <ProgressionTable
        score={score}
        movements={movements}
        categories={categories}
      />
    </div>
  );
}
