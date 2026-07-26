/*
 * ============================================================================
 * ⚠️  ACHTUNG — SCORE, ZIEL UND LIMITER SIND PLATZHALTER.
 * ============================================================================
 * Der Optimus Score ist eine BEWERTUNG. Die Zahlen hier sind erfunden und
 * entstehen aus keiner Berechnung: sie zeigen die Gestaltung, nicht den
 * Zustand einer Person. Vor jedem Release muessen Score-Formel, Zielwert, die
 * Konfidenzstufen und die Herleitung des Limiters gegen das Bluttest-Framework
 * abgeglichen und freigegeben werden.
 *
 * Bewertungs-BAENDER gibt es bewusst keine mehr. Eine Schwelle, ab der ein
 * Score gruen oder rot waere, ist eine klinische Aussage — sie wird gesetzt,
 * nicht geschaetzt. Bis eine freigegeben ist, faerbt nichts einen Wert ein.
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
 * Der persoenliche Zielwert des GESAMTSCORES. Er zeichnet die gestrichelte
 * Linie im Verlauf der Score-Kachel und steht dort als "noch bis Ziel".
 *
 * Er gilt AUSSCHLIESSLICH fuer den Gesamtscore. Die Kategorie-Ringe kennen
 * keinen Zielwert: ein Ziel je Kategorie waere eine erfundene Schwelle, ihr
 * Bezug ist deshalb der letzte Test.
 *
 * ENTSCHEIDUNG: 75 ist ein PLATZHALTER — kein klinisch gesetzter Wert.
 */
export const SCORE_TARGET = 75;

/** Hoechste Konfidenzstufe. Die Skala hat fuenf Schritte, keine Prozente. */
export const CONFIDENCE_MAX = 5;

/** Beide Enden der Score-Skala. Sie ist fest — nur so sind Ringe vergleichbar. */
export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

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
  /**
   * Derselbe Score beim VORHERIGEN Test — die einzige Bezugsgroesse der
   * Kategorie. Optional, weil der erste Test keine hat: dann fehlt am Ring die
   * Bezugsmarke, statt dass eine erfunden wird.
   */
  previousScore?: number;
  /*
   * Wie belastbar die Bewertung ist: 1–5, abhaengig von Zahl und Alter der
   * Messungen dahinter. EIGENES Feld und niemals aus dem Score abgeleitet — ein
   * hoher Wert aus einer einzigen alten Messung ist etwas anderes als derselbe
   * Wert aus vier frischen.
   */
  confidence: number;
}

/*
 * Der Engpass steht als eigene Konstante, damit die Score-Kachel ihr "begrenzt
 * durch" aus derselben Quelle zieht wie das Kategorien-Raster seinen Eintrag.
 * Am Ring selbst ist er nicht mehr markiert: ein zweites Etikett neben Score,
 * letztem Test und Konfidenz war ein vierter Kanal auf 78 Pixeln.
 */
const limiterCategory: CategoryScore = {
  id: "k2",
  name: "Regeneration & Hormonbalance",
  score: 61,
  previousScore: 64,
  confidence: 2,
};

/*
 * Vier Kategorien in fester Reihenfolge. Die Werte sind bewusst ungleich
 * verteilt, und jede Kategorie zeigt eine andere BEWEGUNG gegenueber dem
 * letzten Test — deutlich hoch (k1), gefallen (k2), leicht hoch (k3),
 * unveraendert (k4). Nur so zeigt das Raster, was der Strich am Ring leistet:
 * bei k4 liegt er genau unter dem Bogenende, bei k2 vor ihm.
 *
 * Die Konfidenzen von 2 bis 5 laufen absichtlich NICHT parallel zum Score —
 * k4 hat denselben Stand wie beim letzten Test, aber nur Stufe 3.
 */
export const sampleCategories: readonly CategoryScore[] = [
  {
    id: "k1",
    name: "Energie & Stoffwechsel",
    score: 78,
    previousScore: 71,
    confidence: 4,
  },
  limiterCategory,
  {
    id: "k3",
    name: "Herz-Kreislauf & Langzeit",
    score: 84,
    previousScore: 80,
    confidence: 5,
  },
  {
    id: "k4",
    name: "Immunsystem & Mikronährstoffe",
    score: 72,
    previousScore: 72,
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
