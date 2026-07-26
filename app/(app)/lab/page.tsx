import type { Metadata } from "next";

import {
  CategoryDialPanel,
  ScoreHero,
  sampleCategories,
  sampleLimiterId,
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
        <CategoryDialPanel
          categories={sampleCategories}
          target={sampleScore.target}
          limiterId={sampleLimiterId}
        />
      </div>
    </div>
  );
}
