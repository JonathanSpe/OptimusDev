import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Leistung",
};

export default function LeistungPage() {
  return (
    <PlaceholderPage
      title="Leistung"
      lead="Belastung, Regeneration und Fortschritt."
      cardTitle="Inhalt folgt"
      cardText="Hier zeigen wir später, wie sich Training und Erholung auf deine Werte auswirken."
    />
  );
}
