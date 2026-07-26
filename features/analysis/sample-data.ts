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

import type { Measurement } from "@/contracts";

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
 * Der aktuelle STAND einer der vier BEWERTUNGS-Kategorien K1–K4 — die Sicht,
 * die ein Ring braucht. Geschrieben wird er nicht: er entsteht aus dem Verlauf
 * (CategorySeries) ueber toCategoryScore.
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

/**
 * Der VERLAUF einer Kategorie: alle Staende, aeltester zuerst.
 *
 * Hier wird geschrieben, nirgends sonst. Der Snapshot, den die Ringe brauchen
 * (CategoryScore), entsteht daraus per toCategoryScore — deshalb kann der Ring
 * gar keinen anderen Vorwert zeigen als die Verlaufskurve. Zwei getrennt
 * gepflegte Quellen fuer denselben Wert laufen irgendwann auseinander, und
 * zwar genau dann, wenn beide gleichzeitig auf dem Schirm stehen.
 */
export interface CategorySeries {
  id: string;
  name: string;
  confidence: number;
  /**
   * MINDESTENS ein Stand. Der Typ sagt damit, was fachlich gilt: ohne Messung
   * gibt es keinen Kategorie-Score, den man zeigen koennte.
   */
  history: readonly [ScorePoint, ...ScorePoint[]];
}

/*
 * Der Engpass steht als eigene Konstante, damit die Score-Kachel ihr "begrenzt
 * durch" aus derselben Quelle zieht wie das Kategorien-Raster seinen Eintrag.
 * Am Ring selbst ist er nicht mehr markiert: ein zweites Etikett neben Score,
 * letztem Test und Konfidenz war ein vierter Kanal auf 78 Pixeln.
 */
const limiterCategory: CategorySeries = {
  id: "k2",
  name: "Regeneration & Hormonbalance",
  confidence: 2,
  history: [
    { date: "2026-01-27", value: 55 },
    { date: "2026-03-24", value: 60 },
    { date: "2026-05-26", value: 64 },
    { date: "2026-07-21", value: 61 },
  ],
};

/*
 * Vier Kategorien in fester Reihenfolge, jede mit denselben vier Testterminen
 * wie der Gesamtscore. Die Verlaeufe sind bewusst verschieden geformt —
 * stetig hoch (k1), hoch und wieder gefallen (k2), ruhig steigend (k3), hoch
 * und dann flach (k4). Am Ring zeigt sich davon der letzte Schritt: bei k4
 * liegt der Strich genau unter dem Bogenende, bei k2 vor ihm.
 *
 * Die Konfidenzen von 2 bis 5 laufen absichtlich NICHT parallel zum Score —
 * k4 steht wie beim letzten Test, hat aber nur Stufe 3.
 *
 * Der Gesamtscore liegt an jedem Termin ein paar Punkte UNTER dem Mittel der
 * vier Kategorien. Das ist kein Rechenfehler, sondern der Platzhalter dafuer,
 * dass die Gesamtformel nicht das arithmetische Mittel ist — sie wiegt den
 * schwaechsten Bereich staerker. Die echte Formel steht noch aus.
 */
export const sampleCategorySeries: readonly CategorySeries[] = [
  {
    id: "k1",
    name: "Energie & Stoffwechsel",
    confidence: 4,
    history: [
      { date: "2026-01-27", value: 64 },
      { date: "2026-03-24", value: 68 },
      { date: "2026-05-26", value: 71 },
      { date: "2026-07-21", value: 78 },
    ],
  },
  limiterCategory,
  {
    id: "k3",
    name: "Herz-Kreislauf & Langzeit",
    confidence: 5,
    history: [
      { date: "2026-01-27", value: 74 },
      { date: "2026-03-24", value: 77 },
      { date: "2026-05-26", value: 80 },
      { date: "2026-07-21", value: 84 },
    ],
  },
  {
    id: "k4",
    name: "Immunsystem & Mikronährstoffe",
    confidence: 3,
    history: [
      { date: "2026-01-27", value: 68 },
      { date: "2026-03-24", value: 70 },
      { date: "2026-05-26", value: 72 },
      { date: "2026-07-21", value: 72 },
    ],
  },
];

/**
 * Der Stand einer Kategorie aus ihrem Verlauf: letzter Eintrag ist der Score,
 * vorletzter der Bezug. Genau die Rechnung, die die Score-Kachel auf dem
 * Gesamtverlauf macht — eine Regel, zwei Ebenen.
 */
export function toCategoryScore(series: CategorySeries): CategoryScore {
  const current = series.history.at(-1) ?? series.history[0];
  return {
    id: series.id,
    name: series.name,
    score: current.value,
    previousScore: series.history.at(-2)?.value,
    confidence: series.confidence,
  };
}

export const sampleCategories: readonly CategoryScore[] =
  sampleCategorySeries.map(toCategoryScore);

/**
 * Ein BUENDEL — die kleinste bewertete Einheit der Analyse: mehrere Marker, die
 * zusammen eine Aussage tragen. Jedes Buendel gehoert zu genau einer Kategorie,
 * und die Nummer sagt zu welcher: "2.1" ist das erste Buendel der zweiten.
 *
 * ACHTUNG: Die Buendel-Scores rollen NICHT rechnerisch in die Kategorie-Scores
 * hoch. Eine Aggregation waere eine Formel, und die steht noch nicht fest — hier
 * stehen zwei Ebenen Platzhalter nebeneinander, keine Rechnung.
 */
export interface Bundle {
  /** Fachliche Nummer, z. B. "2.1". Sie ist zugleich die Beschriftung am Punkt. */
  id: string;
  name: string;
  /** Kategorie, zu der das Buendel zaehlt — Id aus sampleCategories. */
  categoryId: string;
  /** Punkte auf derselben Skala 0–100 wie Gesamt- und Kategorie-Score. */
  score: number;
  /** Belastbarkeit der Aussage, 1–5. Eigener Kanal, nie aus dem Score. */
  confidence: number;
}

/*
 * Zehn Buendel ueber die vier Kategorien. Die Streuung ist bewusst gebaut, und
 * ein Fall traegt die ganze Aussage der Landkarte: 2.1 hat den NIEDRIGSTEN
 * Score von allen (50) und trotzdem nichts zu tun — bei Konfidenz 2 weiss man
 * zu wenig, um zu handeln. Die Punkte, auf die es ankommt, liegen rechts unten
 * (4.1, 2.2, 3.2): niedrig UND belastbar.
 *
 * Innerhalb einer Konfidenzstufe liegen die Scores mindestens acht Punkte
 * auseinander, damit sich in der Senkrechten keine zwei Marken ueberdecken.
 * Zusaetzlich haelt jeder Ansatzpunkt Abstand zu den Marken der NACHBARSPALTE:
 * er traegt seinen vollen Namen, und der ragt weiter ins Feld als eine Nummer.
 */
export const sampleBundles: readonly Bundle[] = [
  {
    id: "1.1",
    name: "Glukosestoffwechsel",
    categoryId: "k1",
    score: 86,
    confidence: 3,
  },
  {
    id: "1.2",
    name: "Schilddrüsenfunktion",
    categoryId: "k1",
    score: 74,
    confidence: 3,
  },
  {
    id: "1.3",
    name: "Leberstoffwechsel",
    categoryId: "k1",
    score: 88,
    confidence: 4,
  },
  {
    id: "2.1",
    name: "Cortisol-Tagesverlauf",
    categoryId: "k2",
    score: 50,
    confidence: 2,
  },
  {
    id: "2.2",
    name: "Sexualhormone",
    categoryId: "k2",
    score: 72,
    confidence: 4,
  },
  {
    id: "3.1",
    name: "Lipidprofil",
    categoryId: "k3",
    score: 92,
    confidence: 5,
  },
  {
    id: "3.2",
    name: "Gefässentzündung",
    categoryId: "k3",
    score: 78,
    confidence: 5,
  },
  /*
   * Konfidenz 4 und nicht 5: einer der drei Marker dahinter steht auf einer
   * einzelnen Messung (siehe samplePriorityFindings). Die volle Stufe zu geben
   * und daneben eine offene Frage aufzumachen, waere ein Widerspruch auf
   * derselben Kachel.
   */
  {
    id: "4.1",
    name: "Eisenhaushalt",
    categoryId: "k4",
    score: 58,
    confidence: 4,
  },
  {
    id: "4.2",
    name: "Vitamin-D-Status",
    categoryId: "k4",
    score: 64,
    confidence: 3,
  },
  {
    id: "4.3",
    name: "B-Vitamine & Homocystein",
    categoryId: "k4",
    score: 94,
    confidence: 2,
  },
];

/**
 * Name der Kategorie zu einer Id. EINE Quelle fuer den Namen: das Buendel
 * speichert nur die Id, sonst stuenden dieselben vier Namen an zwei Stellen und
 * liefen beim ersten Umbenennen auseinander.
 */
export function categoryNameById(categoryId: string): string {
  return (
    sampleCategories.find((category) => category.id === categoryId)?.name ??
    "Ohne Kategorie"
  );
}

/**
 * Ein Marker als BELEG unter einem Befund — nur die Felder, die der Beleg
 * braucht. Namen und Bedeutung sind die des Biomarker-Vertrags, damit aus
 * diesem Ausschnitt spaeter ein Import wird und keine Uebersetzung.
 *
 * ⚠️ Einheiten, Referenz- und Optimalbereiche sind PLATZHALTER. Wo ein Marker
 * auch auf dem Dashboard steht, traegt er hier DIESELBEN Zahlen: derselbe Name
 * mit zwei Werten in einer Anwendung ist kein Platzhalter mehr, sondern ein
 * Fehler.
 */
export interface FindingMarker {
  /** Anzeigename, z. B. "Ferritin". */
  name: string;
  /** Einheit; ein leerer String heisst dimensionslos. */
  unit: string;
  referenceLow: number;
  referenceHigh: number;
  /** Optionaler Optimalbereich INNERHALB des Referenzbereichs. */
  optimalLow?: number;
  optimalHigh?: number;
  /** Aelteste Messung zuerst. LEER heisst: noch nie gemessen. */
  history: readonly Measurement[];
}

/**
 * Der ausformulierte Befund zu einem Buendel: ein Satz, die Marker, auf denen
 * er steht, und die eine offene Frage dazu.
 */
export interface PriorityFinding {
  /** Buendel, zu dem der Befund gehoert. */
  bundleId: string;
  /**
   * EIN Satz in einfachem Deutsch. Er darf nur benennen, was auch in markers
   * steht — jede Aussage hier hat unten ihren Beleg.
   */
  claim: string;
  /**
   * Zwei bis drei Marker. Zwei, weil ein einzelner Wert keine Begruendung ist;
   * hoechstens drei, weil eine laengere Liste keine Begruendung mehr ist,
   * sondern eine Tabelle. Die Karte kuerzt NICHT nach — ein weggelassener
   * Beleg ist genau das Verschweigen, das sie verhindern soll.
   */
  markers: readonly FindingMarker[];
  /** Was die Konfidenz heben wuerde, und an welchem Marker es haengt. */
  openQuestion: {
    /** Muss auf einen Marker aus markers zeigen — sonst zeigt die Karte die Frage nicht. */
    marker: string;
    question: string;
  };
}

/*
 * Die Marker hinter Buendel 4.1 "Eisenhaushalt". Ferritin traegt dieselben vier
 * Werte wie die Dashboard-Kachel (41 → 68 ng/ml, steigend), die
 * Transferrin-Saettigung steht bewusst auf EINER Messung vom ersten Test: sie
 * ist der Randfall, an dem sich zeigt, dass ein einzelner Wert hier keine Note
 * bekommt — auch dann nicht, wenn er tief liegt.
 */
const eisenMarker: readonly FindingMarker[] = [
  {
    name: "Ferritin",
    unit: "ng/ml",
    referenceLow: 30,
    referenceHigh: 300,
    optimalLow: 70,
    optimalHigh: 150,
    history: [
      { date: "2026-01-27", value: 41 },
      { date: "2026-03-24", value: 49 },
      { date: "2026-05-26", value: 58 },
      { date: "2026-07-21", value: 68 },
    ],
  },
  {
    name: "Transferrin-Sättigung",
    unit: "%",
    referenceLow: 20,
    referenceHigh: 45,
    history: [{ date: "2026-01-27", value: 16 }],
  },
  {
    name: "Hämoglobin",
    unit: "g/dl",
    referenceLow: 13.5,
    referenceHigh: 17.5,
    optimalLow: 14,
    optimalHigh: 16,
    history: [
      { date: "2026-03-24", value: 14.1 },
      { date: "2026-05-26", value: 14.3 },
      { date: "2026-07-21", value: 14.2 },
    ],
  },
];

/*
 * Befunde nach Buendel-Id. Heute steht hier genau einer — der zum Ansatzpunkt,
 * und mehr zeigt die Karte auch nie. Als Verzeichnis steht er trotzdem da:
 * welches Buendel der Ansatzpunkt ist, entscheidet die Regel in rules.ts, und
 * die kann morgen ein anderes nennen.
 *
 * Dass der Ansatzpunkt (4.1, Kategorie k4) NICHT der Engpass der Score-Kachel
 * ist (k2), ist kein Versehen: k2 drueckt den Gesamtscore am staerksten, ist
 * aber nur Konfidenz 2 — man weiss dort zu wenig, um zu handeln. Die Kachel
 * sagt, was am meisten kostet; diese Karte sagt, wo man anfangen kann.
 */
export const samplePriorityFindings: Readonly<Record<string, PriorityFinding>> =
  {
    "4.1": {
      bundleId: "4.1",
      claim:
        "Der Eisenspeicher füllt sich seit vier Messungen, liegt aber weiter unter dem Optimum — das Hämoglobin ist davon bisher unberührt.",
      markers: eisenMarker,
      openQuestion: {
        marker: "Transferrin-Sättigung",
        question:
          "Eine zweite Messung gäbe dem vorhandenen Wert einen Vergleich — erst dann lässt sich der Eisenhaushalt vollständig einordnen.",
      },
    },
  };

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
