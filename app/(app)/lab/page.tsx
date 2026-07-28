import type { Metadata } from "next";

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
  sampleSupplements,
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

      {/* Das Bereichsfeld braucht die volle Inhaltsbreite: vier Spalten mit
       * Ring, Halbsatz, Datenlage und den Befundzeilen darunter. Es ersetzt die
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

      {/* Die Entwicklung braucht die volle Bento-Breite: die Linie muss Strecke
       * haben, sonst ist ihre Steigung eine Behauptung, und die drei Chips
       * stehen darunter in einer Reihe. Sie ersetzt Verlauf UND
       * Aufschluesselung — beide beantworteten dieselbe Frage. */}
      <div className="max-w-map-column">
        <ProgressionPanel
          score={sampleScore}
          categories={sampleCategorySeries}
          changes={sampleMarkerChanges}
        />
      </div>

      {/* Die Praeparate-Liste braucht die volle Bento-Breite: Name, Marker,
       * Zeitleiste, Delta und Status stehen in einer Zeile. */}
      <div className="max-w-map-column">
        <SupplementPanel supplements={sampleSupplements} />
      </div>
    </div>
  );
}
