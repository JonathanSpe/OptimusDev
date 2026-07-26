"use client";

import { scaleLinear } from "d3-scale";
import { motion } from "motion/react";
import { useId, useState } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  CONFIDENCE_MAX,
  SCORE_MAX,
  SCORE_MIN,
  categoryNameById,
  type Bundle,
} from "../sample-data";

/*
 * DIE BUENDEL-LANDKARTE — alle Buendel in einem Koordinatenfeld: Score nach
 * oben, Konfidenz nach rechts.
 *
 * Die Karte beantwortet eine Frage, die keine Liste beantworten kann: WO lohnt
 * sich Arbeit? Ein niedriger Wert allein sagt das nicht. Erst zusammen mit der
 * Belastbarkeit der Messung wird daraus eine Entscheidung — und genau diese
 * beiden Groessen sind hier die beiden Achsen. Der Fall, an dem man es sieht,
 * ist 2.1: der niedrigste Score der ganzen Analyse, und trotzdem nichts zu tun,
 * weil er ganz links steht.
 *
 * KEINE FARBKODIERUNG NACH KATEGORIE. Vier gedeckte Farbtoene sind bei normalem
 * Sehen nicht sicher auseinanderzuhalten (schlechtestes Paar ΔE 4) — und was
 * nicht unterscheidbar ist, kodiert nichts, es faerbt nur. Die Identitaet
 * traegt deshalb die Beschriftung am Punkt, ergaenzt um Tooltip und Tabelle.
 *
 * ENTSCHEIDUNG: Auch als FORM wird die Kategorie nicht kodiert. Die Nummer am
 * Punkt sagt sie bereits — "2.1" ist die zweite Kategorie — und eine zweite
 * Kodierung derselben Tatsache kostet nur Aufmerksamkeit. Wird die Kategorie
 * spaeter zum Filter, ist Form der Kanal dafuer, nicht Farbe.
 */

/*
 * ENTSCHEIDUNG: Es gibt NUR die senkrechte Trennung, kein Quadrantenraster.
 * Eine Grenze auf der Konfidenz-Achse sagt etwas ueber die DATEN ("ab hier ist
 * die Messung belastbar") — das ist eine Aussage ueber unsere Arbeit, und die
 * duerfen wir treffen. Eine Grenze auf der Score-Achse waere eine Aussage ueber
 * den Menschen ("ab hier ist es schlecht"), und die ist klinisch zu setzen,
 * nicht zu schaetzen. Der frueher gezeichnete Zielwert 75 ist genau daran
 * gestorben und kommt hier nicht als Quadrantenlinie zurueck. In der Senkrechten
 * spricht allein die Position.
 *
 * Die Stufe 4 von 5 ist ein PLATZHALTER wie die Konfidenzskala selbst; sie
 * kommt spaeter aus dem Bluttest-Framework.
 */
const CONFIDENCE_SOLID = 4;

/*
 * Betonung ohne Schwelle: Betont werden nicht "alle unter X", sondern die drei
 * NIEDRIGSTEN der belastbaren Buendel. Das ist eine Rangfolge, keine Grenze —
 * sie behauptet nicht, dass 72 schlecht ist, sondern dass es unter den gut
 * gemessenen Buendeln das dritt-niedrigste ist. Drei, weil eine Liste von
 * Ansatzpunkten, die laenger ist als drei, keine Ansatzpunkte mehr sind.
 */
const FOCUS_COUNT = 3;

/** Beschriftete Linien der Score-Achse. */
const SCORE_GRID = [0, 25, 50, 75, 100] as const;
/** Stufen der Konfidenz-Achse. Sie ist ganzzahlig, nicht stufenlos. */
const CONFIDENCE_STEPS = [1, 2, 3, 4, 5] as const;

/*
 * Beide Achsen rechnen in PROZENT des Zeichenfelds, nicht in Pixeln. Damit
 * braucht die Karte weder feste Groesse noch ResizeObserver: sie folgt ihrer
 * Spalte, und die Marken sitzen als HTML darueber — kein verzerrter viewBox,
 * keine Ellipsen aus Kreisen, keine ungleichen Strichstaerken.
 *
 * Die Konfidenz-Domaene reicht eine halbe Stufe ueber beide Enden hinaus. So
 * sitzt jede Stufe in der MITTE ihrer Spalte statt am Rand, und die Punkte der
 * Randstufen kleben nicht an der Kante.
 */
const toX = scaleLinear()
  .domain([0.5, CONFIDENCE_MAX + 0.5])
  .range([0, 100])
  .clamp(true);

/*
 * Die Score-Achse laeuft ueber die VOLLE Skala 0–100, obwohl heute kein Buendel
 * unter 50 liegt. Ein auf die Daten zugeschnittener Ausschnitt macht aus zehn
 * Punkten Abstand einen halben Bildschirm — dieselbe Uebertreibung, die eine
 * abgeschnittene Achse in jedem Diagramm erzeugt. Der leere untere Bereich ist
 * kein verschenkter Platz, sondern die Aussage "so tief steht nichts", und die
 * Achse bleibt dieselbe wie an Ring und Kachel.
 */
const toY = scaleLinear()
  .domain([SCORE_MIN, SCORE_MAX])
  .range([100, 0])
  .clamp(true);

/** Die Trennung liegt zwischen den Stufen, nicht auf einer. */
const DIVIDER_X = toX(CONFIDENCE_SOLID - 0.5);

/**
 * Die Buendel, auf die es ankommt: belastbar gemessen UND am weitesten unten.
 * Rangfolge statt Schwelle — siehe FOCUS_COUNT.
 */
function toFocusIds(bundles: readonly Bundle[]): ReadonlySet<string> {
  return new Set(
    bundles
      .filter((bundle) => bundle.confidence >= CONFIDENCE_SOLID)
      .toSorted((left, right) => left.score - right.score)
      .slice(0, FOCUS_COUNT)
      .map((bundle) => bundle.id),
  );
}

interface BundlePointProps {
  bundle: Bundle;
  isFocus: boolean;
  index: number;
  isActive: boolean;
  onActivate: (id: string | null) => void;
  onOpenBundle?: (id: string) => void;
}

function BundlePoint({
  bundle,
  isFocus,
  index,
  isActive,
  onActivate,
  onOpenBundle,
}: BundlePointProps) {
  const motionPreset = useMotionPreset();
  const tooltipId = useId();
  const x = toX(bundle.confidence);
  const y = toY(bundle.score);
  const category = categoryNameById(bundle.categoryId);

  /*
   * Beschriftung nach aussen: rechts von der Marke, ausser in der rechten
   * Spalte — dort liefe sie aus dem Feld heraus und legte sich auf den Rand.
   */
  const labelLeft = x >= 80;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <motion.div
        variants={motionPreset.fadeRise}
        custom={index}
        className="relative grid size-6 place-items-center"
      >
        {/*
         * TODO(L3-Buendelansicht): oeffnet spaeter das Buendel mit seinen
         * Markern. Bis dahin ist die Schaltflaeche der Griff fuer Tooltip und
         * Tastatur — sie ist groesser als die Marke, damit man sie trifft.
         */}
        <button
          type="button"
          aria-label={`Bündel ${bundle.id}, ${bundle.name}, ${category}, Score ${bundle.score} von ${SCORE_MAX}, Konfidenz ${bundle.confidence} von ${CONFIDENCE_MAX}${
            isFocus ? ", Ansatzpunkt: belastbar gemessen und weit unten" : ""
          }`}
          aria-describedby={isActive ? tooltipId : undefined}
          onMouseEnter={() => onActivate(bundle.id)}
          onMouseLeave={() => onActivate(null)}
          onFocus={() => onActivate(bundle.id)}
          onBlur={() => onActivate(null)}
          onClick={() => onOpenBundle?.(bundle.id)}
          className="focus-visible:outline-ring absolute inset-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
        />

        {/*
         * EIN Ton fuer alle Marken. Betont wird ueber GROESSE und den Akzent
         * zusammen — der Akzent allein waere Farbe als einziges Signal.
         */}
        <span
          aria-hidden="true"
          className={cn(
            "rounded-full",
            isFocus ? "bg-brand size-3" : "bg-map-mark size-2",
          )}
        />

        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap",
            labelLeft ? "right-full mr-1.5 text-right" : "left-full ml-1.5",
            isFocus
              ? "text-foreground text-xs font-medium"
              : "text-faint text-3xs tabular-nums",
          )}
        >
          {isFocus ? bundle.name : bundle.id}
        </span>

        {isActive ? (
          <div
            id={tooltipId}
            role="tooltip"
            className={cn(
              "border-border bg-popover shadow-card pointer-events-none absolute z-20 w-max rounded-lg border px-3 py-2",
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

export interface BundleMapProps {
  bundles: readonly Bundle[];
  onOpenBundle?: (id: string) => void;
  className?: string;
}

/** Leerzustand: Buendel entstehen erst mit der ersten Auswertung. */
function EmptyBundles({ className }: { className?: string }) {
  return (
    <section
      className={cn("surface-card rounded-2xl p-6", className)}
      aria-label="Bündel-Landkarte"
    >
      <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Bündel-Landkarte
      </p>
      <p className="text-foreground mt-3 text-sm font-medium">
        Noch keine Bündel
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Sobald dein erster Bluttest ausgewertet ist, steht hier jedes Bündel mit
        seinem Score und seiner Konfidenz.
      </p>
    </section>
  );
}

export function BundleMap({
  bundles,
  onOpenBundle,
  className,
}: BundleMapProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  if (bundles.length === 0) {
    return <EmptyBundles className={className} />;
  }

  const focusIds = toFocusIds(bundles);

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
        Bündel-Landkarte
      </h2>
      <p className="text-muted-foreground max-w-measure text-2xs mt-1">
        Jedes Bündel nach Score (senkrecht) und Konfidenz (waagerecht).
        Hervorgehoben sind die drei niedrigsten Bündel mit belastbarer Datenlage
        — dort lohnt sich Arbeit zuerst.
      </p>

      <p className="text-muted-foreground text-2xs mt-6">Score</p>

      <div className="mt-1 flex gap-2">
        {/* Achsenbeschriftung ausserhalb des Feldes: im Feld saesse sie unter
         * den Marken und liesse jede Zahl zweimal lesen. */}
        <div aria-hidden="true" className="relative h-80 w-8 shrink-0">
          {SCORE_GRID.map((score) => (
            <span
              key={score}
              className="text-faint text-3xs absolute right-0 -translate-y-1/2 tabular-nums"
              style={{ top: `${toY(score)}%` }}
            >
              {score}
            </span>
          ))}
        </div>

        <div className="relative h-80 flex-1">
          {/*
           * Raster und Trennung stehen ab dem ersten Frame. Sie sind das Feld,
           * nicht der Inhalt — ein Koordinatenfeld, das sich erst aufbaut,
           * laesst die Punkte im Nichts landen. preserveAspectRatio="none"
           * dehnt die Linien auf das Feld, non-scaling-stroke haelt sie dabei
           * ueberall gleich duenn.
           */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
          >
            {SCORE_GRID.map((score) => (
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

          <span
            aria-hidden="true"
            className="text-faint text-3xs absolute top-0 ml-1.5"
            style={{ left: `${DIVIDER_X}%` }}
          >
            ab hier belastbar
          </span>

          {bundles.map((bundle, position) => (
            <BundlePoint
              key={bundle.id}
              bundle={bundle}
              isFocus={focusIds.has(bundle.id)}
              /* Die Karte ist Element 0 der Reihe, die Punkte folgen ihr. */
              index={position + 1}
              isActive={activeId === bundle.id}
              onActivate={setActiveId}
              onOpenBundle={onOpenBundle}
            />
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

      <BundleTable bundles={bundles} focusIds={focusIds} />
    </motion.section>
  );
}

interface BundleTableProps {
  bundles: readonly Bundle[];
  focusIds: ReadonlySet<string>;
}

/*
 * Die Tabelle ist keine Beilage, sondern die zweite Lesart derselben Daten:
 * fuer Screenreader, fuer die Tastatur, fuer alle, die Zahlen lieber lesen als
 * schaetzen — und sie loest nebenbei die Nummern am Punkt in Namen auf.
 */
function BundleTable({ bundles, focusIds }: BundleTableProps) {
  return (
    <table className="mt-8 w-full text-left">
      <caption className="text-muted-foreground text-2xs mb-2 text-left">
        Alle Bündel als Tabelle — dieselben Werte wie in der Karte.
      </caption>
      <thead>
        <tr className="text-muted-foreground text-2xs">
          <th
            scope="col"
            className="py-1 font-semibold tracking-wide uppercase"
          >
            Bündel
          </th>
          <th
            scope="col"
            className="py-1 font-semibold tracking-wide uppercase"
          >
            Kategorie
          </th>
          <th
            scope="col"
            className="py-1 text-right font-semibold tracking-wide uppercase"
          >
            Score
          </th>
          <th
            scope="col"
            className="py-1 text-right font-semibold tracking-wide uppercase"
          >
            Konfidenz
          </th>
        </tr>
      </thead>
      <tbody>
        {bundles.map((bundle) => (
          <tr key={bundle.id} className="border-border border-t">
            <th
              scope="row"
              className="text-foreground py-1.5 text-xs font-medium"
            >
              <span className="text-muted-foreground tabular-nums">
                {bundle.id}
              </span>{" "}
              {bundle.name}
              {focusIds.has(bundle.id) ? (
                /* Wort UND Akzent: in der Tabelle traegt die Betonung dieselbe
                 * Aussage wie in der Karte, nur ausgeschrieben. */
                <span className="text-brand text-2xs ml-2 font-medium">
                  Ansatzpunkt
                </span>
              ) : null}
            </th>
            <td className="text-muted-foreground py-1.5 text-xs">
              {categoryNameById(bundle.categoryId)}
            </td>
            <td className="text-foreground py-1.5 text-right text-xs tabular-nums">
              {bundle.score}
            </td>
            <td className="text-foreground py-1.5 text-right text-xs tabular-nums">
              {bundle.confidence} / {CONFIDENCE_MAX}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
