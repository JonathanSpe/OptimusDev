import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Analyse",
};

export default function AnalysePage() {
  return (
    <PlaceholderPage
      title="Analyse"
      lead="Deine Werte im Detail."
      cardTitle="Inhalt folgt"
      cardText="Hier entstehen die Detailauswertungen einzelner Messwerte inklusive Referenzbereichen und Verlauf."
    />
  );
}
