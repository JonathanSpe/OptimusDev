"use client";

import NumberFlow from "@number-flow/react";
import { scaleLinear } from "d3-scale";
import { arc } from "d3-shape";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { toEvidenceLevel } from "../rules";
import {
  CONFIDENCE_MAX,
  SCORE_MAX,
  SCORE_MIN,
  type CategoryScore,
} from "../sample-data";
import { toVerdictWord } from "./score-verdict";

/*
 * ============================================================================
 * DAS INSTRUMENT EINER KATEGORIE — der Ring und die Datenlage-Punkte.
 * ============================================================================
 * Beides steht HIER und nicht in einer der beiden Kacheln, die es zeigen: der
 * Ring traegt drei Mechaniken (Bogenlauf, Strich des letzten Tests, zaehlende
 * Zahl), die zusammen seine Aussage machen. Eine zweite Kopie davon liefe
 * irgendwann anders — ein Ring mit Strich und einer ohne, oder zwei Zahlen, die
 * in verschiedenen Federn einrasten. Der Ring ist das Instrument, die Kachel
 * nur der Ort.
 *
 * Ein Ring hat GENAU EINEN Bezugspunkt: den letzten Test. Der Ring beantwortet
 * nicht "gut oder schlecht", sondern "wohin hat es sich bewegt".
 *
 * ⚠️ EINE SCHWELLE GIBT ES INZWISCHEN (toScoreVerdict in rules.ts) — der BOGEN
 * traegt sie trotzdem nicht. Zwei Gruende, und beide gelten unabhaengig
 * voneinander: ein eingefaerbter Ring waere die groesste farbige Flaeche der
 * Seite, und Rot ist Akzent und nie Flaeche; und der Bogen hat schon eine
 * Aussage, naemlich seine LAENGE. Zwei Aussagen in einem Zeichen liest niemand
 * getrennt — bei 74 waere unklar, ob der kurze Bogen oder das Bernstein die
 * Nachricht ist.
 *
 * Deshalb bleibt der Bogen Graphit, immer, bei 61 wie bei 84, und das Urteil
 * steht als Zeichen mit Wort NEBEN ihm (VerdictChip). Es ist damit lesbar, ohne
 * gedeutet werden zu muessen.
 *
 * Score und Datenlage sind ZWEI KANAELE. Der Bogen traegt den Score, die Punkte
 * die Belastbarkeit der Aussage; sie werden nie ineinander gerechnet.
 *
 * ⚠️ UI-WORT UND FACHBEGRIFF SIND ENTKOPPELT: im Code heisst der zweite Kanal
 * `confidence`, sichtbar heisst er "Datenlage" und tritt als Wort auf
 * (gering/mittel/gut, siehe toEvidenceLevel in rules.ts). Wer hier "Konfidenz"
 * zurueckschreibt, schreibt einen Fachbegriff in eine Kundenoberflaeche.
 *
 * Ring und Punkte sind BILDER ohne eigene Aussage: sie sind durchweg
 * aria-hidden. Was sie zeigen, steht in der Beschriftung der Gruppe, die sie
 * umgibt — dort, wo auch der Name der Kategorie steht.
 */

const DEGREE = Math.PI / 180;
const FULL_TURN = 360;

/*
 * Score -> Winkel in Grad. d3 misst ab 12 Uhr im Uhrzeigersinn, der Bogen
 * beginnt also oben und laeuft rechtsherum. clamp, damit ein Wert ausserhalb
 * der Skala nicht ein zweites Mal um den Kreis zieht, sondern am Anschlag
 * stehen bleibt.
 */
const toDegrees = scaleLinear()
  .domain([SCORE_MIN, SCORE_MAX])
  .range([0, FULL_TURN])
  .clamp(true);

const toAngle = (score: number): number => toDegrees(score) * DEGREE;

/**
 * Zwei Groessen, ZWEI Orte — und innerhalb eines Ortes ist die Geometrie fuer
 * alle Ringe dieselbe. Daran haengt die Vergleichbarkeit: gleicher Radius,
 * gleiche Bandbreite, gleicher Startpunkt, nur die Bogenlaenge unterscheidet
 * sie. Die Masse stehen als Zahlen, weil hier SVG-Geometrie gerechnet wird und
 * keine Flaeche gestaltet wird.
 */
export type RingSize =
  /** 78px — der Ring als Hauptdarsteller seiner Zelle, Name darunter. */
  | "regular"
  /** 56px — der Ring als Kopf einer Spalte, Name und Datenlage daneben. */
  | "compact";

interface RingGeometry {
  box: number;
  radius: number;
  stroke: number;
  /**
   * Ueberstand des Strichs beidseits der Spur. Er ist der Grund, warum die
   * Marke auch dann auffindbar bleibt, wenn der Bogen ueber sie hinweggelaufen
   * ist: die beiden Enden stehen immer frei.
   */
  overhang: number;
  /** Schriftstufe der Zahl. Sie muss in den Innenkreis passen, auch dreistellig. */
  value: string;
}

const GEOMETRY: Readonly<Record<RingSize, RingGeometry>> = {
  regular: { box: 78, radius: 28, stroke: 4.5, overhang: 3, value: "text-xl" },
  compact: {
    box: 56,
    radius: 20,
    stroke: 3.5,
    overhang: 2.5,
    value: "text-lg",
  },
};

interface ArcSpan {
  startAngle: number;
  endAngle: number;
}

/*
 * Bogen als FLAECHE, nicht als Linie: cornerRadius in halber Bandbreite rundet
 * die Enden genau so, wie es eine runde Strichkappe taete — nur ohne dass die
 * Kappe ueber den Wert hinausragt. Eine Kappe wuerde den Bogen um gut einen
 * Punkt zu lang zeichnen, und genau daran wird er hier gemessen.
 */
function toGenerator(geometry: RingGeometry) {
  return arc<ArcSpan>()
    .innerRadius(geometry.radius - geometry.stroke / 2)
    .outerRadius(geometry.radius + geometry.stroke / 2)
    .cornerRadius(geometry.stroke / 2);
}

const GENERATOR: Readonly<Record<RingSize, ReturnType<typeof toGenerator>>> = {
  regular: toGenerator(GEOMETRY.regular),
  compact: toGenerator(GEOMETRY.compact),
};

/*
 * Punkt auf dem Ring, relativ zum Mittelpunkt — dieselbe Konvention wie d3
 * (0 = 12 Uhr, im Uhrzeigersinn). d3 zeichnet seine Boegen um den Ursprung;
 * damit Bogen und Strich in EINEM Koordinatensystem liegen, rechnet auch diese
 * Funktion vom Ursprung aus, und die Gruppe im SVG schiebt beides gemeinsam in
 * die Mitte.
 */
function polar(angle: number, radius: number): { x: number; y: number } {
  return {
    x: radius * Math.sin(angle),
    y: -radius * Math.cos(angle),
  };
}

export interface CategoryRingProps {
  score: number;
  /**
   * Derselbe Score beim VORHERIGEN Test — die einzige Bezugsmarke am Ring.
   * Fehlt er (erster Test), fehlt der Strich, statt dass einer erfunden wird.
   */
  previousScore?: number;
  /** Position in der Reihe. Steuert Bogenlauf und Zahl ueber den Stagger. */
  index?: number;
  size?: RingSize;
  className?: string;
}

export function CategoryRing({
  score,
  previousScore,
  index = 0,
  size = "regular",
  className,
}: CategoryRingProps) {
  const motionPreset = useMotionPreset();
  const geometry = GEOMETRY[size];
  const generator = GENERATOR[size];

  /*
   * EIN Fortschritt treibt den Bogen: aus ihm entsteht der Pfad bei jedem Frame
   * neu, statt eine fertige Linie freizulegen. Die Zahl laeuft daneben mit
   * derselben Feder — motionPreset.layout und motionPreset.number sind zwei
   * Ausgabeformen derselben Physik, Bogen und Zahl kommen deshalb im selben
   * Frame an.
   *
   * Bei reduzierter Bewegung steht das Instrument schon bei der ersten
   * Zeichnung fertig da: voller Bogen, richtige Zahl. Es wartet nicht auf einen
   * Effekt, der ohnehin keine Zeit haette — kein Frame zeigt einen leeren Ring.
   */
  const progress = useMotionValue(motionPreset.reduced ? 1 : 0);
  const valuePath = useTransform(
    progress,
    (fraction) =>
      generator({ startAngle: 0, endAngle: toAngle(score * fraction) }) ?? "",
  );
  const [countedScore, setCountedScore] = useState(0);
  const shownScore = motionPreset.reduced ? score : countedScore;

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
      setCountedScore(score);
    }, delay * 1000);

    return () => {
      sweep.stop();
      window.clearTimeout(countUp);
    };
  }, [index, motionPreset, progress, score]);

  const notchAngle =
    previousScore === undefined ? null : toAngle(previousScore);
  const center = geometry.box / 2;
  const inner = geometry.radius - geometry.stroke / 2 - geometry.overhang;
  const outer = geometry.radius + geometry.stroke / 2 + geometry.overhang;

  return (
    <div
      aria-hidden="true"
      className={cn("relative shrink-0", className)}
      style={{ width: geometry.box, height: geometry.box }}
    >
      <svg
        viewBox={`0 0 ${geometry.box} ${geometry.box}`}
        width={geometry.box}
        height={geometry.box}
      >
        <g transform={`translate(${center} ${center})`}>
          <path
            d={generator({ startAngle: 0, endAngle: FULL_TURN * DEGREE }) ?? ""}
            className="fill-dial-track"
          />

          {/*
           * Der Strich liegt UNTER dem Bogen, und das ist die ganze Mechanik
           * dieser Anzeige: hat der Wert zugelegt, laeuft der Bogen im Auftritt
           * sichtbar ueber ihn hinweg und deckt ihn bis auf seine beiden Enden
           * zu. Ist der Wert gefallen, bleibt der Strich frei auf der Spur
           * stehen, VOR dem Bogenende. Man sieht die Richtung, ohne dass ein
           * Vorzeichen sie behauptet.
           */}
          {notchAngle === null ? null : (
            <line
              x1={polar(notchAngle, inner).x}
              y1={polar(notchAngle, inner).y}
              x2={polar(notchAngle, outer).x}
              y2={polar(notchAngle, outer).y}
              strokeWidth={2}
              className="stroke-dial-notch"
            />
          )}

          <motion.path d={valuePath} className="fill-dial-value" />
        </g>
      </svg>

      {/*
       * Die Zahl ist HTML-Text und kein SVG-Text: sie soll markierbar sein, mit
       * der Schriftgroesse des Nutzers wachsen und von NumberFlow hochgezaehlt
       * werden. Sie steht neutral wie der Bogen.
       */}
      <p
        className={cn(
          "text-foreground absolute inset-0 grid place-items-center leading-none font-semibold tracking-tight tabular-nums",
          geometry.value,
        )}
      >
        <NumberFlow
          value={shownScore}
          locales="de-DE"
          willChange
          transformTiming={motionPreset.number}
          spinTiming={motionPreset.number}
          trend={1}
        />
      </p>
    </div>
  );
}

/**
 * Die vollstaendige Beschriftung eines Instruments. Sie steht an EINER Stelle,
 * weil die Zelle der Kategorien-Kachel und die Spalte des Bereichsfelds
 * denselben Ring vorlesen — zwei Formulierungen desselben Instruments waeren
 * zwei Instrumente.
 */
export function toRingLabel(category: CategoryScore): string {
  return [
    category.name,
    `Score ${category.score} von ${SCORE_MAX}`,
    /* Dasselbe Wort, das die Pille daneben zeigt — und bei duenner Datenlage
     * dasselbe Nicht-Urteil. Zwei Formulierungen desselben Befunds waeren zwei
     * Befunde. */
    toVerdictWord(category.score, category.confidence),
    category.previousScore === undefined
      ? "kein Vorwert"
      : `letzter Test ${category.previousScore}`,
    /* In Worten, nicht in Punkten: "3 von 5" waere eine Skala, die nur wir
     * kennen. Dieselbe Stufe zeigen sichtbar die Punkte daneben. */
    `Datenlage ${toEvidenceLevel(category.confidence)}`,
  ].join(", ");
}

export interface ConfidenceDotsProps {
  confidence: number;
  className?: string;
}

/**
 * Die Datenlage als fuenf Punkte, mit ihrem Namen davor und ihrer STUFE
 * dahinter. Ohne Beschriftung sind fuenf Punkte unter einem Ring nur ein Muster
 * — man haelt sie fuer eine zweite Bewertung des Scores.
 *
 * DIE STUFE STAND BISHER NUR IN DER BESCHRIFTUNG FUER SCREENREADER. Das war
 * eine Notation, die nur wir lesen konnten: wer vier von fuenf gefuellten
 * Punkten sieht, weiss nicht, ob vier viel ist — dieselbe Skala, vor der der
 * Kommentar in rules.ts warnt ("3 von 5 ist eine Skala, die nur wir kennen"),
 * nur in Punkten statt in Ziffern. Das Wort beantwortet es (gering / mittel /
 * gut), die Punkte zeigen, wie weit es bis zur naechsten Stufe ist. Beide
 * kommen aus derselben Zahl.
 *
 * Gefuellte Punkte sind dichter UND groesser, damit die Stufe auch ohne Farbe
 * ablesbar bleibt; jeder Punkt sitzt in einer gleich grossen Zelle, sonst
 * verschoebe der Groessenunterschied den Abstand.
 *
 * ⚠️ KEINE STATUSFARBE, auch nicht bei "gut". Die Datenlage sagt, wie belastbar
 * ein Urteil ist, und ist selbst keines — gruene Punkte neben einem bernsteinen
 * Urteil waeren zwei Urteile in einem Kopf.
 */
export function ConfidenceDots({ confidence, className }: ConfidenceDotsProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center gap-1.5", className)}
    >
      <span className="text-muted-foreground text-2xs leading-4">
        Datenlage
      </span>
      <span className="flex items-center gap-1">
        {Array.from({ length: CONFIDENCE_MAX }, (_, step) => (
          <span key={step} className="grid size-1.5 place-items-center">
            <span
              className={
                step < confidence
                  ? "bg-dial-confidence size-1.5 rounded-full"
                  : "bg-dial-confidence-empty size-1 rounded-full"
              }
            />
          </span>
        ))}
      </span>
      <span className="text-foreground text-2xs leading-4 font-medium">
        {toEvidenceLevel(confidence)}
      </span>
    </div>
  );
}
