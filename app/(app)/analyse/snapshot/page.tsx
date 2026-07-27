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
 * KEIN Vorspann unter der Ueberschrift. Ein Absatz, der aufzaehlt, was gleich
 * darunter steht, ist eine Inhaltsangabe der Seite: er kostet die erste
 * Bildschirmhoehe und sagt nichts, was die Kacheln nicht selbst sagen.
 *
 * ⚠️ ALLE ZAHLEN SIND PLATZHALTER — sie sind ein Mock aus
 * features/analysis/sample-data.ts (Scores, Limiter, Wirkfenster) und
 * entstehen aus keiner Berechnung. Der Hinweis steht hier und auf /lab, nicht
 * auf der Seite: sichtbar gehoert er in eine Kennzeichnung des Produkts, nicht
 * in einen Satz unter der Ueberschrift. Die Daten wandern spaeter hinter eine
 * Repository-Abfrage. Ein Auth-Guard fuer (app) kommt in einer spaeteren Stufe
 * dazu.
 */
export default function AnalyseSnapshotPage() {
  return (
    /* Genau EIN Schritt der Abstandsskala zwischen Kopf und Raster. */
    <div className="space-y-6">
      <header>
        <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
          Analyse · Snapshot
        </p>
        <h1 className="text-foreground mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Deine Auswertung
        </h1>
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
