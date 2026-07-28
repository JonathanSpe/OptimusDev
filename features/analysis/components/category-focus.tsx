"use client";

import { motion } from "motion/react";
import { useId } from "react";

import { PanelExplainer } from "@/components/common/panel-explainer";
import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { toCategoryBundles, toEvidenceLevel, toFocusRanks } from "../rules";
import {
  SCORE_MAX,
  categoryNameById,
  type Bundle,
  type CategoryScore,
} from "../sample-data";
import { CategoryRing, ConfidenceDots, toRingLabel } from "./category-ring";
import { ScoreDelta } from "./score-delta";

/*
 * ============================================================================
 * DEINE VIER BEREICHE — EINE Kachel, vier Quadranten, in jedem eine Antwort.
 * ============================================================================
 * Hier stand vorher zweierlei: ein Raster mit vier Ringen und daneben eine
 * Liste mit drei Ansatzpunkten. Beide beantworteten dieselbe Frage — wo stehe
 * ich, und wo lohnt sich Arbeit — und ueberliessen die Verbindung dem Leser: er
 * las "Regeneration 61", suchte in der Liste nach dem Grund und musste sich
 * dabei merken, welche Kategorie das war. Steht der Befund UNTER seinem Ring,
 * gibt es nichts mehr zu suchen.
 *
 * VIER QUADRANTEN, NICHT VIER SPALTEN. Die Kachel steht neben der Score-Spalte
 * und ist damit breiter als hoch, aber nicht vier Befundlisten breit: in vier
 * Spalten stand jede Liste in 160px, und "B-Vitamine & Homocystein" brauchte
 * dort zwei Zeilen fuer einen Namen. Im 2x2 ist eine Spalte doppelt so breit,
 * jeder Befund steht einzeilig, und die Kachel wird dabei nicht hoeher als die
 * Score-Kachel neben ihr — die Hoehe war ohnehin da, sie stand nur leer.
 *
 * ⚠️ UI-WORT UND FACHBEGRIFF SIND ENTKOPPELT. Im Code, im Vertrag und in den
 * Daten heisst die Einheit weiter `Bundle` — sichtbar heisst sie "Befund"
 * (Mehrzahl "Befunde"), und "Bündel" kommt in keinem sichtbaren Text und in
 * keinem aria-label vor. Dieselbe Trennung gilt fuer `confidence`, das sichtbar
 * "Datenlage" heisst; die Felder umzubenennen waere eine Vertragsaenderung fuer
 * eine Textentscheidung.
 *
 * DREI KANAELE, und keiner rechnet in den anderen hinein:
 *   der Ring       — der Score der Kategorie, gemessen am letzten Test
 *   die Punkte     — wie belastbar diese Aussage ist
 *   die Zeilen     — die Befunde darunter, der staerkste zuerst
 *
 * Betont sind ausschliesslich die drei Ansatzpunkte, und die Auswahl kommt aus
 * derselben Regel wie ueberall (toFocusEntries in rules.ts). Sie ist eine
 * RANGFOLGE und keine Schwelle: die Nummer sagt nicht "das ist schlecht",
 * sondern "hier zuerst". Deshalb liegt in einer Spalte auch mal kein
 * Ansatzpunkt, obwohl dort ein niedriger Score steht — bei duenner Datenlage
 * empfiehlt die Analyse nichts.
 */

/*
 * DIE ERKLAERUNG DER KACHEL — hinter dem ⓘ am Kopf, einmal im Code.
 *
 * Sie fasst zusammen, was vorher als Vorspann UND als Fusszeile dastand: der
 * Ring, der Strich, die Punkte, die Nummer. Das sind vier Notationen, und eine
 * Notation muss irgendwo in Worten stehen — aber nicht ueber dem Inhalt, den sie
 * beschreibt. Wer das Feld einmal gelesen hat, braucht sie nie wieder.
 */
const FIELD_EXPLAINER =
  "Der Ring zeigt den Score des Bereichs, der Strich darauf den Stand beim letzten Test — ein voller Ring ist besser. Die Punkte daneben sagen, wie belastbar die Datenlage ist. Rot numeriert sind die drei Ansatzpunkte: dort lohnt sich Arbeit zuerst.";

export interface CategoryFocusProps {
  categories: readonly CategoryScore[];
  /** Alle Befunde. Welcher unter welchem Ring steht, entscheidet rules.ts. */
  bundles: readonly Bundle[];
  /**
   * Platz in der Auftrittsreihe der SEITE. Er verzoegert nur den Auftritt der
   * Kachel; die Reihe der Ringe und Zeilen darin bleibt ihre eigene.
   */
  index?: number;
  onOpenFinding?: (id: string) => void;
  className?: string;
}

/**
 * Der Kopf der Kachel: Titel links, ⓘ rechts. Er steht als eigenes Bauteil da,
 * damit der Leerzustand denselben Kopf traegt wie die gefuellte Kachel — sonst
 * verschwindet die Erklaerung genau dann, wenn sie am meisten gebraucht wird.
 */
function FieldHeading({ id }: { id?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      {/* "vier" steht im Titel, weil das Modell vier Bewertungs-Kategorien hat
       * (K1–K4). Kommt je eine fuenfte hinzu, aendert sich hier ein Wort. */}
      <h2
        id={id}
        className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase"
      >
        Deine vier Bereiche
      </h2>
      <PanelExplainer
        label="Was die vier Bereiche zeigen"
        className="-mt-1 -mr-1"
      >
        {FIELD_EXPLAINER}
      </PanelExplainer>
    </div>
  );
}

/** Leerzustand: Bereiche und Befunde entstehen erst mit der ersten Auswertung. */
function EmptyCategoryFocus({ className }: { className?: string }) {
  return (
    <section
      aria-label="Deine vier Bereiche"
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <FieldHeading />
      <p className="text-foreground mt-4 text-sm font-medium">
        Noch keine Bereiche
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Sobald dein erster Bluttest ausgewertet ist, steht hier je Bereich ein
        Score samt Datenlage — und darunter die Befunde, die dazu geführt haben.
      </p>
    </section>
  );
}

function toFindingLabel(bundle: Bundle, rank: number | undefined): string {
  return [
    rank === undefined ? bundle.name : `Ansatzpunkt ${rank}: ${bundle.name}`,
    categoryNameById(bundle.categoryId),
    `Score ${bundle.score} von ${SCORE_MAX}`,
    `Datenlage ${toEvidenceLevel(bundle.confidence)}`,
  ].join(", ");
}

interface FindingRowProps {
  bundle: Bundle;
  /** Rang unter den Ansatzpunkten; undefined = keiner, also keine Betonung. */
  rank?: number;
  index: number;
  onOpen?: (id: string) => void;
}

function FindingRow({ bundle, rank, index, onOpen }: FindingRowProps) {
  const motionPreset = useMotionPreset();
  const isFocus = rank !== undefined;

  return (
    <motion.li variants={motionPreset.fadeRise} custom={index}>
      {/*
       * Die Zeile ist eine Schaltflaeche, obwohl sie heute nichts oeffnet. Der
       * Grund ist die Tastatur: ohne Schaltflaeche gaebe es keinen Fokus, und
       * ohne Fokus keine Anhebung fuer alle, die nicht mit der Maus arbeiten.
       * Ein fokussierbares div waere derselbe Knopf ohne Semantik.
       *
       * TODO(L3-Befundansicht): oeffnet spaeter den Befund (Marker, Herleitung,
       * offene Fragen). Bis dahin bleibt onOpen leer.
       */}
      <button
        type="button"
        aria-label={toFindingLabel(bundle, rank)}
        onClick={() => onOpen?.(bundle.id)}
        className={cn(
          "focus-visible:outline-ring flex w-full items-start gap-1.5 rounded-lg px-1.5 py-1.5 text-left ring-1 ring-transparent transition focus-visible:outline-2 focus-visible:outline-offset-2",
          /*
           * Die Anhebung um einen Pixel plus eine Kante — kein Farbwechsel:
           * Text, den man gerade liest, darf nicht umspringen, weil die Maus
           * darueber faehrt. Bei reduzierter Bewegung bleibt die Kante, der
           * Weg faellt weg.
           */
          "hover:ring-border focus-visible:ring-border motion-reduce:transition-none",
          "motion-safe:hover:-translate-y-px motion-safe:focus-visible:-translate-y-px",
          "hover:bg-muted",
        )}
      >
        {/*
         * EINE Zelle fuer beide Marken, damit die Namen aller Zeilen einer
         * Spalte auf derselben Linie beginnen — die Scheibe des Ansatzpunkts
         * fuellt sie, das Listenzeichen sitzt darin zentriert. Waere die Zelle so
         * gross wie ihr Inhalt, ruecke der Name genau in der betonten Zeile nach
         * rechts, und die Spalte haette zwei Textkanten.
         *
         * Scheibe und Ziffer haben dieselben Masse wie die Rangscheibe der
         * Landkarte (size-5, text-2xs): es ist dieselbe Nummer aus derselben
         * Auswahl, und Weiss auf der Marke haelt in beiden Modi AA.
         *
         * DIE SCHEIBE MARKIERT ALLEIN — die weiche Warnflaeche hinter der Zeile
         * ist weg. Drei getoente Zeilen in einem Feld aus zehn waren eine
         * Flaeche, und eine Flaeche in Warnfarbe liest sich als Urteil ueber den
         * Wert. Gemeint ist eine Rangfolge ("hier zuerst"), und die traegt die
         * Nummer: sie ist ein Zeichen, kein Farbton, und deshalb auch ohne Farbe
         * lesbar.
         */}
        <span
          aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center"
        >
          {isFocus ? (
            <span className="bg-brand text-on-brand text-2xs grid size-5 place-items-center rounded-full font-semibold tabular-nums">
              {rank}
            </span>
          ) : (
            <span className="bg-finding-mark size-1.5 rounded-full" />
          )}
        </span>

        {/*
         * Kein truncate: ein abgeschnittener Befundname ist kein Befund mehr.
         * Passt er nicht in eine Zeile, bricht er um — die Zeile wird hoeher,
         * der Score bleibt oben rechts an der ersten Zeile stehen.
         */}
        <span
          aria-hidden="true"
          className={cn(
            "text-foreground min-w-0 flex-1 text-xs leading-4",
            isFocus ? "font-semibold" : "font-normal",
          )}
        >
          {bundle.name}
        </span>

        <span
          aria-hidden="true"
          className={cn(
            "text-foreground shrink-0 text-xs leading-4 tabular-nums",
            isFocus ? "font-semibold" : "font-medium",
          )}
        >
          {bundle.score}
        </span>
      </button>
    </motion.li>
  );
}

interface AreaColumnProps {
  category: CategoryScore;
  bundles: readonly Bundle[];
  ranks: ReadonlyMap<string, number>;
  /** Platz des RINGS in der Reihe der Kachel; die Zeilen folgen ihm. */
  index: number;
  onOpenFinding?: (id: string) => void;
}

function AreaColumn({
  category,
  bundles,
  ranks,
  index,
  onOpenFinding,
}: AreaColumnProps) {
  const findings = toCategoryBundles(bundles, category.id);
  /* Der Ring hat GENAU EINEN Bezug: den letzten Test. Ohne Vorwert gibt es
   * keine Bewegung — dann steht dort nichts statt einer erfundenen Null. */
  const delta =
    category.previousScore === undefined
      ? null
      : category.score - category.previousScore;

  return (
    <div className="flex flex-col">
      {/*
       * Der Kopf des Quadranten: Ring links, drei Zeilen rechts — Name,
       * Bewegung, Datenlage. Die drei Zeilen sind zusammen genau so hoch wie der
       * Ring (3 x leading-4 plus zwei Abstaende = 56px), und daran haengt die
       * Vergleichbarkeit der vier Quadranten: alle vier Befundlisten fangen auf
       * derselben Linie an, ohne dass eine Hoehe reserviert werden muesste.
       *
       * DER KURZE NAME steht hier, nicht der lange. In einem Quadranten ist der
       * Name eine Beschriftung ueber einer Zahl, und "Regeneration &
       * Hormonbalance" bricht dort um — der Umbruch verschiebt die Datenlage
       * eine Zeile nach unten und damit den Anfang der Liste. Der VOLLE Name
       * steht in der Beschriftung der Gruppe, in der Tabelle darunter und
       * ueberall, wo der Bereich Subjekt ist.
       *
       * Die Beschriftung der Gruppe ist dieselbe wie an der Zelle der
       * Kategorien-Kachel — ein Ring, eine Aussage, egal wo er steht.
       */}
      <div
        role="group"
        aria-label={toRingLabel(category)}
        className="flex gap-2.5"
      >
        <CategoryRing
          score={category.score}
          previousScore={category.previousScore}
          index={index}
          size="compact"
        />
        <div className="min-w-0 flex-1">
          <p
            aria-hidden="true"
            className="text-foreground text-xs leading-4 font-semibold"
          >
            {category.shortName}
          </p>
          {/*
           * Die Bewegung ist die Angabe, die der Ring NICHT machen kann: der
           * Strich zeigt, WO der letzte Test lag, aber nicht, um wie viel es
           * seither weiterging. Sie steht deshalb hier in Zahl und Pfeil — und
           * an der Stelle, an der vorher ein Halbsatz stand, der die Kategorie
           * erklaerte. Ein Bereich, der seinen Namen nicht selbst erklaert,
           * braucht mehr als vier Woerter; der Score braucht seine Bewegung.
           */}
          <p className="text-2xs mt-1 leading-4 font-medium">
            {delta === null ? (
              <span className="text-muted-foreground">erster Test</span>
            ) : (
              <ScoreDelta delta={delta} />
            )}
          </p>
          <ConfidenceDots confidence={category.confidence} className="mt-1" />
        </div>
      </div>

      {findings.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-xs">
          Noch keine Befunde in diesem Bereich.
        </p>
      ) : (
        <ul
          aria-label={`Befunde in ${category.name}`}
          className="mt-4 space-y-0.5"
        >
          {findings.map((bundle, position) => (
            <FindingRow
              key={bundle.id}
              bundle={bundle}
              rank={ranks.get(bundle.id)}
              /* Die Zeilen einer Spalte laufen ihrem Ring nach. Der Deckel in
               * lib/motion faengt ab, dass die letzte Spalte dadurch aus dem
               * Budget faellt — alles ab Platz 6 kommt gemeinsam an. */
              index={index + 1 + position}
              onOpen={onOpenFinding}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function CategoryFocus({
  categories,
  bundles,
  index = 0,
  onOpenFinding,
  className,
}: CategoryFocusProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();

  if (categories.length === 0) {
    return <EmptyCategoryFocus className={className} />;
  }

  const ranks = toFocusRanks(bundles);

  return (
    <motion.section
      variants={motionPreset.fadeRise}
      custom={index}
      initial="hidden"
      animate="visible"
      aria-labelledby={titleId}
      /*
       * Die Karte ist ihr eigener Container: ob vier Spalten nebeneinander
       * stehen, 2x2 oder untereinander, entscheidet IHRE Breite (area-grid).
       *
       * Als flex-Spalte, damit der Zuwachs der Zeile ans FELD geht und nicht als
       * Loch unter die Legende: die Karte ist so hoch wie die Score-Kachel
       * neben ihr, und was uebrig bleibt, verlaengert die Haarlinien zwischen den
       * Spalten. Die Legende bleibt dabei unten am Rand stehen, wo sie hingehoert.
       */
      className={cn(
        "surface-card @container flex flex-col rounded-2xl p-6",
        className,
      )}
    >
      <FieldHeading id={titleId} />

      <div className="area-grid mt-5 flex-1">
        {categories.map((category, position) => (
          <AreaColumn
            key={category.id}
            category={category}
            bundles={bundles}
            ranks={ranks}
            /* Die Karte selbst ist Element 0 der Reihe, die Ringe folgen ihr. */
            index={position + 1}
            onOpenFinding={onOpenFinding}
          />
        ))}
      </div>

      {/*
       * KEINE LEGENDE MEHR UNTER DEM FELD. Was der Ring, der Strich, die Punkte
       * und die Nummer bedeuten, steht hinter dem ⓘ am Kopf — eine Notation
       * muss in Worten stehen, aber nicht als Absatz unter jeder Kachel.
       *
       * WAS BLEIBT, IST DER BEFUND: dass heute kein Ansatzpunkt markiert ist,
       * kommt aus den DATEN und nicht aus der Gestaltung. Ohne diesen Satz
       * suchte der Leser eine Markierung, die es nicht gibt, und hielte das
       * Fehlen fuer einen Fehler. Sobald einer markiert ist, spricht die
       * Markierung fuer sich und der Satz verschwindet.
       */}
      {ranks.size === 0 ? (
        <p className="text-muted-foreground max-w-measure text-2xs mt-5">
          Heute ist bei keinem Befund die Datenlage gut genug für einen
          Ansatzpunkt — deshalb ist keiner numeriert.
        </p>
      ) : null}
    </motion.section>
  );
}

export interface CategoryFocusTableProps {
  categories: readonly CategoryScore[];
  bundles: readonly Bundle[];
  className?: string;
}

/**
 * Dieselben Daten in Zeilen — der vollstaendige, lineare Weg zu denselben
 * Werten. Sie steht UNTER der Kachel und nicht in ihr: ein Umschalter dort
 * machte aus dem Feld eine Ansichtsoption, waehrend die Tabelle draussen das
 * ist, was sie sein soll.
 *
 * Sie folgt der Ordnung des Feldes: Bereich fuer Bereich, darin der staerkste
 * Befund zuerst. Eine andere Reihenfolge waere eine zweite Lesart derselben
 * Auswahl.
 */
export function CategoryFocusTable({
  categories,
  bundles,
  className,
}: CategoryFocusTableProps) {
  const ranks = toFocusRanks(bundles);

  return (
    <details className={cn("max-w-measure", className)}>
      <summary className="text-muted-foreground focus-visible:outline-ring text-2xs w-fit cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
        Alle Befunde als Tabelle
      </summary>
      <table className="mt-3 w-full text-left">
        <caption className="text-muted-foreground text-2xs sr-only">
          Alle Befunde nach Bereich, mit Score, Datenlage und Rang unter den
          Ansatzpunkten — dieselben Werte wie im Feld darüber.
        </caption>
        <thead>
          <tr className="border-border border-b">
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 font-medium"
            >
              Befund
            </th>
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 text-right font-medium"
            >
              Score
            </th>
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 text-right font-medium"
            >
              Datenlage
            </th>
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 text-right font-medium"
            >
              Ansatzpunkt
            </th>
          </tr>
        </thead>
        {categories.map((category) => (
          /* EIN Koerper je Bereich: die Ueberschrift der Gruppe ist eine
           * Zeile mit colspan und kein zweites Feld in jeder Zeile — dieselbe
           * Kategorie zehnmal zu wiederholen ist keine Gliederung. */
          <tbody key={category.id}>
            <tr>
              <th
                scope="colgroup"
                colSpan={4}
                className="text-foreground pt-3 pb-1 text-xs font-semibold"
              >
                {category.name}
                <span className="text-muted-foreground text-2xs ml-2 font-normal">
                  Score {category.score} von {SCORE_MAX} · Datenlage{" "}
                  {toEvidenceLevel(category.confidence)}
                </span>
              </th>
            </tr>
            {toCategoryBundles(bundles, category.id).map((bundle) => (
              <tr key={bundle.id} className="border-border/60 border-b">
                <th
                  scope="row"
                  className="text-foreground py-2 pr-3 text-xs font-normal"
                >
                  {bundle.name}
                </th>
                <td className="text-foreground py-2 text-right text-xs tabular-nums">
                  {bundle.score} von {SCORE_MAX}
                </td>
                {/* Auch hier das Wort und nicht die Stufe: die Tabelle ist die
                 * vollstaendige Fassung derselben Aussage, nicht eine zweite
                 * Skala daneben. */}
                <td className="text-foreground py-2 text-right text-xs">
                  {toEvidenceLevel(bundle.confidence)}
                </td>
                <td className="text-foreground py-2 text-right text-xs tabular-nums">
                  {ranks.get(bundle.id) ?? "–"}
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </details>
  );
}
