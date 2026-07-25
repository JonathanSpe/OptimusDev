import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Empfehlungen",
};

export default function EmpfehlungenPage() {
  return (
    <PlaceholderPage
      title="Empfehlungen"
      lead="Was du aus deinen Werten machen kannst."
      cardTitle="Inhalt folgt"
      cardText="Hier entstehen die konkreten Empfehlungen — jede mit Begründung und Quelle, abgeleitet aus deinen Messwerten."
    />
  );
}
