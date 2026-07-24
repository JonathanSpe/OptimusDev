import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "So funktioniert es",
};

export default function SoFunktioniertEsPage() {
  return (
    <PlaceholderPage
      title="So funktioniert Optimus"
      lead="Von der Messung bis zur Empfehlung — in drei Schritten."
      cardTitle="Inhalt folgt"
      cardText="Hier beschreiben wir den kompletten Ablauf: Werte erfassen, auswerten lassen und die passenden nächsten Schritte umsetzen."
    />
  );
}
