import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Wissenschaft",
};

export default function WissenschaftPage() {
  return (
    <PlaceholderPage
      title="Wissenschaft"
      lead="Woher unsere Empfehlungen kommen und worauf sie sich stützen."
      cardTitle="Inhalt folgt"
      cardText="Hier erklären wir die Studienlage hinter den Auswertungen und machen transparent, wie sicher eine Aussage jeweils ist."
    />
  );
}
