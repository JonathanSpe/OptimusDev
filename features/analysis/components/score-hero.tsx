"use client";

import NumberFlow from "@number-flow/react";
import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SCORE_MAX, type ScorePoint, type ScoreSummary } from "../sample-data";

/*
 * DER OPTIMUS SCORE — die Kopfzeile der Analyse und die einzige dunkle Flaeche
 * im Produkt. Hier DARF bewertet werden: die Analyse ist genau der Ort, an dem
 * aus Werten eine Aussage wird (auf dem Dashboard waere dieselbe Kachel ein
 * Regelbruch).
 *
 * Die Kachel zeigt vier Dinge und sonst nichts: wo du stehst, wohin es seit dem
 * letzten Test ging, wie der Weg dahin aussah und was den Wert gerade deckelt.
 * Alles Weitere ist Sache der Abschnitte darunter.
 *
 * Einen SOLLWERT kennt sie nicht. Eine Zahl, ab der ein Score gut waere, ist
 * eine klinische Aussage — sie wird gesetzt, nicht geschaetzt. Bis eine
 * freigegeben ist, misst sich der Score an seinem eigenen letzten Stand; das
 * ist derselbe Bezug, den auch die Kategorie-Ringe haben.
 *
 * Sie ist bewusst KOMPAKT. Die dunkle Flaeche ist die lauteste im Produkt —
 * ihre Groesse ist deshalb kein Ausdruck von Wichtigkeit, sondern eine
 * Lautstaerke. Wichtig ist die ZAHL, und die traegt sich selbst: alles andere
 * steht klein daneben, der Verlauf als schmale Kurve rechts statt als breites
 * Band unter dem Score.
 */

export interface ScoreHeroProps {
  score: ScoreSummary;
  /**
   * Platz in der Auftrittsreihe der SEITE. Er verzoegert nur den Auftritt der
   * Kachel; ihre eigene Reihe (Punkte, Fusszeile) bleibt davon unberuehrt —
   * sie ist eine Liste fuer sich.
   */
  index?: number;
  className?: string;
}

/*
 * Die Kurve rechts neben dem Score. Sie hat eine FESTE Groesse und waechst
 * nicht mit der Kachel: eine Randnotiz, die sich ueber die halbe Kachel zieht,
 * ist keine Randnotiz mehr. Gerechnet wird in echten Pixeln statt in einem
 * gedehnten viewBox — verzerrte Koordinaten machen die Strichstaerke
 * ungleichmaessig, aus Punkten Ellipsen, und die Zeichen-Animation
 * (pathLength arbeitet ueber stroke-dasharray) zerfaellt in Striche.
 */
const SPARK_WIDTH = 140;
const SPARK_HEIGHT = 44;
/** Rand, damit die Punkte an den Enden nicht angeschnitten werden. */
const PAD_X = 4;
const PAD_Y = 5;

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
  points: readonly { point: ScorePoint; x: number; y: number }[];
}

/**
 * Geometrie aus den Daten — ohne Diagramm-Bibliothek. Die Skala spannt sich
 * ueber die gemessenen Werte und sonst nichts.
 */
function toGeometry(history: readonly ScorePoint[]): Geometry {
  const values = history.map((entry) => entry.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  /*
   * Nur wenig Luft um die Spanne: auf 44px Hoehe frisst jede Reserve den
   * Ausschlag, und eine Kurve, die kaum steigt, behauptet etwas Falsches. Den
   * Abstand zur Kante haelt schon PAD_Y.
   */
  const span = (max - min || 1) * 0.08;

  const x = scaleLinear()
    .domain([0, Math.max(1, history.length - 1)])
    .range([PAD_X, SPARK_WIDTH - PAD_X]);
  const y = scaleLinear()
    .domain([min - span, max + span])
    .range([SPARK_HEIGHT - PAD_Y, PAD_Y]);

  const path =
    line<ScorePoint>()
      .x((_, index) => x(index))
      .y((entry) => y(entry.value))
      .curve(curveMonotoneX)(history) ?? "";

  return {
    path,
    points: history.map((point, index) => ({
      point,
      x: x(index),
      y: y(point.value),
    })),
  };
}

interface Delta {
  /** Score beim vorherigen Test. */
  from: number;
  /** Score beim aktuellen Test. */
  to: number;
  /** to − from. Das Vorzeichen ist die Richtung. */
  amount: number;
  /** Datum des vorherigen Tests. */
  since: string;
}

/*
 * Die Veraenderung kommt aus den DATEN, nie aus einem zweiten Feld: der letzte
 * Eintrag gegen den vorletzten, und das Datum der Pille ist das des vorletzten
 * Tests. Eine hingeschriebene Zahl oder ein hingeschriebenes Datum laufen
 * irgendwann gegen den Verlauf, den dieselbe Kachel daneben zeichnet.
 */
function toDelta(history: readonly ScorePoint[]): Delta | null {
  const current = history.at(-1);
  const previous = history.at(-2);
  if (!current || !previous) return null;

  return {
    from: previous.value,
    to: current.value,
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
        "bg-score-pill inline-flex shrink-0 items-center gap-1 rounded-full py-0.5 pr-2.5 pl-1.5 text-xs font-medium tabular-nums",
        /*
         * ENTSCHEIDUNG: Nur der Zugewinn wird gruen gefeiert. Ein fallender
         * Score bleibt weiss — er ist eine Beobachtung, kein Alarm, und Rot
         * gehoert an dieser Stelle keinem Befund. Die Richtung traegt ohnehin
         * der Pfeil, die Farbe ist also nie das einzige Signal.
         */
        direction === "up" ? "text-success-on-score" : "text-on-score",
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
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
    /*
     * score-facts ist ein intrinsisches Raster: die Spaltenzahl haengt an der
     * Breite der KACHEL, nicht am Fenster. Drei Angaben nebeneinander, solange
     * jede ihre 7rem bekommt — sonst zwei, sonst eine. Eine feste sm:grid-cols-3
     * waere hier falsch: im Bento kann die Kachel schmal stehen, waehrend das
     * Fenster breit ist.
     */
    <dl className="score-facts border-score-line/30 border-t pt-4">
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
          <dd className="text-on-score mt-1 text-xs font-medium text-balance">
            {fact.value}
          </dd>
        </motion.div>
      ))}
    </dl>
  );
}

interface ScoreTrendProps {
  history: readonly ScorePoint[];
  /** Beschreibung der ganzen Grafik fuer Screenreader. */
  label: string;
}

/**
 * Der Verlauf als FLUESTERN: schmale Kurve, duenner Strich, gedaempfte Farbe.
 * Sie beantwortet eine einzige Frage — ging es aufwaerts? —, und diese Antwort
 * darf die Zahl daneben nicht ueberstimmen.
 *
 * Die Grafik ist EIN Bild mit einer Beschreibung: die Einzelteile darin bleiben
 * fuer Screenreader unsichtbar, sonst liest jemand vier zusammenhanglose Punkte
 * vor.
 */
function ScoreTrend({ history, label }: ScoreTrendProps) {
  const motionPreset = useMotionPreset();
  const geometry = toGeometry(history);

  return (
    <div
      className="relative shrink-0"
      style={{ width: `${SPARK_WIDTH}px`, height: `${SPARK_HEIGHT}px` }}
    >
      <svg
        role="img"
        aria-label={label}
        width={SPARK_WIDTH}
        height={SPARK_HEIGHT}
        className="overflow-visible"
      >
        {/* Nur die Kurve. Eine zweite Linie im Bild waere eine zweite Aussage,
         * und die einzige, die es hier zu machen gibt, macht der Verlauf. */}
        <motion.path
          d={geometry.path}
          fill="none"
          className="stroke-on-score-muted"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={motionPreset.drawPath}
        />
      </svg>

      {geometry.points.map(({ point, x, y }, index) => {
        const isLatest = index === geometry.points.length - 1;
        return (
          <span
            key={point.date}
            aria-hidden="true"
            /* Positionen aus derselben d3-Skala wie der Pfad — im
             * style-Attribut steht Geometrie, nie eine Farbe. Das Verschieben
             * um die halbe Punktgroesse bleibt AUSSEN: motion setzt fuer den
             * Auftritt ein eigenes transform und wuerde es sonst
             * ueberschreiben. */
            style={{ left: `${x}px`, top: `${y}px` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <motion.span
              variants={motionPreset.fadeRise}
              custom={index + 1}
              /* Auch der aktuelle Punkt bleibt klein: er ist das Ende einer
               * Linie, nicht der Messwert. Der steht daneben in 72px. */
              className={cn(
                "block rounded-full",
                isLatest ? "bg-on-score size-1.5" : "bg-on-score-muted size-1",
              )}
            />
          </span>
        );
      })}
    </div>
  );
}

/** Leerzustand: angelegt, aber noch kein Test ausgewertet. */
function EmptyScore({ className }: { className?: string }) {
  return (
    <section
      className={cn("surface-score rounded-panel p-6", className)}
      aria-label="Optimus Score"
    >
      <p className="text-on-score-muted text-2xs font-semibold tracking-wide uppercase">
        Optimus Score
      </p>
      <p className="text-on-score mt-3 text-xl font-semibold">
        Noch kein Score
      </p>
      <p className="text-on-score-muted max-w-measure mt-1.5 text-sm">
        Dein erster Bluttest steht noch aus. Sobald er ausgewertet ist, steht
        hier dein Score samt Verlauf.
      </p>
    </section>
  );
}

export function ScoreHero({ score, index = 0, className }: ScoreHeroProps) {
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

  const facts: Fact[] = [
    {
      /*
       * ENTSCHEIDUNG: Die Fusszeile nennt die beiden WERTE, die Pille oben
       * nennt ihre Differenz. Beide rechnen auf demselben Verlauf, sagen aber
       * Verschiedenes — stuende hier noch einmal "+4 seit 26.05.", waere es
       * dieselbe Aussage zweimal auf derselben Kachel.
       */
      label: "seit letztem Test",
      value: delta
        ? `von ${numberFormat.format(delta.from)} auf ${numberFormat.format(delta.to)} Punkte`
        : "erster Test",
    },
    { label: "schwächster Bereich", value: score.limiter },
    { label: "nächster Test", value: `in ${score.nextTestInDays} Tagen` },
  ];

  const trendLabel = `Verlauf des Scores: ${score.history
    .map((entry) => `${entry.value} am ${toLongDate(entry.date)}`)
    .join(", ")}.`;

  return (
    <motion.section
      variants={motionPreset.fadeRise}
      custom={index}
      initial="hidden"
      animate="visible"
      onAnimationStart={() => setCountedValue(current.value)}
      aria-labelledby="score-hero-titel"
      className={cn(
        /*
         * Die Kachel ist ihr eigener Container: ihre Breitenstufen sind
         * intrinsisch (flex-wrap fuer die Kurve, score-facts fuer die
         * Fusszeile) und brauchen heute keine Query — die Registrierung sorgt
         * dafuer, dass eine kuenftige Stufe an der KACHEL misst und nicht am
         * Fenster.
         */
        "@container",
        /* Kein Rahmen — die Flaeche traegt die Kachel. Siehe surface-score. */
        "surface-score rounded-panel relative overflow-hidden p-5 @sm:p-6",
        /*
         * Zwei Bloecke, oben und unten: die Kachel bekommt ihre Hoehe von der
         * Zeile des Bentos (align-items: stretch) und verteilt den Zuwachs
         * zwischen Score und Fusszeile, statt ihn unten als Loch stehen zu
         * lassen. gap-5 ist der Mindestabstand — mehr wird daraus nur, wenn die
         * Nachbarkachel hoeher ist.
         */
        "flex flex-col justify-between gap-5",
        className,
      )}
    >
      {/*
       * EINE Zeile, zwei Gruppen: links der Wert mit seiner Veraenderung,
       * gleich daneben der Weg dorthin. Die Kurve steht damit NEBEN der Zahl
       * statt unter ihr — nebeneinander ist sie eine Fussnote, darunter waere
       * sie eine zweite Aussage in voller Breite.
       *
       * KEIN justify-between: die Kurve gehoert zur Zahl, nicht zum Rand. An
       * die Kachelkante geheftet wandert sie mit jeder Breitenaenderung davon
       * und laesst in der Mitte ein Loch stehen. Sie sitzt deshalb mit festem
       * Abstand hinter der Pille; bleibt in einer schmalen Kachel zu wenig
       * Platz, rutscht sie als Ganzes in die naechste Zeile.
       */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h2
            id="score-hero-titel"
            className="text-on-score-muted text-2xs font-semibold tracking-wide uppercase"
          >
            Optimus Score
          </h2>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
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
        </div>

        <ScoreTrend history={score.history} label={trendLabel} />
      </div>

      <FactRow facts={facts} />
    </motion.section>
  );
}
