import { cn } from "@/lib/utils";

import type {
  Bundle,
  CategoryScore,
  CategorySeries,
  MarkerChange,
  ScoreSummary,
  Supplement,
} from "../sample-data";
import { CategoryFocus, CategoryFocusTable } from "./category-focus";
import { ProgressionPanel } from "./progression-panel";
import { ScoreHero } from "./score-hero";
import { SupplementPanel } from "./supplement-row";

/*
 * ============================================================================
 * DAS BENTO DER ANALYSE — nur Anordnung, keine eigene Gestaltung.
 * ============================================================================
 * Hier steht ausschliesslich, WO eine Kachel liegt und WANN sie auftritt. Wie
 * sie aussieht und was sie sagt, bringt jede Kachel selbst mit; dieser Baustein
 * fasst sie nicht an.
 *
 * ZWEI SCHICHTEN, ZWEI ZUSTAENDIGKEITEN:
 *
 *   Das RASTER hoert auf das Fenster. Zwoelf Spalten, EIN Abstand, und genau
 *   zwei Stufen (bento / bento-wide, siehe app/globals.css). Breiten stehen als
 *   Spalten und nicht als Pixel — eine Kachel weiss dadurch nicht, wie breit
 *   sie ist, sondern nur, welchen Anteil sie hat. EINE Ausnahme, und die ist
 *   begruendet: die Score-Kachel in Zeile 1 hat eine feste Spur, weil ihr
 *   Inhalt bei diesem Mass fertig ist (score-row).
 *
 *   Die KACHEL hoert auf sich selbst. Jede ist ein Container und richtet sich
 *   nach ihrer eigenen Breite ein. Das ist der Grund, warum drei Stufen
 *   genuegen, wo sonst fuenf noetig waeren: auf einem 1920er Schirm ist die
 *   Praeparate-Kachel SCHMAL (fuenf von zwoelf Spalten neben der Kontext-
 *   Leiste), waehrend dieselbe Kachel auf einem 1000er Schirm ueber die volle
 *   Breite laeuft. Ein Fenster-Breakpoint kann das nicht wissen.
 *
 * ============================================================================
 * DIE FARBPOLITIK DER SEITE — eine Sprache, an vier Stellen, sonst grau.
 * ============================================================================
 * Sie steht hier, weil sie keiner einzelnen Kachel gehoert: eine Regel ueber
 * Zurueckhaltung laesst sich nur dort pruefen, wo man alle Kacheln zusammen
 * sieht.
 *
 *   EINE STAFFEL. gut / grenzwertig / kritisch, Schwelle in rules.ts
 *   (toScoreVerdict), Aussehen in score-verdict.tsx. Ringkoepfe, Befundzeilen,
 *   Score-Kachel und Befundtabelle lesen von dort. Eine zweite Schwelle oder
 *   ein zweites Haekchen irgendwo waeren zwei Rangfolgen nebeneinander — der
 *   Fehler, vor dem der Kopf von rules.ts warnt.
 *
 *   DIESELBEN TOENE WIE DIE PRAEPARATE. success / warning / critical, unver-
 *   aendert aus der bestehenden Palette. Die Praeparate-Zeilen lesen sich
 *   deshalb wie vorher — und wer sie gelesen hat, kann das Bereichsfeld ohne
 *   Legende lesen.
 *
 *   GRAU IST DER NORMALFALL. Gefaerbt ist hoechstens eine Stelle je Zeile, und
 *   eine gefuellte Pille tritt nur im Kopf eines Bereichs auf — dort dafuer bei
 *   JEDER Stufe, "gut" eingeschlossen, weil vier Koepfe nebeneinander dieselbe
 *   Form brauchen, um sich vergleichen zu lassen (siehe VerdictChip). Das sind
 *   vier Pillen auf der Seite; die zehn Befundzeilen darunter tragen Zeichen
 *   und Ziffer und sonst nichts.
 *
 *   ZWEI FLAECHEN BLEIBEN GANZ AUSSEN VOR. Die Entwicklung faerbt keine Linie
 *   nach Status ("wohin geht es" ist nicht "wo stehst du"), und die dunkle
 *   Score-Kachel traegt ihr Urteil als Satz — auf ihrem Grund haelt von den drei
 *   Toenen nur success ein AA-Verhaeltnis, und die Palette sollte nicht wachsen.
 *
 *   ROT HAT EINE BEDEUTUNG. Die Rangscheiben der Ansatzpunkte sind deshalb
 *   Graphit statt Markenkarmin: Rang und Urteil sitzen in derselben Zeile, und
 *   zwei Rottoene nebeneinander waeren zwei Bedeutungen fuer eine Farbe.
 *
 * ⚠️ Die Schwellen sind PLATZHALTER und klinisch nicht freigegeben. Bis das
 * geklaert ist, faerbt diese Seite Entwurfswerte ein; die ⓘ-Texte der beiden
 * betroffenen Kacheln sagen es dem Leser.
 *
 * Die Zeilen ziehen sich auf EINE Hoehe (align-items: stretch). Zwei Kacheln
 * nebeneinander, die unten verschieden weit reichen, geben der Zeile eine
 * ausgefranste Kante — und die liest sich als Versehen, nicht als Absicht. Eine
 * gestreckte Kachel bekommt deshalb keine Fuellung untergeschoben: sie verteilt
 * ihre eigenen Bloecke ueber die Hoehe (siehe ScoreHero, oben Score, unten
 * Fusszeile). Feste Hoehen gibt es hier keine.
 *
 * EIN Abstandstoken fuer Spalten UND Zeilen: gap-4. Die Kacheln bringen keine
 * eigenen senkrechten Abstaende mit — sonst laegen zwei Rhythmen uebereinander.
 */

/*
 * Die Auftrittsreihe ist die LESEREIHE: Score, Bereiche, Entwicklung,
 * Praeparate. Die Zahl ist ein Platz in EINER Reihe, die Verzoegerung dazu
 * kommt aus lib/motion (40 ms je Platz). Vier Plaetze sind 120 ms — die Seite
 * steht damit innerhalb des Stagger-Budgets von 240 ms vollstaendig da.
 *
 * Jede Kachel bringt ihren eigenen Auftritt mit und behaelt ihn; sie bekommt
 * hier nur ihren Platz. Was INNERHALB einer Kachel gestaffelt ist (Ringe,
 * Befundzeilen, Linienbeschriftungen), bleibt eine Reihe fuer sich — sonst
 * liefe der Deckel bei sechs Elementen gegen die letzte Kachel und flachte ihre
 * Liste ein.
 */
const ENTRANCE = {
  score: 0,
  categories: 1,
  progression: 2,
  supplements: 3,
} as const;

export interface AnalysisBoardProps {
  score: ScoreSummary;
  categories: readonly CategoryScore[];
  bundles: readonly Bundle[];
  /** Verlauf je Kategorie — die Linien der Entwicklung. */
  categorySeries: readonly CategorySeries[];
  /** Marker-Bewegungen hinter den Kategorien, fuer die Detailflaeche. */
  markerChanges: readonly MarkerChange[];
  supplements: readonly Supplement[];
  className?: string;
}

export function AnalysisBoard({
  score,
  categories,
  bundles,
  categorySeries,
  markerChanges,
  supplements,
  className,
}: AnalysisBoardProps) {
  return (
    <div className={cn("grid grid-cols-12 gap-4", className)}>
      {/*
       * Zeile 1 — der Stand: wo du stehst und woraus er sich zusammensetzt.
       *
       * Sie ist die einzige Zeile mit einer eigenen Spaltenteilung, und zwar
       * keiner aus Zwoelfteln: die Score-Kachel ist eine SPUR fester Breite,
       * das Bereichsfeld bekommt den Rest (score-row in app/globals.css). Ein
       * Anteil des Rasters liess die dunkelste Flaeche des Produkts mit jedem
       * Fenster mitwachsen, ohne dass mehr hineinkam. Unter der Fensterstufe
       * bleibt die Zeile einspaltig — die Kachel steht dann als flache Kachel
       * ueber dem Feld und nimmt diese Form an ihrer eigenen Breite an.
       *
       * ("Befund" ist seit der Sprachrunde das sichtbare Wort fuer ein Bundle
       * und wird hier deshalb nicht mehr allgemein verwendet.)
       */}
      <div className="bento:score-row col-span-12 grid gap-4">
        <ScoreHero score={score} index={ENTRANCE.score} />
        <CategoryFocus
          categories={categories}
          bundles={bundles}
          index={ENTRANCE.categories}
        />
      </div>

      {/*
       * Die Tabellenfassung derselben Befunde — unter der Zeile und nicht in
       * ihr. In der Kachel waere sie ein Umschalter und machte aus dem Feld eine
       * Ansichtsoption; hier ist sie der vollstaendige, lineare Weg zu denselben
       * Werten.
       */}
      <CategoryFocusTable
        categories={categories}
        bundles={bundles}
        className="col-span-12"
      />

      {/*
       * Zeile 2 — die Bewegung und was sie bewirkt hat. ZWEI GLEICHE HAELFTEN,
       * und das ist eine Aussage: 7 zu 5 machte aus der Entwicklung die
       * Hauptkachel und aus den Praeparaten ihre Randspalte. Beide beantworten
       * aber eine eigene Frage — wohin ging es, und wirkt, was du nimmst? —, und
       * keine der beiden ist die Fussnote der anderen.
       *
       * Beide brauchen die Breite auch: die Entwicklung stellt neben ihr Feld
       * eine Beschriftungsspur, die Praeparate-Zeile traegt ab 32rem
       * Kachelbreite ihre vierte Spalte. Bei 5 von 12 fiel die weg.
       */}
      <ProgressionPanel
        score={score}
        categories={categorySeries}
        changes={markerChanges}
        index={ENTRANCE.progression}
        className="bento-wide:col-span-6 col-span-12"
      />
      <SupplementPanel
        supplements={supplements}
        index={ENTRANCE.supplements}
        className="bento-wide:col-span-6 col-span-12"
      />
    </div>
  );
}
