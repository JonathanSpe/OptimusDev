import type { Metadata } from "next";

import { mockSupplements } from "@/data/mock";
import {
  AnalysisBoard,
  sampleBundles,
  sampleCategories,
  sampleCategorySeries,
  sampleMarkerChanges,
  sampleScore,
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
 * KEIN SICHTBARER SEITENKOPF. Hier standen eine Dachzeile ("Analyse ·
 * Snapshot") und eine Ueberschrift in 36px. Zusammen mit ihrem Abstand kosteten
 * sie rund 90px — die erste Bildschirmhoehe ging fuer zwei Zeilen drauf, die
 * beide nur wiederholten, was die Navigation links schon markiert und der
 * Browser-Tab schon im Titel traegt. Jetzt beginnt die Inhaltsspalte auf
 * derselben Hoehe wie die erste Kachel der Kontext-Leiste, und das Erste, was
 * man sieht, ist der Score.
 *
 * ⚠️ DIE UEBERSCHRIFT IST NICHT WEG, SIE IST NUR UNSICHTBAR. Eine Seite ohne h1
 * ist fuer Screenreader eine Seite ohne Namen: wer sich per Ueberschriften-Liste
 * durch das Dokument bewegt, landet sonst direkt in den Kacheln und weiss nicht,
 * worauf er steht. sr-only ist deshalb Pflicht, nicht Kosmetik — dieselbe
 * Loesung, die hideTitle in components/ui/sheet.tsx fuer das Panel benutzt.
 *
 * Die Dachzeile faellt dabei ganz weg. Vorgelesen war sie ohnehin eine
 * Verdopplung: "Analyse · Snapshot" direkt vor "Deine Auswertung".
 *
 * Ein Vorspann kommt hier ebenfalls nicht zurueck. Ein Absatz, der aufzaehlt,
 * was gleich darunter steht, ist eine Inhaltsangabe der Seite: er kostet
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
    <>
      <h1 className="sr-only">Deine Auswertung</h1>

      <AnalysisBoard
        score={sampleScore}
        categories={sampleCategories}
        bundles={sampleBundles}
        categorySeries={sampleCategorySeries}
        markerChanges={sampleMarkerChanges}
        supplements={mockSupplements}
      />
    </>
  );
}
