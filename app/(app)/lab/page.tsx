import type { Metadata } from "next";

import {
  BiomarkerBoard,
  sampleMarkerGroups,
  sampleMarkers,
} from "@/features/dashboard";

/*
 * TEMPORAER: Werkbank fuer die Design-Iteration am Biomarker-Panel. Die Route
 * wird entfernt, sobald am Panel nichts mehr zu klaeren ist.
 */
export const metadata: Metadata = {
  title: "Design-Labor",
  robots: { index: false, follow: false },
};

/*
 * Vier Randfaelle aus denselben Daten, die auch das Dashboard zeigt — hier nur
 * ohne die uebrigen sechzehn Kacheln daneben:
 *   Ferritin           Normalfall mit Verlauf und Optimalbereich
 *   Albumin            eine einzige Messung, also kein Verlauf
 *   LDL-Cholesterin    Wert ausserhalb des Referenzbereichs
 *   Estradiol          angelegt, aber nie gemessen
 */
const RANDFAELLE: readonly string[] = [
  "ferritin",
  "albumin",
  "ldl-cholesterin",
  "estradiol",
];

const specimens = sampleMarkers.filter((marker) =>
  RANDFAELLE.includes(marker.id),
);

export default function LabPage() {
  return (
    <BiomarkerBoard groups={sampleMarkerGroups} markers={specimens}>
      <h1 className="text-foreground text-3xl font-semibold tracking-tight">
        Design-Labor
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Vier Randfälle des Biomarker-Panels: Normalfall, erste Messung, Wert
        außerhalb des Referenzbereichs und „nicht gemessen“. Der Umschalter
        rechts stellt alle Kacheln gemeinsam von den Werten auf die Verläufe um.
      </p>
    </BiomarkerBoard>
  );
}
