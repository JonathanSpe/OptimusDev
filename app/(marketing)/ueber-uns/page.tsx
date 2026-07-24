import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Über uns",
};

export default function UeberUnsPage() {
  return (
    <PlaceholderPage
      title="Über uns"
      lead="Wer hinter Optimus steht."
      cardTitle="Inhalt folgt"
      cardText="Hier stellen wir das Team, unsere Motivation und unseren Umgang mit Gesundheitsdaten vor."
    />
  );
}
