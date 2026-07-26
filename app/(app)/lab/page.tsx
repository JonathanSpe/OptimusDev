import type { Metadata } from "next";

import { ScoreHero, sampleScore } from "@/features/analysis";

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
       * Die Kachel bekommt hier die Breite, die sie im Analyse-Bento haben wird
       * (die Score-Spalte neben den Kategorie-Ringen). NUR im Labor: die
       * Komponente selbst bleibt fluid und richtet sich nach ihrem Elternteil —
       * eine Breite in der Komponente waere eine Annahme ueber ein Layout, das
       * sie nicht kennt.
       */}
      <div className="max-w-score-column">
        <ScoreHero score={sampleScore} />
      </div>
    </div>
  );
}
