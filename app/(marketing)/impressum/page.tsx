import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function ImpressumPage() {
  return (
    <PlaceholderPage
      title="Impressum"
      lead="Platzhalter — hier steht noch kein rechtsgültiger Text."
      cardTitle="Platzhalter"
      cardText="Die Angaben nach § 5 DDG (Anbieter, Anschrift, Kontakt, Vertretungsberechtigte, Register, USt-IdNr.) werden vom Betreiber ergänzt und rechtlich geprüft. Diese Seite existiert vorerst nur, damit die Navigation vollständig ist."
    />
  );
}
