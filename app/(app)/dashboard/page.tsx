import type { Metadata } from "next";

import {
  BiomarkerBoard,
  sampleMarkerGroups,
  sampleMarkers,
} from "@/features/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

/*
 * Das Dashboard zeigt BIOMARKER und sonst nichts: Wert, Verlauf, Referenzlage.
 * Es bewertet nicht — die Einordnung passiert auf der Analyse-Oberflaeche.
 *
 * Die Route bleibt duenn und serverseitig; den Zustand des Umschalters haelt
 * das Board. Die Daten sind noch ein Mock aus features/dashboard/sample-data.ts
 * (⚠️ Grenzwerte sind Platzhalter) und wandern spaeter hinter eine
 * Repository-Abfrage.
 */
export default function DashboardPage() {
  return (
    <BiomarkerBoard groups={sampleMarkerGroups} markers={sampleMarkers}>
      <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
        Guten Morgen 👋
      </h1>
      <p className="text-muted-foreground mt-2">
        Deine Werte aus dem letzten Bluttest — ohne Bewertung. Alle Zahlen sind
        Platzhalter.
      </p>
    </BiomarkerBoard>
  );
}
