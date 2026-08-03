import { ContextRail } from "@/components/common/context-rail";

/*
 * RUECKFALL DES @rail-SLOTS BEIM HARTEN LADEN.
 *
 * Next 16 verlangt fuer jeden Parallel-Slot ein default; ohne diese Datei
 * bricht der Build. Sie greift, wenn beim Neuladen einer Seite kein Eintrag
 * des Slots auf die Route passt — dann kann Next den aktiven Stand nicht
 * wiederherstellen und nimmt diesen hier.
 *
 * Sie zeigt dasselbe wie der Catch-all daneben: die Normalbesetzung. Beide
 * muessen zusammenbleiben — der Catch-all deckt die WEICHE Navigation ab,
 * dieses default die HARTE. Wer nur eines von beiden pflegt, bekommt eine
 * Leiste, die sich je nach Ankunftsweg unterscheidet.
 */
export default function RailDefault() {
  return <ContextRail />;
}
