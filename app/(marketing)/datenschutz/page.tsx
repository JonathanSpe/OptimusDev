import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Datenschutz",
};

export default function DatenschutzPage() {
  return (
    <PlaceholderPage
      title="Datenschutz"
      lead="Platzhalter — hier steht noch kein rechtsgültiger Text."
      cardTitle="Platzhalter"
      cardText="Die Datenschutzerklärung nach DSGVO (Verantwortlicher, Zwecke, Rechtsgrundlagen, Speicherdauer, Betroffenenrechte, Auftragsverarbeiter) wird vom Betreiber ergänzt und rechtlich geprüft. Diese Seite existiert vorerst nur, damit die Navigation vollständig ist."
    />
  );
}
