import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Performance",
};

export default function LeistungPage() {
  return (
    <PlaceholderPage
      title="Performance"
      lead="Belastung, Regeneration und Fortschritt."
      cardTitle="Inhalt folgt"
      cardText="Hier zeigen wir später, wie sich Training und Erholung auf deine Werte auswirken."
    />
  );
}
