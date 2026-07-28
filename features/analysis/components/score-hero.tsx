"use client";

import NumberFlow from "@number-flow/react";
import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { PanelExplainer } from "@/components/common/panel-explainer";
import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SCORE_MAX, type ScorePoint, type ScoreSummary } from "../sample-data";
import { toScoreNote } from "./score-verdict";

/*
 * DER OPTIMUS SCORE — die Kopfzeile der Analyse und die einzige dunkle Flaeche
 * im Produkt. Hier DARF bewertet werden: die Analyse ist genau der Ort, an dem
 * aus Werten eine Aussage wird (auf dem Dashboard waere dieselbe Kachel ein
 * Regelbruch).
 *
 * Die Kachel zeigt fuenf Dinge und sonst nichts: wo du stehst, was das heisst,
 * wohin es seit dem letzten Test ging, wie der Weg dahin aussah und was den
 * Wert gerade deckelt. Alles Weitere ist Sache der Abschnitte darunter.
 *
 * ⚠️ EINEN SOLLWERT KENNT SIE INZWISCHEN. Hier stand, eine Zahl, ab der ein
 * Score gut waere, sei klinisch zu setzen und nicht zu schaetzen — deshalb
 * messe sich der Score allein an seinem eigenen letzten Stand. Geschaetzt ist
 * sie jetzt trotzdem: die Grenzen stehen als Platzhalter in rules.ts
 * (SCORE_BAND_GOOD / SCORE_BAND_CRITICAL) und muessen vor dem Release
 * freigegeben sein. Die Kachel liest sie ueber toScoreNote und nirgends sonst.
 *
 * ZWEI FORMEN, EINE KACHEL — und die Kachel entscheidet selbst, welche:
 *
 *   SCHMAL (Container unter 32rem): eine stehende SPALTE. Vorspann, Zahl,
 *   Pille, Kurve, Trennlinie, zwei Angaben — alles untereinander. So steht sie
 *   in Zeile 1 des Snapshots neben dem Bereichsfeld, und ihre Breite ist eine
 *   Spur (size.scoreColumnNarrow), kein Anteil.
 *
 *   BREIT (ab 32rem): eine LIEGENDE, flache Kachel. Zahl und Pille auf einer
 *   Grundlinie, die Kurve daneben, die Angaben in einer Reihe. So steht sie,
 *   wenn das Fenster fuer zwei Spalten nicht reicht und sie ueber dem Feld
 *   liegt — quer ist sie dort flach, und flach heisst: das Feld bleibt sichtbar.
 *
 * Die Stufe ist eine CONTAINER-Query und keine Fenster-Query, und das ist der
 * ganze Grund, warum EIN Bauteil zwei Formen kann: die Kachel weiss nicht, wie
 * breit das Fenster ist, sie weiss nur, wie breit SIE ist. Beide Formen rendern
 * dasselbe Markup in derselben Reihenfolge — es gibt keinen zweiten Zweig, der
 * auseinanderlaufen koennte.
 *
 * Sie ist bewusst KOMPAKT. Die dunkle Flaeche ist die lauteste im Produkt —
 * ihre Groesse ist deshalb kein Ausdruck von Wichtigkeit, sondern eine
 * Lautstaerke. Wichtig ist die ZAHL, und die traegt sich selbst.
 */

/*
 * DIE ERKLAERUNG — hinter dem ⓘ am Kopf, einmal im Code.
 *
 * Sie sagt, WORAUS die Zahl entsteht und WELCHE Skala sie hat. "Verglichen mit
 * deinem letzten Test" stand hier vorher und war eine Verdopplung: den Vergleich
 * macht die Pille darunter sichtbar, und zwar mit Zahl und Datum.
 *
 * Als Zeile unter dem Vorspann kostete sie in der schmalen Spalte zwei Zeilen —
 * genau ueber der Zahl, die die Kachel eigentlich zeigt. Sie erklaerte damit
 * eine 71, die noch niemand gesehen hatte.
 *
 * ⚠️ PLATZHALTER: die 15 Marker sind gesetzt und nicht gerechnet. Sobald die
 * Score-Formel steht, kommt die Zahl aus ihrer Markermenge — eine Kachel, die
 * eine andere Anzahl behauptet als die Auswertung verwendet, ist schlimmer als
 * eine ohne Anzahl.
 */
const SCORE_EXPLAINER =
  "Dein Gesamtwert aus 15 Blutmarkern, von 0 bis 100. Er wiegt den schwächsten Bereich stärker — deshalb liegt er unter dem Mittel deiner vier Bereiche. Die Einordnung darunter nennt die Grenzen, an denen der Wert gemessen wird; sie sind vorläufig und noch nicht medizinisch freigegeben.";

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
 * Die Kurve. Sie hat eine FESTE Groesse in echten Pixeln statt eines gedehnten
 * viewBox: verzerrte Koordinaten machen die Strichstaerke ungleichmaessig, aus
 * Punkten Ellipsen, und die Zeichen-Animation (pathLength arbeitet ueber
 * stroke-dasharray) zerfaellt in Striche.
 *
 * Das Mass ist die STEHENDE Spalte: 212px sind die Breite von
 * size.scoreColumnNarrow minus ihrer Innenabstaende, die Kurve fuellt die Spalte
 * also aus, ohne sie zu sprengen. In der liegenden Form ist dieselbe Kurve eine
 * Randnotiz neben der Zahl — dort hat die Kachel Platz uebrig, hier nicht, und
 * eine Kurve, die sich zwei Groessen leistet, hat zwei Steigungen fuer denselben
 * Verlauf.
 */
const SPARK_WIDTH = 212;
const SPARK_HEIGHT = 48;
/** Rand, damit die Punkte an den Enden nicht angeschnitten werden. */
const PAD_X = 4;
const PAD_Y = 5;

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
   * Nur wenig Luft um die Spanne: auf 48px Hoehe frisst jede Reserve den
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
     * Breite der KACHEL, nicht am Fenster. In der schmalen Spalte reicht der
     * Platz fuer genau eine Spalte, die beiden Angaben stehen dort also
     * untereinander; in der liegenden Form stehen sie nebeneinander. Eine feste
     * Spaltenzahl waere hier falsch — es ist dieselbe Kachel.
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
          {/* Kein truncate: ausgerechnet der schwaechste Bereich darf nicht
           * abgeschnitten werden. Er steht hier mit seinem KURZEN Namen und
           * passt damit auch in der schmalen Spalte in eine Zeile — braucht er
           * doch zwei, bricht er um. */}
          <dd className="text-on-score mt-1 text-xs font-semibold text-balance">
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

/**
 * Der Kopf der Kachel: Vorspann links, ⓘ rechts. Als eigenes Bauteil, damit der
 * Leerzustand denselben Kopf traegt wie die gefuellte Kachel — sonst
 * verschwindet die Erklaerung genau dann, wenn sie am meisten gebraucht wird.
 */
function ScoreHeading({ id }: { id?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2
        id={id}
        /* text-on-score statt -muted: auf der dunklen Flaeche ist der gedaempfte
         * Ton bei dieser Groesse zu leise, um den Titel zu tragen. */
        className="text-on-score panel-title"
      >
        Optimus Score
      </h2>
      {/* surface="score": auf der dunklen Flaeche kommen Farbe und Fokusring aus
       * der on-score-Familie, alles andere waere dort unsichtbar. */}
      <PanelExplainer
        label="Was der Optimus Score zeigt"
        surface="score"
        className="-mt-1 -mr-1"
      >
        {SCORE_EXPLAINER}
      </PanelExplainer>
    </div>
  );
}

/** Leerzustand: angelegt, aber noch kein Test ausgewertet. */
function EmptyScore({ className }: { className?: string }) {
  return (
    <section
      className={cn("surface-score rounded-panel p-5 @sm:p-6", className)}
      aria-label="Optimus Score"
    >
      <ScoreHeading />
      <p className="text-on-score mt-4 text-xl font-semibold">
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

  /*
   * ZWEI Angaben in der Fusszeile, und die frueheren drei sind es mit Absicht
   * nicht mehr: "seit letztem Test: von 67 auf 71 Punkte" sagte dasselbe wie die
   * Pille darueber, nur ausfuehrlicher. In einer stehenden Spalte steht die
   * Wiederholung direkt unter dem Original.
   *
   * ENTSCHEIDUNG: "naechster Test" nennt nur die Tage und kein Datum. Der
   * Vertrag kennt bis heute nur `nextTestInDays`; ein Datum daraus zu rechnen
   * hiesse, einen Bezugstag zu erfinden — vom letzten Test aus gerechnet stimmt
   * es nur, wenn der heute war, und von "heute" aus gerechnet unterscheiden sich
   * Server und Browser ueber Mitternacht. Sobald der Vertrag einen Termin
   * traegt, steht er hier davor.
   */
  const facts: Fact[] = [
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
         * Die Kachel ist ihr eigener Container, und daran haengen BEIDE Formen:
         * @lg (32rem) ist die Stufe, ab der Zahl, Pille und Kurve nebeneinander
         * Platz haben. Darunter stapelt sie.
         */
        "@container",
        /* Kein Rahmen — die Flaeche traegt die Kachel. Siehe surface-score. */
        "surface-score rounded-panel relative overflow-hidden p-5 @sm:p-6",
        /*
         * DREI Bloecke: Kopf, Mitte, Fusszeile. Die Kachel bekommt ihre Hoehe
         * von der Zeile des Rasters (align-items: stretch), und der Zuwachs
         * geht an die MITTE — nicht an die Abstaende dazwischen. Ein
         * justify-between ueber zwei Bloecke schob frueher genau diesen
         * Zuwachs als Loch in die Kachelmitte; jetzt steht dort Inhalt.
         */
        "flex flex-col gap-5",
        className,
      )}
    >
      <ScoreHeading id="score-hero-titel" />

      {/*
       * DIE MITTE TRAEGT DIE STRECKUNG. Zahl, Veraenderung und der Weg dorthin
       * — in der Spalte untereinander, in der liegenden Form nebeneinander, und
       * in beiden Faellen senkrecht zentriert in dem Platz, den die Zeile der
       * Kachel zuteilt. Waechst die Nachbarkachel, waechst dieser Block mit und
       * die Gruppe rueckt in seine Mitte, statt am Kopf kleben zu bleiben.
       *
       * KEIN justify-between: die Kurve gehoert zur Zahl, nicht zum Rand. An die
       * Kachelkante geheftet wandert sie mit jeder Breitenaenderung davon und
       * laesst dasselbe Loch stehen, das gerade geschlossen wurde.
       */}
      <div className="flex flex-1 flex-col items-start justify-center gap-4 @lg:flex-row @lg:flex-wrap @lg:content-center @lg:items-center @lg:gap-x-6 @lg:gap-y-4">
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <div className="flex flex-col items-start gap-2 @lg:flex-row @lg:flex-wrap @lg:items-baseline @lg:gap-x-3">
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

          {/*
           * DIE EINORDNUNG — ein Satz, und er beantwortet die Frage, die die
           * Zahl offen laesst. Die 71 stand hier ohne Massstab: sie war nur im
           * Vergleich zum eigenen Vorwert lesbar, und "plus 4" sagt nichts
           * darueber, ob 71 ein guter Ort ist.
           *
           * Er steht UNTER Zahl und Pille, nicht daneben: die Pille ist die
           * Bewegung, der Satz ist der Stand. Zwei Aussagen auf einer Linie
           * laesen sich als eine.
           *
           * OHNE STATUSFARBE — der Grund steht bei toScoreNote.
           */}
          <p className="text-on-score-muted max-w-measure text-xs leading-4">
            {toScoreNote(current.value)}
          </p>
        </div>

        <ScoreTrend history={score.history} label={trendLabel} />
      </div>

      <FactRow facts={facts} />
    </motion.section>
  );
}
