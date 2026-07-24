import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Einstellungen",
};

export default function EinstellungenPage() {
  return (
    <PlaceholderPage
      title="Einstellungen"
      lead="Profil, Benachrichtigungen und Datenfreigaben."
      cardTitle="Inhalt folgt"
      cardText="Hier kannst du später dein Profil pflegen, Einheiten festlegen und steuern, welche Daten verarbeitet werden."
    />
  );
}
