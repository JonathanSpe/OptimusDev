import type { Metadata } from "next";

import { mockSupplements } from "@/data/mock";
import {
  BundleFocus,
  CategoryFocus,
  CategoryFocusTable,
  ProgressionPanel,
  ScoreHero,
  SupplementPanel,
  sampleBundles,
  sampleCategories,
  sampleCategorySeries,
  sampleMarkerChanges,
  sampleScore,
} from "@/features/analysis";

/*
 * TEMPORAER: Werkbank fuer die Gestaltung der ANALYSE-Oberflaeche. Was hier
 * fertig wird, zieht nach /analyse um; danach faellt die Route weg. Die
 * Biomarker-Kacheln sind ausgezogen — sie stehen jetzt auf dem Dashboard.
 */
export const metadata: Metadata = {
  title: "Design-Labor",
  robots: { index: false, follow: false },
};

export default function LabPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-measure">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          Design-Labor
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Bausteine der Analyse-Oberfläche. Alle Zahlen sind Platzhalter und
          entstehen aus keiner Berechnung.
        </p>
      </header>

      {/*
       * Jeder Baustein bekommt hier die Breite, die er im Analyse-Bento haben
       * wird: die Score-Kachel ihre Spalte, die Kategorie-Ringe die schmalere
       * daneben. NUR im Labor — die Komponenten selbst bleiben fluid und
       * richten sich nach ihrem Elternteil. Eine Breite in der Komponente waere
       * eine Annahme ueber ein Layout, das sie nicht kennt.
       */}
      {/* Die Score-Kachel in ihrer schmalen Spur — so steht sie in Zeile 1. */}
      <div className="max-w-score-column-narrow">
        <ScoreHero score={sampleScore} />
      </div>

      {/* DIESELBE Kachel ueber die ganze Breite: ab 32rem Kachelbreite legt sie
       * sich hin (Zahl, Pille und Kurve in einer Reihe). Genau diese Form nimmt
       * sie an, wenn das Fenster fuer zwei Spalten nicht reicht und sie ueber
       * dem Bereichsfeld liegt. */}
      <ScoreHero score={sampleScore} />

      {/* Das Bereichsfeld als 2x2: je Quadrant Ring, Kurzname, Bewegung,
       * Datenlage und darunter die Befunde des Bereichs. Es ersetzt die
       * Kategorien-Kachel UND die Ansatzpunkte-Liste — beide beantworteten
       * dieselbe Frage. */}
      <CategoryFocus categories={sampleCategories} bundles={sampleBundles} />
      <CategoryFocusTable
        categories={sampleCategories}
        bundles={sampleBundles}
      />

      {/* Die Landkarte bleibt als Baustein: der Snapshot zeigt sie nicht mehr,
       * eine spaetere Detailansicht schon. Flaeche und Rangfolge stehen
       * nebeneinander und nehmen zusammen die volle Inhaltsbreite. */}
      <BundleFocus bundles={sampleBundles} />

      {/* Die Entwicklung in der HALBEN Bento-Breite — so steht sie in Zeile 2.
       * Neben dem Feld liegt die Beschriftungsspur; wird die Kachel schmaler als
       * Spur plus 200px Feld, rutschen die Beschriftungen unter das Feld. Sie
       * ersetzt Verlauf UND Aufschluesselung — beide beantworteten dieselbe
       * Frage. */}
      <div className="max-w-map-column">
        <ProgressionPanel
          score={sampleScore}
          categories={sampleCategorySeries}
          changes={sampleMarkerChanges}
        />
      </div>

      {/* Die Praeparate-Liste in derselben halben Breite: ab 32rem Kachelbreite
       * traegt ihre Zeile vier Spalten (Kapsel, Name, Beobachtet, Status). */}
      <div className="max-w-map-column">
        <SupplementPanel supplements={mockSupplements} />
      </div>
    </div>
  );
}
