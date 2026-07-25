import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Snapshot",
};

export default function AnalyseSnapshotPage() {
  return (
    <PlaceholderPage
      title="Snapshot"
      lead="Deine Werte aus dem letzten Test."
      cardTitle="Inhalt folgt"
      cardText="Hier entsteht die Momentaufnahme aller Messwerte des letzten Tests — mit Referenzbereich und Einordnung."
    />
  );
}
