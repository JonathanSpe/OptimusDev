/*
 * Beispieldaten der Kontext-Leiste. Sie ersetzen keine Datenquelle: sobald das
 * Repository steht, kommen die Werte ueber data/ und die TanStack-Query-Hooks.
 *
 * ENTSCHEIDUNG: Datumsangaben und Countdown liegen als fertige Zeichenketten
 * bzw. Zahlen vor. Kein Date-Objekt, keine Rechnung zur Laufzeit — Server und
 * Client rendern so garantiert dasselbe, unabhaengig von Zeitzone und Uhrzeit.
 */

export interface ProfileSummary {
  name: string;
  /** Initialen fuer den Avatar — sie greifen, wenn kein Bild vorliegt. */
  initials: string;
  /*
   * Profilbild, ein Pfad in public/. PLATZHALTER fuer die Gestaltung: das Bild
   * zeigt keine reale Person und ist generiert. Ein echtes Foto kommt spaeter
   * ueber das Repository — und nur mit eigener Rechtsgrundlage.
   *
   * GDPR: lokaler Pfad, kein externer Avatar-Dienst.
   */
  imageSrc?: string;
  age: number;
  sex: string;
  sport: string;
}

export interface TestTimelineEntry {
  /** Kurzform fuer die Zeitleiste, z. B. "21.07.". */
  label: string;
  /** Volles Datum fuer die Vorlesereihenfolge. */
  date: string;
  state: "erledigt" | "geplant";
}

export interface NextTest {
  date: string;
  /** Tage bis zum Termin — als Zahl, damit die Formulierung im UI entsteht. */
  daysUntil: number;
  timeline: readonly TestTimelineEntry[];
}

export interface OpenQuestion {
  id: string;
  /** Neutral formuliert, mit Ja/Nein beantwortbar. */
  text: string;
}

export interface OpenQuestions {
  total: number;
  answered: number;
  /** Die zwei dringendsten Fragen — direkt in der Leiste beantwortbar. */
  urgent: readonly OpenQuestion[];
}

export interface ConnectedApp {
  id: string;
  name: string;
  /** Letzte Synchronisierung als fertige Zeichenkette. */
  lastSync: string;
  /** TECHNISCHER Verbindungszustand — keine gesundheitliche Aussage. */
  state: "aktiv" | "ausstehend";
}

export interface UserContext {
  diet: string;
  trainingPhase: string;
  supplements: readonly string[];
}

export const sampleProfile: ProfileSummary = {
  name: "Jonas Weber",
  initials: "JW",
  imageSrc: "/avatar-platzhalter.png",
  age: 34,
  sex: "männlich",
  sport: "Triathlon",
};

export const sampleNextTest: NextTest = {
  date: "28.08.2026",
  daysUntil: 34,
  timeline: [
    { label: "24.03.", date: "24.03.2026", state: "erledigt" },
    { label: "26.05.", date: "26.05.2026", state: "erledigt" },
    { label: "21.07.", date: "21.07.2026", state: "erledigt" },
    { label: "28.08.", date: "28.08.2026", state: "geplant" },
  ],
};

export const sampleOpenQuestions: OpenQuestions = {
  total: 7,
  answered: 4,
  urgent: [
    { id: "eisen", text: "Nimmst du derzeit ein Eisenpräparat ein?" },
    {
      id: "training",
      text: "Hast du in den 48 Stunden vor der Messung intensiv trainiert?",
    },
  ],
};

export const sampleConnectedApps: readonly ConnectedApp[] = [
  {
    id: "garmin",
    name: "Garmin Connect",
    lastSync: "vor 2 Std.",
    state: "aktiv",
  },
  { id: "apple", name: "Apple Health", lastSync: "vor 1 Tag", state: "aktiv" },
  {
    id: "withings",
    name: "Withings",
    lastSync: "Sync ausstehend",
    state: "ausstehend",
  },
];

export const sampleUserContext: UserContext = {
  diet: "Vegetarisch",
  trainingPhase: "Aufbauphase",
  supplements: ["Vitamin D 2000 IE", "Magnesium 300 mg", "Omega-3"],
};
