import { cn } from "@/lib/utils";

import type {
  Bundle,
  CategoryScore,
  CategorySeries,
  MarkerChange,
  ScoreSummary,
  Supplement,
} from "../sample-data";
import { BundleFocus } from "./bundle-focus";
import { CategoryDialPanel } from "./category-dial";
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
 *   Spalten und nie als Pixel — eine Kachel weiss dadurch nicht, wie breit sie
 *   ist, sondern nur, welchen Anteil sie hat.
 *
 *   Die KACHEL hoert auf sich selbst. Jede ist ein Container und richtet sich
 *   nach ihrer eigenen Breite ein. Das ist der Grund, warum drei Stufen
 *   genuegen, wo sonst fuenf noetig waeren: auf einem 1920er Schirm ist die
 *   Praeparate-Kachel SCHMAL (fuenf von zwoelf Spalten neben der Kontext-
 *   Leiste), waehrend dieselbe Kachel auf einem 1000er Schirm ueber die volle
 *   Breite laeuft. Ein Fenster-Breakpoint kann das nicht wissen.
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
 * Die Auftrittsreihe ist die LESEREIHE: Score, Ringe, Landkarte, Entwicklung,
 * Praeparate. Die Zahl ist ein Platz in EINER Reihe, die Verzoegerung dazu
 * kommt aus lib/motion (40 ms je Platz). Fuenf Plaetze sind 160 ms — die Seite
 * steht damit innerhalb des Stagger-Budgets von 240 ms vollstaendig da.
 *
 * Jede Kachel bringt ihren eigenen Auftritt mit und behaelt ihn; sie bekommt
 * hier nur ihren Platz. Was INNERHALB einer Kachel gestaffelt ist (Ringe,
 * Chips, Zeilen), bleibt eine Reihe fuer sich — sonst liefe der Deckel bei
 * sechs Elementen gegen die letzte Kachel und flachte ihre Liste ein.
 */
const ENTRANCE = {
  score: 0,
  categories: 1,
  bundles: 2,
  progression: 3,
  supplements: 4,
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
      {/* Zeile 1 — der Stand: wo du stehst und woraus er sich zusammensetzt.
       * ("Befund" ist seit der Sprachrunde das sichtbare Wort fuer ein Bundle
       * und wird hier deshalb nicht mehr allgemein verwendet.) */}
      <ScoreHero
        score={score}
        index={ENTRANCE.score}
        className="bento:col-span-5 col-span-12"
      />
      <CategoryDialPanel
        categories={categories}
        index={ENTRANCE.categories}
        className="bento:col-span-7 col-span-12"
      />

      {/*
       * Zeile 2 — die Landkarte, immer ueber die volle Breite. Sie ist die
       * einzige Kachel, die den Platz wirklich braucht: zehn Punkte mit drei
       * dauerhaften Beschriftungen liegen sonst uebereinander. Die Tabelle
       * unter der Kachel bringt der Baustein selbst mit.
       */}
      <BundleFocus
        bundles={bundles}
        index={ENTRANCE.bundles}
        className="col-span-12"
      />

      {/* Zeile 3 — die Bewegung und was sie bewirkt hat. */}
      <ProgressionPanel
        score={score}
        categories={categorySeries}
        changes={markerChanges}
        index={ENTRANCE.progression}
        className="bento-wide:col-span-7 col-span-12"
      />
      <SupplementPanel
        supplements={supplements}
        index={ENTRANCE.supplements}
        className="bento-wide:col-span-5 col-span-12"
      />
    </div>
  );
}
