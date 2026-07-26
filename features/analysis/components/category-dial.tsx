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
 * Score und Konfidenz sind ZWEI KANAELE. Der Bogen traegt den Score, die Punkte
 * darunter die Belastbarkeit der Aussage; sie werden nie ineinander gerechnet.
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
/** Breite von Name und Punkten unter dem Ring. Sie haelt die vier Zellen als
 * Paare zusammen, statt sie ueber die ganze Karte zu ziehen. */
const CELL_WIDTH = 160;

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
  /** Der Engpass: die Kategorie, die den Gesamtscore derzeit deckelt. */
  isLimiter?: boolean;
  /** Position in der Reihe. Steuert Auftritt und Bogenlauf ueber den Stagger. */
  index?: number;
  onOpenDetails?: (id: string) => void;
  className?: string;
}

export function CategoryDial({
  category,
  isLimiter = false,
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
        `Konfidenz ${category.confidence} von ${CONFIDENCE_MAX}`,
      ].join(", ")}
      className={cn(
        "group relative mx-auto flex flex-col items-center transition",
        /*
         * ENTSCHEIDUNG: Die Zelle hebt sich im Hover nur um einen Pixel und
         * bekommt keinen Schatten — sie hat keine eigene Flaeche, ein Schatten
         * haengt also an nichts.
         */
        "motion-safe:hover:-translate-y-px motion-reduce:transition-none",
        className,
      )}
      style={{ width: CELL_WIDTH }}
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

      {/* Feste Hoehe fuer Name und Tag: die Konfidenzpunkte aller vier Ringe
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
       * Konfidenz als fuenf Punkte. Gefuellte Punkte sind dichter UND groesser:
       * die Stufe ist damit auch ohne Farbe ablesbar. Jeder Punkt sitzt in
       * einer gleich grossen Zelle, sonst verschoebe der Groessenunterschied
       * den Abstand. Der Wert steht in der Beschriftung der Gruppe.
       */}
      <div aria-hidden="true" className="flex items-center gap-1.5">
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
      </div>
    </motion.div>
  );
}

export interface CategoryDialPanelProps {
  categories: readonly CategoryScore[];
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
      {/* Die Legende steht einmal ueber dem Raster statt an jedem Ring: drei
       * Kanaele muss man einmal erklaert bekommen, nicht viermal. */}
      <p className="text-muted-foreground text-2xs mt-1">
        Ring = Score · Strich = letzter Test · Punkte = Konfidenz
      </p>

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6">
        {categories.map((category, position) => (
          <CategoryDial
            key={category.id}
            category={category}
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
