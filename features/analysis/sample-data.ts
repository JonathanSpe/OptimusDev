/*
 * ============================================================================
 * ⚠️  ACHTUNG — SCORE, ZIEL UND LIMITER SIND PLATZHALTER.
 * ============================================================================
 * Der Optimus Score ist eine BEWERTUNG. Die Zahlen hier sind erfunden und
 * entstehen aus keiner Berechnung: sie zeigen die Gestaltung, nicht den
 * Zustand einer Person. Vor jedem Release muessen Score-Formel, Zielwert und
 * die Herleitung des Limiters gegen das Bluttest-Framework abgeglichen und
 * freigegeben werden.
 *
 * Sobald das Repository steht, kommen die Werte ueber data/ und die
 * TanStack-Query-Hooks dieses Feature-Ordners.
 * ============================================================================
 *
 * ENTSCHEIDUNG: Die Typen liegen vorerst hier und nicht in contracts/. Der
 * Score-Vertrag haengt an der Score-FORMEL, und die ist noch offen — ein Schema
 * dafuer waere heute geraten. Er zieht nach contracts/ um, sobald die Analyse
 * ihre echten Felder kennt (dann samt Zod-Schema wie bei den Biomarkern).
 */

/** Ein Score-Stand zu einem Testtermin. */
export interface ScorePoint {
  /** ISO-Datum (YYYY-MM-DD) des Tests. */
  date: string;
  /** Punkte auf der Score-Skala 0–100. */
  value: number;
}

export interface ScoreSummary {
  /** Persoenlicher Zielwert; er zeichnet die gestrichelte Linie im Verlauf. */
  target: number;
  /*
   * Aelteste Messung zuerst. Der LETZTE Eintrag ist der aktuelle Score, der
   * vorletzte die Bezugsgroesse des Deltas — deshalb gibt es kein eigenes
   * value-Feld daneben. Zwei Quellen fuer dieselbe Zahl laufen irgendwann
   * auseinander, und dann widersprechen sich Score, Delta und Datum auf
   * derselben Kachel.
   */
  history: readonly ScorePoint[];
  /**
   * Der Bereich, der den Score derzeit am staerksten deckelt. Genau EINER —
   * eine Liste waere eine Aufgabenliste, und die gehoert in die Empfehlungen.
   */
  limiter: string;
  /** Tage bis zum naechsten Test, als Zahl: die Formulierung entsteht im UI. */
  nextTestInDays: number;
}

export const sampleScore: ScoreSummary = {
  target: 75,
  /*
   * Vier Tests im Zwei-Monats-Takt. Die Kurve steigt, aber ABGEFLACHT
   * (+6, +3, +4) — eine gleichmaessige Rampe sieht nach Grafik aus, nicht nach
   * Messung.
   */
  history: [
    { date: "2026-01-27", value: 58 },
    { date: "2026-03-24", value: 64 },
    { date: "2026-05-26", value: 67 },
    { date: "2026-07-21", value: 71 },
  ],
  limiter: "Regeneration & Hormonbalance",
  nextTestInDays: 34,
};
