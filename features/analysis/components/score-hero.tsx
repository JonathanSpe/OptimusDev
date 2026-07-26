"use client";

import NumberFlow from "@number-flow/react";
import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { ScorePoint, ScoreSummary } from "../sample-data";

/*
 * DER OPTIMUS SCORE — die Kopfzeile der Analyse und die einzige dunkle Flaeche
 * im Produkt. Hier DARF bewertet werden: die Analyse ist genau der Ort, an dem
 * aus Werten eine Aussage wird (auf dem Dashboard waere dieselbe Kachel ein
 * Regelbruch).
 *
 * Die Kachel zeigt vier Dinge und sonst nichts: wo du stehst, wohin es seit dem
 * letzten Test ging, wie der Weg dahin aussah und was den Wert gerade deckelt.
 * Alles Weitere ist Sache der Abschnitte darunter.
 */

export interface ScoreHeroProps {
  score: ScoreSummary;
  className?: string;
}

/** Punkte der Score-Skala. Die Achse ist fest, damit Verlaeufe vergleichbar sind. */
const SCORE_MAX = 100;

/*
 * Das Diagramm rechnet in PIXELN, nicht in einem gedehnten Koordinatenraum.
 * ENTSCHEIDUNG: Die Breite wird gemessen (ResizeObserver), statt ein
 * 100 × 100-viewBox mit preserveAspectRatio="none" ueber die Kachel zu ziehen.
 * Verzerrte Koordinaten kosten mehr, als sie sparen: die Strichstaerke wird
 * ungleichmaessig, Kreise werden zu Ellipsen, und die Zeichen-Animation
 * (pathLength arbeitet ueber stroke-dasharray) zerfaellt in Striche. Mit echten
 * Pixeln stimmt alles ohne Gegenrechnung.
 */
const CHART_HEIGHT = 80;
/** Rand, damit Punkte und Linie nicht an der Kante kleben. */
const PAD_X = 6;
const PAD_Y = 14;

const numberFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

const deltaFormat = new Intl.NumberFormat("de-DE", {
  signDisplay: "exceptZero",
  maximumFractionDigits: 0,
});

/** "2026-05-26" wird zu "26.05." — ohne Date-Objekt, also ohne Zeitzone. */
function toShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return month && day ? `${day}.${month}.` : isoDate;
}

function toLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}

interface Geometry {
  path: string;
  targetY: number;
  points: readonly { point: ScorePoint; x: number; y: number }[];
}

/**
 * Geometrie aus den Daten — ohne Diagramm-Bibliothek. Die Skala umfasst immer
 * auch den Zielwert: eine Ziellinie ausserhalb des Bildes waere kein Ziel.
 */
function toGeometry(
  history: readonly ScorePoint[],
  target: number,
  width: number,
): Geometry {
  const values = [...history.map((entry) => entry.value), target];
  const min = Math.min(...values);
  const max = Math.max(...values);
  /*
   * Nur wenig Luft um die Spanne: bei 80px Hoehe frisst jede Reserve den
   * Ausschlag, und eine Kurve, die kaum steigt, behauptet etwas Falsches. Den
   * Abstand zur Kante haelt schon PAD_Y.
   */
  const span = (max - min || 1) * 0.08;

  const x = scaleLinear()
    .domain([0, Math.max(1, history.length - 1)])
    .range([PAD_X, Math.max(PAD_X, width - PAD_X)]);
  const y = scaleLinear()
    .domain([min - span, max + span])
    .range([CHART_HEIGHT - PAD_Y, PAD_Y]);

  const path =
    line<ScorePoint>()
      .x((_, index) => x(index))
      .y((entry) => y(entry.value))
      .curve(curveMonotoneX)(history) ?? "";

  return {
    path,
    targetY: y(target),
    points: history.map((point, index) => ({
      point,
      x: x(index),
      y: y(point.value),
    })),
  };
}

interface Delta {
  amount: number;
  since: string;
}

function toDelta(history: readonly ScorePoint[]): Delta | null {
  const current = history.at(-1);
  const previous = history.at(-2);
  if (!current || !previous) return null;

  return {
    amount: current.value - previous.value,
    since: previous.date,
  };
}

const DELTA_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
} as const;

function DeltaPill({ delta }: { delta: Delta }) {
  const direction =
    delta.amount > 0 ? "up" : delta.amount < 0 ? "down" : "flat";
  const Icon = DELTA_ICON[direction];

  return (
    <span
      className={cn(
        "bg-score-pill inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pr-3 pl-2 text-sm font-medium tabular-nums",
        /*
         * ENTSCHEIDUNG: Nur der Zugewinn wird gruen gefeiert. Ein fallender
         * Score bleibt weiss — er ist eine Beobachtung, kein Alarm, und Rot
         * gehoert an dieser Stelle keinem Befund. Die Richtung traegt ohnehin
         * der Pfeil, die Farbe ist also nie das einzige Signal.
         */
        direction === "up" ? "text-success-on-score" : "text-on-score",
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {deltaFormat.format(delta.amount)}
      <span className="text-on-score-muted font-normal">
        seit {toShortDate(delta.since)}
      </span>
    </span>
  );
}

interface Fact {
  label: string;
  value: string;
}

function FactRow({ facts }: { facts: readonly Fact[] }) {
  const motionPreset = useMotionPreset();

  return (
    <dl className="border-score-line/35 mt-8 grid gap-4 border-t pt-5 sm:grid-cols-3">
      {facts.map((fact, index) => (
        <motion.div
          key={fact.label}
          variants={motionPreset.fadeRise}
          custom={index + 3}
          className="min-w-0"
        >
          <dt className="text-on-score-muted text-2xs font-semibold tracking-wide uppercase">
            {fact.label}
          </dt>
          {/* Kein truncate: in der schmalen Score-Spalte passt "Regeneration &
           * Hormonbalance" nicht in eine Zeile, und ausgerechnet der Limiter
           * darf nicht abgeschnitten werden. Er bricht lieber um. */}
          <dd className="text-on-score mt-1 text-sm font-medium text-balance">
            {fact.value}
          </dd>
        </motion.div>
      ))}
    </dl>
  );
}

interface ScoreTrendProps {
  history: readonly ScorePoint[];
  target: number;
  /** Beschreibung der ganzen Grafik fuer Screenreader. */
  label: string;
}

/**
 * Verlauf: Linie, Ziellinie, Punkte. Die Grafik ist EIN Bild mit einer
 * Beschreibung — die Einzelteile darin bleiben fuer Screenreader unsichtbar,
 * sonst liest jemand vier zusammenhanglose Punkte vor.
 */
function ScoreTrend({ history, target, label }: ScoreTrendProps) {
  const motionPreset = useMotionPreset();
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;

    /* Die Breite kommt vom Layout, nicht vom Zustand: der Beobachter meldet sie
     * beim ersten Messen und bei jeder Aenderung der Kachelbreite. */
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry?.contentRect.width ?? 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const geometry = width > 0 ? toGeometry(history, target, width) : null;

  return (
    <div
      ref={frame}
      className="relative mt-8"
      style={{ height: `${CHART_HEIGHT}px` }}
    >
      <svg
        role="img"
        aria-label={label}
        width={width}
        height={CHART_HEIGHT}
        className="overflow-visible"
      >
        {geometry ? (
          <>
            {/* Ziellinie: gestrichelt, damit sie nie mit dem Verlauf verwechselt wird. */}
            <line
              x1={0}
              x2={width}
              y1={geometry.targetY}
              y2={geometry.targetY}
              className="stroke-score-line"
              strokeWidth={1}
              strokeDasharray="4 5"
            />
            {/*
             * initial/animate stehen hier und nicht beim Elternteil: die Grafik
             * entsteht erst, wenn die Breite gemessen ist — zu diesem Zeitpunkt
             * hat die Kachel ihre Variante schon gesetzt, und ein Kind, das
             * danach dazukommt, bekommt sie nicht mehr mit.
             */}
            <motion.path
              d={geometry.path}
              fill="none"
              className="stroke-on-score"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={motionPreset.drawPath}
              initial="hidden"
              animate="visible"
            />
          </>
        ) : null}
      </svg>

      {geometry ? (
        <>
          {/*
           * ENTSCHEIDUNG: Die Ziellinie bekommt ihre Zahl daneben. Ohne sie ist
           * eine gestrichelte Linie auf halber Hoehe nur ein Strich — die
           * Fusszeile nennt den Abstand zum Ziel, aber nicht dessen Lage.
           */}
          <span
            aria-hidden="true"
            /* Links, wo der Verlauf am tiefsten liegt — rechts stuende sie dem
             * aktuellen Punkt im Weg. */
            className="text-on-score-muted text-3xs absolute left-0 -translate-y-full pb-1 tracking-wide"
            style={{ top: `${geometry.targetY}px` }}
          >
            Ziel {target}
          </span>

          {geometry.points.map(({ point, x, y }, index) => {
            const isLatest = index === geometry.points.length - 1;
            return (
              <span
                key={point.date}
                aria-hidden="true"
                /* Positionen aus derselben d3-Skala wie der Pfad — im
                 * style-Attribut steht Geometrie, nie eine Farbe. Das Verschieben
                 * um die halbe Punktgroesse bleibt AUSSEN: motion setzt fuer den
                 * Auftritt ein eigenes transform und wuerde es sonst ueberschreiben. */
                style={{ left: `${x}px`, top: `${y}px` }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                <motion.span
                  variants={motionPreset.fadeRise}
                  custom={index + 1}
                  initial="hidden"
                  animate="visible"
                  className={cn(
                    "block rounded-full",
                    isLatest
                      ? "bg-on-score ring-score-pill size-3 ring-2"
                      : "bg-on-score-muted size-1.5",
                  )}
                />
              </span>
            );
          })}
        </>
      ) : null}
    </div>
  );
}

/** Leerzustand: angelegt, aber noch kein Test ausgewertet. */
function EmptyScore({ className }: { className?: string }) {
  return (
    <section
      className={cn("surface-score rounded-panel p-8", className)}
      aria-label="Optimus Score"
    >
      <p className="text-on-score-muted text-2xs font-semibold tracking-wide uppercase">
        Optimus Score
      </p>
      <p className="text-on-score mt-4 text-2xl font-semibold">
        Noch kein Score
      </p>
      <p className="text-on-score-muted max-w-measure mt-2 text-sm">
        Dein erster Bluttest steht noch aus. Sobald er ausgewertet ist, steht
        hier dein Score samt Verlauf.
      </p>
    </section>
  );
}

export function ScoreHero({ score, className }: ScoreHeroProps) {
  const motionPreset = useMotionPreset();

  /*
   * Der Score zaehlt hoch, statt einzublenden: eine Zahl, die aus dem Nichts
   * auftaucht, liest sich als Ladezustand, eine zaehlende als Ergebnis. Losgetreten
   * wird das vom Auftritt der Kachel (onAnimationStart) — Zahl und Flaeche
   * kommen dadurch gemeinsam an. Bei reduzierter Bewegung dauert beides 0
   * Sekunden, die Zahl steht also sofort. Der echte Wert liegt zusaetzlich als
   * Text vor, damit er nie an einer Animation haengt.
   */
  const [countedValue, setCountedValue] = useState(0);

  const current = score.history.at(-1);
  if (!current) {
    return <EmptyScore className={className} />;
  }

  const delta = toDelta(score.history);
  const remaining = score.target - current.value;

  const facts: Fact[] = [
    {
      label: "noch bis Ziel",
      value:
        remaining > 0
          ? `${numberFormat.format(remaining)} Punkte`
          : "Ziel erreicht",
    },
    { label: "begrenzt durch", value: score.limiter },
    { label: "nächster Test", value: `in ${score.nextTestInDays} Tagen` },
  ];

  const trendLabel = `Verlauf des Scores: ${score.history
    .map((entry) => `${entry.value} am ${toLongDate(entry.date)}`)
    .join(", ")}. Ziel ${score.target} Punkte.`;

  return (
    <motion.section
      variants={motionPreset.fadeRise}
      initial="hidden"
      animate="visible"
      onAnimationStart={() => setCountedValue(current.value)}
      aria-labelledby="score-hero-titel"
      /* Kein Rahmen — die Flaeche traegt die Kachel. Siehe surface-score. */
      className={cn(
        "surface-score rounded-panel relative overflow-hidden p-6 sm:p-8",
        className,
      )}
    >
      <h2
        id="score-hero-titel"
        className="text-on-score-muted text-2xs font-semibold tracking-wide uppercase"
      >
        Optimus Score
      </h2>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-3">
        <p className="text-on-score text-score font-semibold tracking-tight tabular-nums">
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
        {delta ? <DeltaPill delta={delta} /> : null}
      </div>

      <ScoreTrend
        history={score.history}
        target={score.target}
        label={trendLabel}
      />

      <FactRow facts={facts} />
    </motion.section>
  );
}
