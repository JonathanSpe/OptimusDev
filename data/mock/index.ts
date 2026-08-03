/*
 * Mock-Implementierung der Datenschicht. Sie liefert Daten in der Form, die
 * contracts/ beschreibt — Oberflaechen importieren von hier und wissen nicht,
 * ob dahinter ein Mock oder ein Dienst steht.
 *
 * ⚠️ Jede Zahl darin ist ein Platzhalter; die Hinweise stehen an den Dateien.
 *
 * Noch NICHT hier: die Biomarker und die Kontext-Leiste. Ihre Mock-Daten liegen
 * weiterhin in features/<domain>/sample-data.ts. Wer sie als naechstes anfasst,
 * bringt sie mit — zwei Orte fuer dasselbe sind ein Uebergangszustand und kein
 * Muster.
 */
export { mockSupplements } from "./supplements";
