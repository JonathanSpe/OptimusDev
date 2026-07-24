import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/placeholder-page";

export const metadata: Metadata = {
  title: "Shop",
};

export default function ShopPage() {
  return (
    <PlaceholderPage
      title="Shop"
      lead="Tests und Zubehör, die zu deinen Werten passen."
      cardTitle="Inhalt folgt"
      cardText="Hier entsteht die Produktübersicht. Sortiment, Preise und Bestellvorgang folgen in einer späteren Stufe."
    />
  );
}
