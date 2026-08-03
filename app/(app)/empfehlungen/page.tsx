import type { Metadata } from "next";

import { mockSupplements } from "@/data/mock";
import { RecommendationBoard } from "@/features/empfehlungen";

export const metadata: Metadata = {
  title: "Empfehlungen",
};

/*
 * KEINE SICHTBARE SEITENUEBERSCHRIFT — dieselbe Regel wie auf /dashboard und
 * /analyse/snapshot: die aktive Stelle in der Navigation sagt bereits, wo man
 * ist, und ein 36px-Titel, der dasselbe wiederholt, kostet die erste
 * Bildschirmhoehe. Die Ueberschrift bleibt als sr-only stehen, damit die Seite
 * fuer Screenreader und in der Dokumentgliederung eine hat.
 *
 * ⚠️ Die Daten kommen aus data/mock — jede Zahl darin, besonders die Preise,
 * ist ein Platzhalter. Sobald es eine echte Quelle gibt, wird der Import
 * getauscht; die Oberflaeche merkt davon nichts.
 */
export default function EmpfehlungenPage() {
  return (
    <RecommendationBoard supplements={mockSupplements}>
      <h1 className="sr-only">Deine Empfehlungen</h1>
    </RecommendationBoard>
  );
}
