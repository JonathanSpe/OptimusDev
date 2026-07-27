"use client";

import NumberFlow from "@number-flow/react";
import { scaleLinear } from "d3-scale";
import { arc } from "d3-shape";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useId, useState } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { toEvidenceLevel } from "../rules";
import {
  CONFIDENCE_MAX,
  SCORE_MAX,
  SCORE_MIN,
  type CategoryScore,
} from "../sample-data";

/*
 * DIE KATEGORIE-RINGE — vier Instrumente auf einer Karte.
 *
 * Ein Ring hat GENAU EINEN Bezugspunkt: den letzten Test. Es gibt keinen
 * Zielwert je Kategorie, weil es keinen gibt — eine Schwelle, ab der ein Score
 * gut waere, muss klinisch gesetzt werden, und bis dahin waere jede Linie eine
 * Behauptung. Der Ring beantwortet deshalb nicht "gut oder schlecht", sondern
 * "wohin hat es sich bewegt".
 *
 * Daraus folgt die Farblosigkeit: der Bogen ist Graphit, immer, bei 61 wie bei
 * 84. Seine LAENGE ist die Aussage. Faerbte ihn ein Wert ein, waere die
 * Schwelle wieder da — nur unausgesprochen.
 *
 * Score und Datenlage sind ZWEI KANAELE. Der Bogen traegt den Score, die Punkte
 * darunter die Belastbarkeit der Aussage; sie werden nie ineinander gerechnet.
 *
 * ⚠️ UI-WORT UND FACHBEGRIFF SIND ENTKOPPELT: im Code heisst der zweite Kanal
 * `confidence`, sichtbar heisst er "Datenlage" und tritt als Wort auf
 * (gering/mittel/gut, siehe toEvidenceLevel in rules.ts). Wer hier "Konfidenz"
 * zurueckschreibt, schreibt einen Fachbegriff in eine Kundenoberflaeche.
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

/*
 * Die Geometrie steht in PIXELN und ist fuer alle vier Ringe dieselbe — daran
 * haengt die Vergleichbarkeit: gleicher Radius, gleiche Bandbreite, gleicher
 * Startpunkt. Nur die Bogenlaenge unterscheidet sie.
 */
const RADIUS = 28;
const STROKE = 4.5;
const RING_INNER = RADIUS - STROKE / 2;
const RING_OUTER = RADIUS + STROKE / 2;
/** Ueberstand des Strichs beidseits der Spur. Er ist der Grund, warum die
 * Marke auch dann auffindbar bleibt, wenn der Bogen ueber sie hinweggelaufen
 * ist: die beiden Enden stehen immer frei. */
const NOTCH_OVERHANG = 3;
const BOX = 78;
const CENTER = BOX / 2;

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
const ring = arc<ArcSpan>()
  .innerRadius(RING_INNER)
  .outerRadius(RING_OUTER)
  .cornerRadius(STROKE / 2);

function toArcPath(span: ArcSpan): string {
  return ring(span) ?? "";
}

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

export interface CategoryDialProps {
  category: CategoryScore;
  /** Position in der Reihe. Steuert Auftritt und Bogenlauf ueber den Stagger. */
  index?: number;
  onOpenDetails?: (id: string) => void;
  className?: string;
}

export function CategoryDial({
  category,
  index = 0,
  onOpenDetails,
  className,
}: CategoryDialProps) {
  const motionPreset = useMotionPreset();
  const { previousScore } = category;

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
  const valuePath = useTransform(progress, (fraction) =>
    toArcPath({
      startAngle: 0,
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

  const notchAngle =
    previousScore === undefined ? null : toAngle(previousScore);

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
      aria-label={[
        category.name,
        `Score ${category.score} von ${SCORE_MAX}`,
        previousScore === undefined
          ? "kein Vorwert"
          : `letzter Test ${previousScore}`,
        /* In Worten, nicht in Punkten: "3 von 5" waere eine Skala, die nur wir
         * kennen. Dieselbe Stufe zeigen sichtbar die Punkte darunter. */
        `Datenlage ${toEvidenceLevel(category.confidence)}`,
      ].join(", ")}
      className={cn(
        /*
         * Die Zelle ist so breit wie ihre Obergrenze und keinen Pixel breiter:
         * das Raster darum (dial-grid) misst sie mit max-content, statt ihr
         * einen Anteil der Karte zuzuteilen.
         */
        "group w-dial-cell relative flex flex-col items-center transition",
        /*
         * ENTSCHEIDUNG: Die Zelle hebt sich im Hover nur um einen Pixel und
         * bekommt keinen Schatten — sie hat keine eigene Flaeche, ein Schatten
         * haengt also an nichts.
         */
        "motion-safe:hover:-translate-y-px motion-reduce:transition-none",
        className,
      )}
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

      <div className="relative" style={{ width: BOX, height: BOX }}>
        {/* Das Instrument ist ein Bild ohne eigene Aussage: alles, was es
         * zeigt, steht in der Beschriftung der Gruppe. */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${BOX} ${BOX}`}
          width={BOX}
          height={BOX}
        >
          <g transform={`translate(${CENTER} ${CENTER})`}>
            <path
              d={toArcPath({ startAngle: 0, endAngle: FULL_TURN * DEGREE })}
              className="fill-dial-track"
            />

            {/*
             * Der Strich liegt UNTER dem Bogen, und das ist die ganze Mechanik
             * dieser Anzeige: hat der Wert zugelegt, laeuft der Bogen im
             * Auftritt sichtbar ueber ihn hinweg und deckt ihn bis auf seine
             * beiden Enden zu. Ist der Wert gefallen, bleibt der Strich frei
             * auf der Spur stehen, VOR dem Bogenende. Man sieht die Richtung,
             * ohne dass ein Vorzeichen sie behauptet.
             */}
            {notchAngle === null ? null : (
              <line
                x1={polar(notchAngle, RING_INNER - NOTCH_OVERHANG).x}
                y1={polar(notchAngle, RING_INNER - NOTCH_OVERHANG).y}
                x2={polar(notchAngle, RING_OUTER + NOTCH_OVERHANG).x}
                y2={polar(notchAngle, RING_OUTER + NOTCH_OVERHANG).y}
                strokeWidth={2}
                className="stroke-dial-notch"
              />
            )}

            <motion.path d={valuePath} className="fill-dial-value" />
          </g>
        </svg>

        {/*
         * Die Zahl ist HTML-Text und kein SVG-Text: sie soll markierbar sein,
         * mit der Schriftgroesse des Nutzers wachsen und von NumberFlow
         * hochgezaehlt werden. Sie steht neutral wie der Bogen.
         */}
        <p className="text-foreground absolute inset-0 grid place-items-center text-xl leading-none font-semibold tracking-tight tabular-nums">
          <span aria-hidden="true">
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

      {/*
       * ZWEI ZEILEN, RESERVIERT. Bei der Zellbreite (size.dialCell) bricht
       * heute jeder der vier Namen zweizeilig — aber "heute" ist kein Halt:
       * ein kuerzerer Name in einer kuenftigen Kategorie stuende einzeilig da
       * und zoege seine Datenlage-Zeile um eine Zeilenhoehe nach oben, aus der
       * gemeinsamen Linie heraus. min-h-8 sind genau zwei Zeilen (2 x leading-4)
       * und BEWUSST nicht mehr: drei reservierte Zeilen waeren Leerraum unter
       * jedem Namen, und der Block loeste sich vom Ring.
       */}
      <p className="text-foreground mt-2 min-h-8 text-center text-xs leading-4 font-medium text-balance">
        {category.name}
      </p>

      {/*
       * Datenlage als fuenf Punkte, MIT dem Wort davor. Ohne Beschriftung sind
       * fuenf Punkte unter einem Ring nur ein Muster — man haelt sie fuer eine
       * zweite Bewertung des Scores. Der zweite Kanal muss sich benennen, sonst
       * ist er keiner. Gefuellte Punkte sind dichter UND groesser, damit die
       * Stufe auch ohne Farbe ablesbar bleibt; jeder Punkt sitzt in einer
       * gleich grossen Zelle, sonst verschoebe der Groessenunterschied den
       * Abstand. Die Stufe in Worten steht in der Beschriftung der Gruppe.
       */}
      <div aria-hidden="true" className="mt-1 flex items-center gap-2">
        <span className="text-muted-foreground text-2xs leading-4">
          Datenlage
        </span>
        <span className="flex items-center gap-1.5">
          {Array.from({ length: CONFIDENCE_MAX }, (_, step) => (
            <span key={step} className="grid size-1.5 place-items-center">
              <span
                className={
                  step < category.confidence
                    ? "bg-dial-confidence size-1.5 rounded-full"
                    : "bg-dial-confidence-empty size-1 rounded-full"
                }
              />
            </span>
          ))}
        </span>
      </div>
    </motion.div>
  );
}

export interface CategoryDialPanelProps {
  categories: readonly CategoryScore[];
  /**
   * Platz in der Auftrittsreihe der SEITE. Er verzoegert nur den Auftritt der
   * Karte; die Reihe der Ringe darin bleibt ihre eigene.
   */
  index?: number;
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
        Score samt Datenlage.
      </p>
    </section>
  );
}

export function CategoryDialPanel({
  categories,
  index = 0,
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
      custom={index}
      initial="hidden"
      animate="visible"
      aria-labelledby={titleId}
      /* Die Karte ist ihr eigener Container — die Zahl der Ringe je Zeile
       * haengt an IHRER Breite, nicht am Fenster. Im Bento steht sie mal ueber
       * die volle Breite und mal in sieben von zwoelf Spalten. */
      className={cn("surface-card @container rounded-2xl p-6", className)}
    >
      <h2
        id={titleId}
        className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase"
      >
        Kategorien
      </h2>
      {/* EIN Satz, und zwar in Sprache statt in Notation. "Ring = Score ·
       * Strich = letzter Test" stand hier als Legende: sie las sich wie eine
       * Bauanleitung und musste erst uebersetzt werden, bevor sie half. Mehr
       * als diese eine Zeile bekommt die Kachel nicht — braucht sie mehr,
       * erklaert sich das Instrument nicht selbst genug. */}
      <p className="text-muted-foreground max-w-measure mt-1 text-xs">
        Wie du in deinen vier Bereichen stehst; die kleine Marke im Ring zeigt,
        wo du beim letzten Test warst.
      </p>

      {/*
       * Ein Block statt einer Verteilung: die Stufen (eine Spalte, 2x2, eine
       * Reihe) stecken in dial-grid und messen die KARTE, nicht das Fenster.
       * Der Block steht links buendig unter der Ueberschrift — die Luft, die
       * die Karte uebrig hat, bleibt an ihrem rechten Rand.
       */}
      <div className="dial-grid mt-6">
        {categories.map((category, position) => (
          <CategoryDial
            key={category.id}
            category={category}
            /* Die Karte selbst ist Element 0 der Reihe, die Ringe folgen ihr. */
            index={position + 1}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    </motion.section>
  );
}
