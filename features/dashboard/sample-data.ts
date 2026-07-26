import {
  biomarkerListSchema,
  markerGroupListSchema,
  type Biomarker,
  type MarkerGroup,
  type Measurement,
} from "@/contracts";

/*
 * ============================================================================
 * ⚠️  ACHTUNG — EINHEITEN, REFERENZ- UND OPTIMALBEREICHE SIND PLATZHALTER.
 * ============================================================================
 * Jede Einheit, jeder referenceLow/referenceHigh und jeder optimalLow/
 * optimalHigh in dieser Datei ist ein ENTWURFSWERT fuer die Gestaltung und
 * NICHT KLINISCH VALIDIERT. Auch die Messwerte selbst sind erfunden.
 *
 * Sie sind so gewaehlt, dass die Oberflaeche alle Zustaende zeigt (steigend,
 * fallend, flach, erste Messung, nicht gemessen, ausserhalb des
 * Referenzbereichs) — nicht, weil sie medizinisch stimmen.
 *
 * VOR JEDEM RELEASE: Einheiten und Grenzwerte gegen das Bluttest-Framework
 * abgleichen und freigeben lassen, dann hier ersetzen. Bis dahin darf aus
 * diesen Zahlen keine Aussage ueber eine Person abgeleitet werden.
 * ============================================================================
 *
 * Diese Datei ersetzt keine Datenquelle: sobald das Repository steht, kommen
 * die Werte ueber data/ und die TanStack-Query-Hooks dieses Feature-Ordners.
 * Die Form ist schon jetzt die endgueltige — alles hier wird gegen die Schemata
 * aus contracts/ geparst, und zwar beim Import. Ein Tippfehler in den Daten
 * faellt damit sofort auf und nicht erst in der Anzeige.
 */

/*
 * Die fuenf ANZEIGE-Gruppen in ihrer Reihenfolge. Praesentation, keine
 * Bewertung: sie ordnen die Kacheln in Abschnitte und haben nichts mit den
 * Bewertungs-Kategorien K1–K4 der Analyse zu tun (siehe contracts/biomarker.ts).
 */
export const sampleMarkerGroups: readonly MarkerGroup[] =
  markerGroupListSchema.parse([
    {
      id: "hormone",
      name: "Hormone",
      subtitle: "Anabolismus · Vitalität · Regeneration",
    },
    {
      id: "herz",
      name: "Herz-Gesundheit",
      subtitle: "Lipide · Entzündung · kardiovaskuläres Risiko",
    },
    {
      id: "stoffwechsel",
      name: "Stoffwechsel",
      subtitle: "Energie · Speicher · Mikronährstoffe",
    },
    {
      id: "schilddruese",
      name: "Schilddrüse",
      subtitle: "Grundumsatz · Regulation · Leistungsfähigkeit",
    },
    {
      id: "leber-niere",
      name: "Leber & Niere",
      subtitle: "Entgiftung · Filtration · Organgesundheit",
    },
  ]);

/*
 * Testtermine im Zwei-Monats-Takt, aeltester zuerst. Marker mit kuerzerer
 * Geschichte haengen am ENDE dieser Reihe: sie wurden spaeter aufgenommen.
 */
const MESSTERMINE = [
  "2025-11-18",
  "2026-01-27",
  "2026-03-24",
  "2026-05-26",
  "2026-07-21",
] as const;

/** Baut aus reinen Zahlen einen Verlauf auf den jeweils jüngsten Terminen. */
function verlauf(werte: readonly number[]): Measurement[] {
  const termine = MESSTERMINE.slice(MESSTERMINE.length - werte.length);
  return werte.map((value, index) => {
    const date = termine[index];
    if (date === undefined) {
      throw new Error(
        "Mehr Messwerte als Messtermine — MESSTERMINE erweitern, statt Daten zu erfinden.",
      );
    }
    return { date, value };
  });
}

/*
 * DIE 15 GEMESSENEN MARKER, nach Anzeige-Gruppen sortiert. Die Verlaeufe sind
 * absichtlich verschieden: ein Dashboard aus fuenfzehn identisch steigenden
 * Kurven sieht gebaut aus und zeigt keinen einzigen Randfall.
 *
 * ⚠️ Alle unit-, referenceLow/High- und optimalLow/High-Werte unten sind
 * PLATZHALTER (siehe Kopf der Datei).
 */
const gemesseneMarker = {
  /* ---- Hormone ------------------------------------------------------- */
  /** Steigt ueber ein Jahr deutlich an. */
  "testosteron-gesamt": {
    id: "testosteron-gesamt",
    name: "Testosteron gesamt",
    group: "hormone",
    unit: "ng/dl",
    referenceLow: 264,
    referenceHigh: 916,
    optimalLow: 550,
    optimalHigh: 850,
    history: verlauf([462, 508, 545, 596, 631]),
  },
  /** Faellt langsam — Gegenspieler zum freien Testosteron. */
  shbg: {
    id: "shbg",
    name: "SHBG",
    group: "hormone",
    unit: "nmol/l",
    referenceLow: 18,
    referenceHigh: 54,
    optimalLow: 20,
    optimalHigh: 40,
    history: verlauf([42, 39, 37, 33, 31]),
  },
  /** RANDFALL: angelegt, aber NOCH NIE gemessen — leerer Verlauf. */
  estradiol: {
    id: "estradiol",
    name: "Estradiol",
    group: "hormone",
    unit: "pg/ml",
    referenceLow: 11,
    referenceHigh: 44,
    optimalLow: 20,
    optimalHigh: 35,
    history: [],
  },

  /* ---- Herz-Gesundheit ----------------------------------------------- */
  /** Faellt sichtbar, kommt aber noch nicht in den Optimalbereich. */
  apob: {
    id: "apob",
    name: "ApoB",
    group: "herz",
    unit: "mg/dl",
    referenceLow: 40,
    referenceHigh: 125,
    optimalLow: 40,
    optimalHigh: 80,
    history: verlauf([112, 104, 97, 88, 84]),
  },
  /** RANDFALL: durchgehend KLAR OBERHALB des Referenzbereichs, trotz Trend nach unten. */
  "ldl-cholesterin": {
    id: "ldl-cholesterin",
    name: "LDL-Cholesterin",
    group: "herz",
    unit: "mg/dl",
    referenceLow: 50,
    referenceHigh: 116,
    optimalLow: 50,
    optimalHigh: 100,
    history: verlauf([168, 161, 156, 149, 143]),
  },
  /** Flach: schwankt nur im Rauschen, kein Trend. */
  "hdl-cholesterin": {
    id: "hdl-cholesterin",
    name: "HDL-Cholesterin",
    group: "herz",
    unit: "mg/dl",
    referenceLow: 40,
    referenceHigh: 90,
    optimalLow: 55,
    optimalHigh: 90,
    history: verlauf([58, 57, 59, 58, 60]),
  },
  /** Faellt stark — aus dem oberen Referenzbereich in den Optimalbereich. */
  "hs-crp": {
    id: "hs-crp",
    name: "hs-CRP",
    group: "herz",
    unit: "mg/l",
    referenceLow: 0,
    referenceHigh: 3,
    optimalLow: 0,
    optimalHigh: 1,
    history: verlauf([2.9, 2.2, 1.6, 1.1, 0.7]),
  },
  /** Oberhalb des Referenzbereichs, fallend — passt zum LDL-Verlauf. */
  "gesamt-cholesterin": {
    id: "gesamt-cholesterin",
    name: "Gesamt-Cholesterin",
    group: "herz",
    unit: "mg/dl",
    referenceLow: 120,
    referenceHigh: 200,
    optimalLow: 140,
    optimalHigh: 180,
    history: verlauf([258, 249, 244, 236, 231]),
  },

  /* ---- Stoffwechsel -------------------------------------------------- */
  /** Steigt stetig, erreicht den Optimalbereich aber noch nicht. Vier Messungen. */
  ferritin: {
    id: "ferritin",
    name: "Ferritin",
    group: "stoffwechsel",
    unit: "ng/ml",
    referenceLow: 30,
    referenceHigh: 300,
    optimalLow: 70,
    optimalHigh: 150,
    history: verlauf([41, 49, 58, 68]),
  },
  /** RANDFALL: genau EINE Messung — es gibt noch keinen Verlauf und keine Veraenderung. */
  albumin: {
    id: "albumin",
    name: "Albumin",
    group: "stoffwechsel",
    unit: "g/l",
    referenceLow: 35,
    referenceHigh: 52,
    optimalLow: 42,
    optimalHigh: 50,
    history: verlauf([46]),
  },
  /** Startet UNTER dem Referenzbereich und steigt deutlich hinein. */
  "vitamin-d-25-oh": {
    id: "vitamin-d-25-oh",
    name: "25-OH-Vitamin-D",
    group: "stoffwechsel",
    unit: "ng/ml",
    referenceLow: 30,
    referenceHigh: 70,
    optimalLow: 40,
    optimalHigh: 60,
    history: verlauf([17, 24, 31, 38, 44]),
  },
  /** Faellt aus dem oberen Bereich in den Optimalbereich. */
  triglyceride: {
    id: "triglyceride",
    name: "Triglyceride",
    group: "stoffwechsel",
    unit: "mg/dl",
    referenceLow: 50,
    referenceHigh: 150,
    optimalLow: 50,
    optimalHigh: 90,
    history: verlauf([164, 148, 131, 112, 96]),
  },

  /* ---- Schilddrüse --------------------------------------------------- */
  /** Steigt langsam und verlaesst dabei den Optimalbereich — bleibt im Referenzbereich. */
  tsh: {
    id: "tsh",
    name: "TSH",
    group: "schilddruese",
    unit: "mU/l",
    referenceLow: 0.4,
    referenceHigh: 4,
    optimalLow: 0.5,
    optimalHigh: 2.5,
    history: verlauf([1.4, 1.7, 2, 2.4, 2.8]),
  },
  /** Nur zwei Messungen, praktisch unveraendert. */
  "freies-t3": {
    id: "freies-t3",
    name: "Freies T3",
    group: "schilddruese",
    unit: "pg/ml",
    referenceLow: 2.3,
    referenceHigh: 4.2,
    optimalLow: 3,
    optimalHigh: 4,
    history: verlauf([3.4, 3.3]),
  },

  /* ---- Leber & Niere ------------------------------------------------- */
  /**
   * Flach auf hohem Normalniveau — die letzten beiden Termine sind ABSICHTLICH
   * gleich. Ein Marker, der sich nicht bewegt, ist ein eigener Zustand: die
   * Delta-Pille zeigt den Strich, die Analyse schreibt "unveraendert". Ohne
   * diesen Fall in den Daten waere beides nie zu sehen.
   */
  kreatinin: {
    id: "kreatinin",
    name: "Kreatinin",
    group: "leber-niere",
    unit: "mg/dl",
    referenceLow: 0.7,
    referenceHigh: 1.3,
    optimalLow: 0.8,
    optimalHigh: 1.1,
    history: verlauf([1.02, 0.99, 1.04, 1, 1]),
  },
} satisfies Record<string, Biomarker>;

/**
 * Punktweiser Rechenweg ueber mehrere Verlaeufe. Die Quellen MUESSEN auf
 * denselben Messterminen liegen — ein Index, der Werte von verschiedenen Tagen
 * verrechnet, ist frei erfunden. Deshalb bricht die Funktion lieber ab.
 */
function proTermin(
  quellen: readonly (readonly Measurement[])[],
  rechnung: (werte: number[]) => number,
): Measurement[] {
  const leitverlauf = quellen[0] ?? [];
  return leitverlauf.map((punkt, index) => {
    const werte = quellen.map((quelle) => {
      const treffer = quelle[index];
      if (treffer === undefined || treffer.date !== punkt.date) {
        throw new Error(
          `Quellverlaeufe liegen nicht auf denselben Messterminen (${punkt.date}).`,
        );
      }
      return treffer.value;
    });
    return { date: punkt.date, value: rechnung(werte) };
  });
}

/** Kettenquotient: a / b / c … — fuer alle Verhaeltnis-Indizes. */
const quotient = (werte: number[]): number => werte.reduce((a, b) => a / b);
/** Restsumme: a − b − c … — fuer das Remnant-Cholesterin. */
const restsumme = (werte: number[]): number => werte.reduce((a, b) => a - b);
/** Rundet auf Anzeigegenauigkeit, damit keine Scheingenauigkeit entsteht. */
const runde = (wert: number, stellen: number): number =>
  Number(wert.toFixed(stellen));

/*
 * ⚠️ PLATZHALTER-FORMEL: Das freie Testosteron gehoert eigentlich nach Vermeulen
 * aus Gesamttestosteron, SHBG UND Albumin berechnet. Hier steht bewusst eine
 * grob proportionale Ersatzrechnung (Gesamt/SHBG × Faktor), damit die Kurve
 * plausibel aussieht — sie ist NICHT die klinische Formel und muss mit dem
 * Bluttest-Framework ersetzt werden.
 */
const FREIES_TESTOSTERON_FAKTOR = 0.6;

/** Dimensionslos: Verhaeltnis-Indizes tragen keine Einheit. */
const OHNE_EINHEIT = "";

/*
 * DIE 5 ABGELEITETEN INDIZES. Sie werden aus den Verlaeufen oben BERECHNET und
 * nicht abgetippt: so koennen Index und Quellmarker nicht auseinanderlaufen.
 * derivedFrom nennt die Quellen, damit die Anzeige spaeter zeigen kann, woher
 * eine Zahl kommt.
 *
 * ⚠️ Auch hier sind Einheiten und Grenzwerte PLATZHALTER (siehe Kopf der Datei).
 */
const abgeleiteteIndizes = [
  {
    id: "freies-testosteron",
    name: "Freies Testosteron",
    group: "hormone",
    unit: "ng/dl",
    referenceLow: 5,
    referenceHigh: 21,
    optimalLow: 12,
    optimalHigh: 20,
    isDerived: true,
    derivedFrom: ["testosteron-gesamt", "shbg"],
    history: proTermin(
      [
        gemesseneMarker["testosteron-gesamt"].history,
        gemesseneMarker.shbg.history,
      ],
      (werte) => runde(quotient(werte) * FREIES_TESTOSTERON_FAKTOR, 1),
    ),
  },
  {
    id: "ldl-apob-verhaeltnis",
    name: "LDL/ApoB-Verhältnis",
    group: "herz",
    unit: OHNE_EINHEIT,
    referenceLow: 1,
    referenceHigh: 1.8,
    optimalLow: 1.3,
    optimalHigh: 1.8,
    isDerived: true,
    derivedFrom: ["ldl-cholesterin", "apob"],
    history: proTermin(
      [
        gemesseneMarker["ldl-cholesterin"].history,
        gemesseneMarker.apob.history,
      ],
      (werte) => runde(quotient(werte), 2),
    ),
  },
  {
    /* Gesamt-Cholesterin minus LDL minus HDL — startet knapp ueber dem
     * Referenzbereich und kommt im Verlauf hinein. */
    id: "remnant-cholesterin",
    name: "Remnant-Cholesterin",
    group: "herz",
    unit: "mg/dl",
    referenceLow: 0,
    referenceHigh: 30,
    optimalLow: 0,
    optimalHigh: 20,
    isDerived: true,
    derivedFrom: ["gesamt-cholesterin", "ldl-cholesterin", "hdl-cholesterin"],
    history: proTermin(
      [
        gemesseneMarker["gesamt-cholesterin"].history,
        gemesseneMarker["ldl-cholesterin"].history,
        gemesseneMarker["hdl-cholesterin"].history,
      ],
      restsumme,
    ),
  },
  {
    id: "gesamt-chol-hdl",
    name: "Gesamt-Chol/HDL",
    group: "herz",
    unit: OHNE_EINHEIT,
    referenceLow: 0,
    referenceHigh: 5,
    optimalLow: 0,
    optimalHigh: 3.5,
    isDerived: true,
    derivedFrom: ["gesamt-cholesterin", "hdl-cholesterin"],
    history: proTermin(
      [
        gemesseneMarker["gesamt-cholesterin"].history,
        gemesseneMarker["hdl-cholesterin"].history,
      ],
      (werte) => runde(quotient(werte), 1),
    ),
  },
  {
    id: "triglyceride-hdl-ratio",
    name: "Triglyceride/HDL-Ratio",
    group: "herz",
    unit: OHNE_EINHEIT,
    referenceLow: 0,
    referenceHigh: 3,
    optimalLow: 0,
    optimalHigh: 1.5,
    isDerived: true,
    derivedFrom: ["triglyceride", "hdl-cholesterin"],
    history: proTermin(
      [
        gemesseneMarker.triglyceride.history,
        gemesseneMarker["hdl-cholesterin"].history,
      ],
      (werte) => runde(quotient(werte), 1),
    ),
  },
] satisfies readonly Biomarker[];

/*
 * Die vollstaendige Liste, in Anzeige-Reihenfolge: erst die gemessenen Marker
 * ihrer Gruppe, dann die abgeleiteten Indizes. Der parse-Aufruf ist Absicht —
 * er prueft beim Import Einheiten, Bereichsgrenzen, die Sortierung der
 * Verlaeufe und ob jedes derivedFrom auf einen gemessenen Marker zeigt.
 */
export const sampleMarkers = biomarkerListSchema.parse([
  ...Object.values(gemesseneMarker),
  ...abgeleiteteIndizes,
]);
