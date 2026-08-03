import { supplementListSchema } from "@/contracts";

/*
 * ============================================================================
 * ⚠️  ALLE WERTE HIER SIND PLATZHALTER.
 * ============================================================================
 * Wirkfenster und Delta-Schwellen sind Entwurfswerte fuer die Gestaltung und
 * nicht klinisch validiert. Die PREISE sind frei erfunden und entsprechen
 * keiner Preisliste.
 * ============================================================================
 *
 * DIES IST DIE ERSTE DATEI IN data/. Die Architektur dahinter steht in
 * AGENTS.md: Domaenendaten fliessen ueber contracts/ (Form) nach data/mock/
 * (Inhalt), spaeter nach data/http/. Komponenten wissen NICHT, welche
 * Implementierung aktiv ist.
 *
 * ENTSCHEIDUNG: Es ist heute ein synchroner Export und keine Promise-basierte
 * Repository-Klasse, und es gibt noch keine TanStack-Query-Hooks. Die Form der
 * DATEN ist schon die endgueltige, der ZUGANG ist es nicht — wer hier eine
 * echte Quelle anschliesst, ersetzt diese Datei durch ein Repository und legt
 * die Lese-Hooks in features/<domain>/hooks/ an. Bis dahin waere eine
 * async-Fassade um ein Array eine Zeremonie ohne Nutzen.
 *
 * Der parse-Aufruf am Ende ist Absicht: er prueft beim Import, ob Schwellen,
 * Wirkfenster und Ids stimmen. Ein Tippfehler faellt damit sofort auf und nicht
 * erst in der Anzeige.
 *
 * ============================================================================
 * DER DATENSTAND, DEN DIESE ACHT ZEILEN ERZEUGEN SOLLEN
 * ============================================================================
 * Fuenf Praeparate laufen (intake gesetzt, inSubscription true), drei sind reine
 * Empfehlungen ohne Einnahme. Die fuenf laufenden decken weiterhin alle fuenf
 * Staende von toSupplementStatus ab — die Analyse-Kachel "Wirkt, was du nimmst?"
 * liest dieselben Daten und braucht jeden Stand einmal.
 *
 * Bewertungsstichtag ist der letzte Test (21.07.2026), dieselben Termine wie
 * Score und Verlauf. Die Marker-Werte sind dieselben wie auf dem Dashboard
 * (Vitamin D 17→44, Ferritin 41→68), damit dieselbe Messung nicht an zwei
 * Stellen verschiedene Zahlen traegt.
 */

export const mockSupplements = supplementListSchema.parse([
  {
    id: "vit-d3",
    name: "Vitamin D3",
    dose: "2 000 IE / Tag",
    imageKey: "capsule-blue",
    pricePerMonthCents: 1490,
    inSubscription: true,
    targetMarker: "25-OH-Vitamin-D",
    targetUnit: "ng/ml",
    basis: "messung",
    effectWindowDays: { from: 56, to: 112 },
    expectedDirection: "up",
    strongDelta: 15,
    weakDelta: 5,
    actionHint: "Dosis beibehalten und beim nächsten Test erneut prüfen.",
    intake: {
      startedOn: "2026-01-27",
      daysOn: 175,
      baseline: 17,
      current: 44,
    },
  },
  {
    id: "eisen",
    name: "Eisenbisglycinat",
    dose: "30 mg / Tag",
    imageKey: "capsule-sand",
    pricePerMonthCents: 1250,
    inSubscription: true,
    targetMarker: "Ferritin",
    targetUnit: "ng/ml",
    basis: "messung",
    effectWindowDays: { from: 56, to: 120 },
    expectedDirection: "up",
    strongDelta: 40,
    weakDelta: 15,
    actionHint:
      "Dosis belassen — die Richtung stimmt, das Tempo ist noch gering.",
    intake: {
      startedOn: "2026-01-27",
      daysOn: 175,
      baseline: 41,
      current: 68,
    },
  },
  {
    id: "omega-3",
    name: "Omega-3 (EPA/DHA)",
    dose: "2 g / Tag",
    imageKey: "capsule-red",
    pricePerMonthCents: 1990,
    inSubscription: true,
    targetMarker: "Triglyceride",
    targetUnit: "mg/dl",
    basis: "messung",
    effectWindowDays: { from: 60, to: 120 },
    expectedDirection: "down",
    strongDelta: 30,
    weakDelta: 10,
    actionHint:
      "Präparat wechseln: höhere EPA-Dosis prüfen oder Einnahme beenden.",
    intake: {
      startedOn: "2026-01-27",
      daysOn: 175,
      /* Flach seit Einnahmebeginn — nach dem Wirkfenster ist das "keine
       * Reaktion", und damit faellt es aus der Empfehlung. */
      baseline: 148,
      current: 148,
    },
  },
  {
    id: "magnesium",
    name: "Magnesiumcitrat",
    dose: "300 mg / Tag",
    imageKey: "capsule-green",
    pricePerMonthCents: 990,
    inSubscription: true,
    targetMarker: "Magnesium (Serum)",
    targetUnit: "mmol/l",
    basis: "messung",
    effectWindowDays: { from: 42, to: 84 },
    expectedDirection: "up",
    strongDelta: 0.1,
    weakDelta: 0.04,
    actionHint: "Noch abwarten — das Wirkfenster beginnt erst in zwei Wochen.",
    /* Laeuft erst 28 Tage: im Abo, aber noch ohne zweite Messung. */
    intake: {
      startedOn: "2026-06-23",
      daysOn: 28,
      baseline: null,
      current: null,
    },
  },
  {
    id: "ashwagandha",
    name: "Ashwagandha",
    dose: "300 mg / Tag",
    imageKey: "capsule-green",
    pricePerMonthCents: 1190,
    inSubscription: true,
    targetMarker: null,
    targetUnit: "",
    /* Kein Marker, also kann nur der Fragebogen die Empfehlung tragen — der
     * Vertrag laesst hier auch gar nichts anderes zu. */
    basis: "fragebogen",
    effectWindowDays: { from: 28, to: 56 },
    expectedDirection: "up",
    strongDelta: 1,
    weakDelta: 0.5,
    actionHint:
      "Kein messbarer Zielmarker in dieser Auswertung — Wirkung hier nicht beurteilbar.",
    intake: {
      startedOn: "2026-03-24",
      daysOn: 119,
      baseline: null,
      current: null,
    },
  },

  /* ----------------------------------------------------------------------- */
  /* Ohne Einnahme: empfohlen, aber noch nicht im Abo.                        */
  /* ----------------------------------------------------------------------- */

  {
    id: "zink",
    name: "Zinkbisglycinat",
    dose: "15 mg / Tag",
    imageKey: "capsule-sand",
    pricePerMonthCents: 890,
    inSubscription: false,
    targetMarker: "Zink (Serum)",
    targetUnit: "µmol/l",
    basis: "messung",
    effectWindowDays: { from: 28, to: 84 },
    expectedDirection: "up",
    strongDelta: 2,
    weakDelta: 0.8,
    actionHint: "Nach acht Wochen erneut messen.",
    intake: null,
  },
  {
    id: "b12",
    name: "Vitamin B12 (Methylcobalamin)",
    dose: "500 µg / Tag",
    imageKey: "capsule-red",
    pricePerMonthCents: 1690,
    inSubscription: false,
    targetMarker: "Holo-Transcobalamin",
    targetUnit: "pmol/l",
    basis: "messung",
    effectWindowDays: { from: 42, to: 112 },
    expectedDirection: "up",
    strongDelta: 20,
    weakDelta: 8,
    actionHint: "Nach zwölf Wochen erneut messen.",
    intake: null,
  },
  {
    id: "kreatin",
    name: "Kreatin-Monohydrat",
    dose: "3 g / Tag",
    /* Ohne eigenes Foto — hier greift das Rueckfallbild. */
    imageKey: null,
    pricePerMonthCents: 1390,
    inSubscription: false,
    targetMarker: null,
    targetUnit: "",
    basis: "fragebogen",
    effectWindowDays: { from: 28, to: 56 },
    expectedDirection: "up",
    strongDelta: 1,
    weakDelta: 0.5,
    actionHint:
      "Kein messbarer Zielmarker in dieser Auswertung — die Entscheidung liegt bei dir.",
    intake: null,
  },
]);
