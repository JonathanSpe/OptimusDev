"use client";

import NumberFlow from "@number-flow/react";
import { scaleLinear } from "d3-scale";
import { arc } from "d3-shape";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useId, useState } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  CONFIDENCE_MAX,
  toScoreBand,
  type CategoryScore,
  type ScoreBand,
} from "../sample-data";

/*
 * DIE KATEGORIE-RINGE — vier Instrumente auf einer Karte.
 *
 * Ein Ring ist ausdruecklich KEIN Aktivitaetsring: er zeigt nicht, wie voll
 * etwas ist, sondern WO ein Wert gegenueber seinem Ziel steht. Deshalb ist das
 * Zifferblatt schon vollstaendig da, bevor der Wert eintrifft — Spur,
 * Teilstriche und Zielstrich stehen ab dem ersten Frame. Nur der Wertbogen
 * bewegt sich.
 *
 * Score und Konfidenz sind ZWEI KANAELE. Der Bogen traegt den Score, der
 * Balken darunter die Belastbarkeit der Aussage; sie werden nie ineinander
 * gerechnet und der Balken bekommt nie eine Statusfarbe.
 */

/** Die Score-Skala ist fest — nur so sind vier Ringe vergleichbar. */
const SCORE_MIN = 0;
const SCORE_MAX = 100;

const DEGREE = Math.PI / 180;
/*
 * OFFENER Bogen: 270 Grad Sweep, 90 Grad Luecke unten. d3 misst Winkel ab
 * 12 Uhr im Uhrzeigersinn, der Bogen laeuft also von -135 nach +135 Grad. Die
 * Luecke ist kein Stilmittel: sie macht aus dem geschlossenen Ring eine Skala
 * mit Anfang und Ende und gibt der Zahl in der Mitte ihren Platz.
 */
const START_ANGLE = -135 * DEGREE;
const END_ANGLE = 135 * DEGREE;

/*
 * Score -> Winkel. clamp, damit ein Wert ausserhalb der Skala den Bogen nicht
 * um den Kreis herum weiterzeichnet, sondern am Anschlag stehen bleibt.
 */
const toAngle = scaleLinear()
  .domain([SCORE_MIN, SCORE_MAX])
  .range([START_ANGLE, END_ANGLE])
  .clamp(true);

/*
 * Die Geometrie steht in PIXELN und ist fuer alle vier Ringe dieselbe — daran
 * haengt die Vergleichbarkeit. Skaliert wird ueber die viewBox, nie ueber
 * einzelne Masse.
 */
const ARC_WIDTH = 8;
const ARC_OUTER = 56;
/** Luft zwischen Bogen und Teilstrichen: die Skala klebt nicht am Band. */
const TICK_GAP = 3;
const TICK_LENGTH = 5;
const TARGET_TICK_LENGTH = 9;
/** Aussenradius des Zifferblatts — der laengste Strich bestimmt ihn. */
const FACE_RADIUS = ARC_OUTER + TICK_GAP + TARGET_TICK_LENGTH;
const SIZE = FACE_RADIUS * 2;
const CENTER = FACE_RADIUS;
/*
 * Unterhalb der Bogenenden wird nichts mehr gezeichnet. Die Box endet dort
 * statt am Kreis, sonst steht unter jedem Ring ein Streifen Nichts — und der
 * Abstand zum Namen waere bei jedem Ring derselbe leere Platz.
 */
const FACE_HEIGHT = Math.ceil(CENTER - FACE_RADIUS * Math.cos(END_ANGLE)) + 1;

/** Beschriftete Punkte der Skala. Der Zielstrich ersetzt den Strich, auf dem er liegt. */
const GRADUATIONS = [0, 25, 50, 75, 100] as const;

interface ArcSpan {
  startAngle: number;
  endAngle: number;
}

/*
 * Bogen als FLAECHE, nicht als Linie: cornerRadius in halber Bandbreite rundet
 * die Enden genau so, wie es eine runde Strichkappe taete — nur ohne dass die
 * Kappe ueber den Anschlag der Skala hinausragt.
 */
const gaugeArc = arc<ArcSpan>()
  .innerRadius(ARC_OUTER - ARC_WIDTH)
  .outerRadius(ARC_OUTER)
  .cornerRadius(ARC_WIDTH / 2);

function toArcPath(span: ArcSpan): string {
  return gaugeArc(span) ?? "";
}

/*
 * Punkt auf dem Zifferblatt, relativ zum Mittelpunkt — dieselbe Konvention wie
 * d3 (0 = 12 Uhr, im Uhrzeigersinn). d3 zeichnet seine Boegen um den Ursprung;
 * damit Boegen und Striche in EINEM Koordinatensystem liegen, rechnet auch die
 * Skala hier vom Ursprung aus, und die Gruppe im SVG schiebt beides gemeinsam
 * in die Mitte.
 */
function polar(angle: number, radius: number): { x: number; y: number } {
  return {
    x: radius * Math.sin(angle),
    y: -radius * Math.cos(angle),
  };
}

interface TickProps {
  score: number;
  length: number;
  width: number;
  className: string;
}

function Tick({ score, length, width, className }: TickProps) {
  const angle = toAngle(score);
  const from = polar(angle, ARC_OUTER + TICK_GAP);
  const to = polar(angle, ARC_OUTER + TICK_GAP + length);

  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      strokeWidth={width}
      strokeLinecap="round"
      className={className}
    />
  );
}

/*
 * Das Band traegt die Farbe, sonst nichts. Sie ist Verstaerkung: Bogenlaenge,
 * Abstand zum Zielstrich und die Zahl sagen dasselbe auch in Graustufen.
 */
const BAND_ARC: Record<ScoreBand, string> = {
  critical: "fill-critical",
  warning: "fill-warning",
  success: "fill-success",
};

const BAND_TEXT: Record<ScoreBand, string> = {
  critical: "text-critical",
  warning: "text-warning",
  success: "text-success",
};

export interface CategoryDialProps {
  category: CategoryScore;
  /** Zielwert auf der Score-Skala — er zeichnet den staerkeren Zielstrich. */
  target: number;
  /** Der Engpass: die Kategorie, die den Gesamtscore derzeit deckelt. */
  isLimiter?: boolean;
  /** Position in der Reihe. Steuert Auftritt und Bogenlauf ueber den Stagger. */
  index?: number;
  onOpenDetails?: (id: string) => void;
  className?: string;
}

export function CategoryDial({
  category,
  target,
  isLimiter = false,
  index = 0,
  onOpenDetails,
  className,
}: CategoryDialProps) {
  const motionPreset = useMotionPreset();
  const band = toScoreBand(category.score);

  /*
   * EIN Fortschritt treibt den Bogen: aus ihm entsteht der Pfad bei jedem Frame
   * neu, statt eine fertige Linie freizulegen. Die Zahl laeuft daneben mit
   * derselben Feder — motionPreset.layout und motionPreset.number sind zwei
   * Ausgabeformen derselben Physik, Bogen und Zahl kommen deshalb im selben
   * Frame an.
   *
   * Bei reduzierter Bewegung steht das Instrument schon bei der ersten
   * Zeichnung fertig da: voller Bogen, richtige Zahl. Es wartet nicht auf einen
   * Effekt, der ohnehin keine Zeit haette — kein Frame zeigt eine leere Skala.
   */
  const progress = useMotionValue(motionPreset.reduced ? 1 : 0);
  const valuePath = useTransform(progress, (fraction) =>
    toArcPath({
      startAngle: START_ANGLE,
      endAngle: toAngle(category.score * fraction),
    }),
  );
  const [countedScore, setCountedScore] = useState(0);
  const shownScore = motionPreset.reduced ? category.score : countedScore;

  useEffect(() => {
    /* Wechselt die Systemeinstellung waehrend der Sitzung, steht der Bogen
     * sofort still auf seinem Endwert. */
    if (motionPreset.reduced) {
      progress.set(1);
      return;
    }

    /* Derselbe Versatz wie der Auftritt der Zelle: der Bogen laeuft los, wenn
     * die Zelle erscheint, nicht davor und nicht danach. */
    const delay = motionPreset.stagger(index);
    const sweep = animate(progress, 1, { ...motionPreset.layout, delay });
    const countUp = window.setTimeout(() => {
      setCountedScore(category.score);
    }, delay * 1000);

    return () => {
      sweep.stop();
      window.clearTimeout(countUp);
    };
  }, [category.score, index, motionPreset, progress]);

  return (
    <motion.div
      variants={motionPreset.fadeRise}
      custom={index}
      /*
       * EINE Gruppe je Ring mit einer vollstaendigen Beschriftung. Der Name
       * darunter steht trotzdem als echter Text da — er wird dadurch zweimal
       * vorgelesen, aber ein Ring ohne sichtbaren Namen waere fuer alle anderen
       * unbrauchbar.
       */
      role="group"
      aria-label={`${category.name}, Score ${category.score} von ${SCORE_MAX}, Ziel ${target}, Konfidenz ${category.confidence} von ${CONFIDENCE_MAX}`}
      className={cn(
        "group relative mx-auto flex w-full flex-col items-center transition",
        /*
         * ENTSCHEIDUNG: Die Zelle hebt sich im Hover nur um einen Pixel und
         * bekommt keinen Schatten — sie hat keine eigene Flaeche, ein Schatten
         * haengt also an nichts. Die zweite Haelfte der Rueckmeldung traegt der
         * Zielstrich, der gleichzeitig anzieht.
         */
        "motion-safe:hover:-translate-y-px motion-reduce:transition-none",
        className,
      )}
      style={{ maxWidth: SIZE }}
    >
      {/*
       * TODO(L2-Kategorieansicht): Hier wird spaeter die Kategorie geoeffnet
       * (Marker der Kategorie, Herleitung des Scores, Empfehlungen). Bis dahin
       * bleibt die Schaltflaeche ohne Ziel; Fokusring und Anhebung zeigen aber
       * schon, dass der Ring ein Ziel hat.
       */}
      <button
        type="button"
        onClick={() => onOpenDetails?.(category.id)}
        aria-label={`Details zu ${category.name} öffnen`}
        className="focus-visible:outline-ring absolute inset-0 z-10 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
      />

      <div
        className="relative w-full"
        style={{ aspectRatio: `${SIZE} / ${FACE_HEIGHT}` }}
      >
        {/* Das Instrument ist ein Bild ohne eigene Aussage: alles, was es
         * zeigt, steht in der Beschriftung der Gruppe. */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${SIZE} ${FACE_HEIGHT}`}
          className="block w-full"
        >
          <g transform={`translate(${CENTER} ${CENTER})`}>
            <path
              d={toArcPath({ startAngle: START_ANGLE, endAngle: END_ANGLE })}
              className="fill-dial-track"
            />

            {GRADUATIONS.filter((score) => score !== target).map((score) => (
              <Tick
                key={score}
                score={score}
                length={TICK_LENGTH}
                width={1}
                className="stroke-dial-graduation"
              />
            ))}

            {/* Der Zielstrich ist der Bezugspunkt der ganzen Anzeige — er ist
             * laenger und kraeftiger als die uebrigen Striche und zieht im
             * Hover zusaetzlich an. */}
            <Tick
              score={target}
              length={TARGET_TICK_LENGTH}
              width={2}
              className="stroke-dial-target group-hover:stroke-dial-target-strong transition-colors motion-reduce:transition-none"
            />

            <motion.path d={valuePath} className={BAND_ARC[band]} />
          </g>
        </svg>

        {/*
         * Die Zahl ist HTML-Text und kein SVG-Text: sie soll skalieren,
         * markierbar sein und von NumberFlow hochgezaehlt werden. Sie sitzt
         * exakt im Kreismittelpunkt, den die Luecke unten freihaelt.
         */}
        <p
          className="text-metric absolute inset-x-0 -translate-y-1/2 text-center leading-none font-semibold tracking-tight tabular-nums"
          style={{ top: `${(CENTER / FACE_HEIGHT) * 100}%` }}
        >
          {/* Die Bandfarbe sitzt eine Ebene tiefer: zusammen mit der
           * Groessenstufe in EINER Klassenliste wuerde tailwind-merge die
           * beiden als denselben text-*-Konflikt sehen und eine davon
           * verwerfen. */}
          <span aria-hidden="true" className={BAND_TEXT[band]}>
            <NumberFlow
              value={shownScore}
              locales="de-DE"
              willChange
              transformTiming={motionPreset.number}
              spinTiming={motionPreset.number}
              trend={1}
            />
          </span>
        </p>
      </div>

      {/* Feste Hoehe fuer Name und Tag: die Konfidenzbalken aller vier Ringe
       * stehen dadurch auf einer Linie, egal wie lang ein Name umbricht. */}
      <p className="text-foreground mt-3 flex h-8 items-start justify-center text-center text-xs leading-4 font-medium text-balance">
        {category.name}
      </p>

      <div className="flex h-5 items-center justify-center">
        {isLimiter ? (
          /* Ein WORT, keine Farbfläche: dass die Kategorie tief liegt, sagt
           * schon der Bogen. Das Tag sagt das andere — dass sie den
           * Gesamtscore deckelt, genau wie "begrenzt durch" auf der
           * Score-Kachel. */
          <span className="border-border text-muted-foreground text-2xs rounded-full border px-2 leading-4">
            Engpass
            <span className="sr-only"> — begrenzt derzeit den Gesamtscore</span>
          </span>
        ) : null}
      </div>

      {/*
       * Konfidenz als fuenf gleich breite Segmente. Gefuellte Segmente sind
       * dichter UND hoeher: die Stufe ist damit auch ohne Farbe ablesbar. Der
       * Wert steht in der Beschriftung der Gruppe.
       */}
      <div
        aria-hidden="true"
        className="mt-2 grid h-1.5 w-full grid-cols-5 items-end gap-px"
      >
        {Array.from({ length: CONFIDENCE_MAX }, (_, step) => (
          <span
            key={step}
            className={
              step < category.confidence
                ? "bg-dial-confidence h-1.5"
                : "bg-dial-confidence-empty h-1"
            }
          />
        ))}
      </div>
    </motion.div>
  );
}

export interface CategoryDialPanelProps {
  categories: readonly CategoryScore[];
  /** Zielwert der Score-Skala — derselbe wie die Ziellinie der Score-Kachel. */
  target: number;
  /** Id der Kategorie, die den Gesamtscore deckelt. Genau eine oder keine. */
  limiterId?: string;
  onOpenDetails?: (id: string) => void;
  className?: string;
}

/** Leerzustand: die Kategorien stehen erst nach der ersten Auswertung fest. */
function EmptyCategories({ className }: { className?: string }) {
  return (
    <section
      className={cn("surface-card rounded-2xl p-6", className)}
      aria-label="Kategorien"
    >
      <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Kategorien
      </p>
      <p className="text-foreground mt-3 text-sm font-medium">
        Noch keine Kategorien
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Sobald dein erster Bluttest ausgewertet ist, steht hier je Kategorie ein
        Score samt Konfidenz.
      </p>
    </section>
  );
}

export function CategoryDialPanel({
  categories,
  target,
  limiterId,
  onOpenDetails,
  className,
}: CategoryDialPanelProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();

  if (categories.length === 0) {
    return <EmptyCategories className={className} />;
  }

  return (
    <motion.section
      variants={motionPreset.fadeRise}
      initial="hidden"
      animate="visible"
      aria-labelledby={titleId}
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <h2
        id={titleId}
        className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase"
      >
        Kategorien
      </h2>
      {/* Die Legende steht einmal ueber dem Raster statt an jedem Ring: zwei
       * Kanaele muss man einmal erklaert bekommen, nicht viermal. */}
      <p className="text-muted-foreground text-2xs mt-1">
        Ring = Score · Balken = Konfidenz
      </p>

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6">
        {categories.map((category, position) => (
          <CategoryDial
            key={category.id}
            category={category}
            target={target}
            isLimiter={category.id === limiterId}
            /* Die Karte selbst ist Element 0 der Reihe, die Ringe folgen ihr. */
            index={position + 1}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    </motion.section>
  );
}
