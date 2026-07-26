import type { Metadata } from "next";

import {
  BundleMap,
  CategoryDialPanel,
  PriorityCard,
  ProgressChart,
  ScoreHero,
  sampleBundles,
  sampleCategories,
  sampleCategorySeries,
  samplePriorityFindings,
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
      <div className="max-w-score-column">
        <ScoreHero score={sampleScore} />
      </div>

      <div className="max-w-dial-column">
        <CategoryDialPanel categories={sampleCategories} />
      </div>

      <div className="max-w-map-column">
        <BundleMap bundles={sampleBundles} />
      </div>

      {/* Der Verlauf braucht die volle Bento-Breite: fuenf Linien ueber vier
       * Termine, und rechts daneben die Namen an den Linienenden. */}
      <div className="max-w-map-column">
        <ProgressChart score={sampleScore} categories={sampleCategorySeries} />
      </div>

      {/* Die Prioritaetskarte teilt sich die schmalere Bento-Spalte mit den
       * Ringen: sie traegt einen Satz und drei Belege, und ein Satz ueber die
       * volle Breite laesst sich nicht mehr in einem Zug lesen. */}
      <div className="max-w-dial-column">
        <PriorityCard
          bundles={sampleBundles}
          findings={samplePriorityFindings}
        />
      </div>
    </div>
  );
}
