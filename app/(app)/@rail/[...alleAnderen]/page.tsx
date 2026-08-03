import { ContextRail } from "@/components/common/context-rail";

/*
 * ⚠️ DIESE DATEI SIEHT UEBERFLUESSIG AUS UND IST ES NICHT.
 *
 * Parallel-Slots behalten bei WEICHER Navigation ihren zuletzt aktiven
 * Unterpfad, wenn die neue Route keinen Treffer im Slot hat. Ohne diesen
 * Catch-all bliebe also die Leiste von /empfehlungen — Warenkorb und alles —
 * stehen, sobald man von dort auf das Dashboard wechselt. Erst beim Neuladen
 * saehe man wieder die richtige. Die Next-Doku nennt genau diesen Catch-all
 * als Gegenmittel (file-conventions/parallel-routes).
 *
 * Der Name des Segments ist beliebig, er taucht nirgends auf: Slots sind keine
 * Routensegmente und aendern die URL nicht.
 *
 * Wer eine weitere Seite eigens bestuecken will, legt daneben einen Ordner mit
 * dem Namen ihrer Route an. Der genauere Pfad gewinnt gegen diesen hier.
 */
export default function RailAlleAnderen() {
  return <ContextRail />;
}
