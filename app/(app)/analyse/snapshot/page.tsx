import type { Metadata } from "next";

import {
  AnalysisBoard,
  sampleBundles,
  sampleCategories,
  sampleCategorySeries,
  sampleMarkerChanges,
  sampleScore,
  sampleSupplements,
} from "@/features/analysis";

export const metadata: Metadata = {
  title: "Snapshot",
};

/*
 * Der Snapshot ist der Einstieg in die Analyse: der Stand nach dem letzten
 * Test, in einem Zug lesbar. Die Route bleibt duenn und serverseitig — sie
 * setzt den Seitenkopf und reicht die Daten an das Bento weiter; Anordnung und
 * Auftritt liegen in features/analysis.
 *
 * Die Daten sind noch ein Mock aus features/analysis/sample-data.ts
 * (⚠️ Scores, Zielwert und Limiter sind Platzhalter) und wandern spaeter hinter
 * eine Repository-Abfrage. Ein Auth-Guard fuer (app) kommt in einer spaeteren
 * Stufe dazu.
 */
export default function AnalyseSnapshotPage() {
  return (
    <div className="space-y-8">
      {/* Nur der Text bekommt eine Lesebreite — das Raster darunter nicht. */}
      <header className="max-w-measure">
        <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
          Analyse · Snapshot
        </p>
        <h1 className="text-foreground mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Deine Auswertung
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Was aus deinem letzten Bluttest folgt: dein Score, die vier
          Kategorien, die Bündel, an denen Arbeit sich zuerst lohnt — und ob
          wirkt, was du nimmst. Alle Zahlen sind Platzhalter.
        </p>
      </header>

      <AnalysisBoard
        score={sampleScore}
        categories={sampleCategories}
        bundles={sampleBundles}
        categorySeries={sampleCategorySeries}
        markerChanges={sampleMarkerChanges}
        supplements={sampleSupplements}
      />
    </div>
  );
}
