/*
 * ============================================================================
 * ⚠️  ACHTUNG — SCORE, ZIEL, BAENDER UND LIMITER SIND PLATZHALTER.
 * ============================================================================
 * Der Optimus Score ist eine BEWERTUNG. Die Zahlen hier sind erfunden und
 * entstehen aus keiner Berechnung: sie zeigen die Gestaltung, nicht den
 * Zustand einer Person. Vor jedem Release muessen Score-Formel, Zielwert, die
 * Bandgrenzen, die Konfidenzstufen und die Herleitung des Limiters gegen das
 * Bluttest-Framework abgeglichen und freigegeben werden.
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

/**
 * Der Zielwert der Score-Skala. Er steht EINMAL: die gestrichelte Ziellinie im
 * Verlauf, der Zielstrich der Kategorie-Ringe und die Grenze zum gruenen Band
 * sind dieselbe Zahl. Zwei Ziele auf einer Oberflaeche waeren zwei Aussagen.
 *
 * ENTSCHEIDUNG: 75 ist ein PLATZHALTER — kein klinisch gesetzter Wert.
 */
export const SCORE_TARGET = 75;

/** Hoechste Konfidenzstufe. Die Skala hat fuenf Schritte, keine Prozente. */
export const CONFIDENCE_MAX = 5;

/**
 * Untergrenze des mittleren Bands. Darunter gilt eine Kategorie als kritisch.
 *
 * ENTSCHEIDUNG: 65 ist wie SCORE_TARGET ein PLATZHALTER. Die Schnitte kommen
 * spaeter aus dem Bluttest-Framework; bis dahin zeigen sie nur, dass es
 * ueberhaupt drei Baender gibt.
 */
const BAND_WARNING_MIN = 65;

/** Bewertungsband eines Scores — traegt die Statusfarbe der Analyse. */
export type ScoreBand = "critical" | "warning" | "success";

/**
 * Score -> Band. Die obere Schwelle IST der Zielwert: gruen beginnt genau
 * dort, wo das Ziel steht, sonst behauptet die Farbe etwas anderes als der
 * Zielstrich am Instrument.
 */
export function toScoreBand(score: number): ScoreBand {
  if (score < BAND_WARNING_MIN) return "critical";
  if (score < SCORE_TARGET) return "warning";
  return "success";
}

/**
 * Eine der vier BEWERTUNGS-Kategorien K1–K4 der Analyse.
 *
 * ACHTUNG, Namensfalle: Das sind NICHT die Anzeige-Gruppen k1–k5 der
 * Biomarker-Kacheln (Hormone, Herz-Gesundheit, …). Die Anzeige-Gruppen ordnen
 * Marker, diese Kategorien bewerten sie.
 */
export interface CategoryScore {
  id: string;
  name: string;
  /** Punkte auf derselben Skala 0–100 wie der Gesamtscore. */
  score: number;
  /*
   * Wie belastbar die Bewertung ist: 1–5, abhaengig von Zahl und Alter der
   * Messungen dahinter. EIGENES Feld und niemals aus dem Score abgeleitet — ein
   * hoher Wert aus einer einzigen alten Messung ist etwas anderes als derselbe
   * Wert aus vier frischen.
   */
  confidence: number;
}

/*
 * Der Engpass steht als eigene Konstante, weil ZWEI Bausteine ihn zeigen: die
 * Score-Kachel als "begrenzt durch" und der Ring als Wort-Tag "Engpass". Aus
 * einer Quelle koennen die beiden nicht auseinanderlaufen.
 */
const limiterCategory: CategoryScore = {
  id: "k2",
  name: "Regeneration & Hormonbalance",
  score: 61,
  confidence: 2,
};

/** Id der Kategorie, die den Gesamtscore derzeit deckelt. Genau EINE. */
export const sampleLimiterId = limiterCategory.id;

/*
 * Vier Kategorien in fester Reihenfolge. Die Werte sind bewusst ungleich
 * verteilt — je ein Ring pro Band und Konfidenzen von 2 bis 5, damit im Raster
 * sichtbar wird, dass Score und Konfidenz zwei getrennte Kanaele sind.
 */
export const sampleCategories: readonly CategoryScore[] = [
  {
    id: "k1",
    name: "Energie & Stoffwechsel",
    score: 78,
    confidence: 4,
  },
  limiterCategory,
  {
    id: "k3",
    name: "Herz-Kreislauf & Langzeit",
    score: 84,
    confidence: 5,
  },
  {
    id: "k4",
    name: "Immunsystem & Mikronährstoffe",
    score: 72,
    confidence: 3,
  },
];

export const sampleScore: ScoreSummary = {
  target: SCORE_TARGET,
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
  limiter: limiterCategory.name,
  nextTestInDays: 34,
};
