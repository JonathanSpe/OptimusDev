import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Verlauf",
};

export default function AnalyseVerlaufPage() {
  return (
    <PlaceholderPage
      title="Verlauf"
      lead="Wie sich deine Werte über die Tests hinweg entwickeln."
      cardTitle="Inhalt folgt"
      cardText="Hier entstehen die Verlaufsdiagramme über alle Tests hinweg, inklusive Vergleich einzelner Marker."
    />
  );
}
//   "Verlauf"
//   "Wie sich deine Werte über die Tests hinweg entwickeln."
//   "Inhalt folgt"
//   "Hier entstehen die Verlaufsdiagramme über alle Tests hinweg, inklusive Vergleich einzelner Marker."
