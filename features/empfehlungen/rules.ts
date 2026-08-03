import type { Supplement } from "@/contracts";
import { toSupplementStatus } from "@/features/analysis";

/*
 * ============================================================================
 * DIE REGELN DER EMPFEHLUNGEN — die einzige Stelle, die hier urteilt.
 * ============================================================================
 * ⚠️ ALLE STUFEN SIND PLATZHALTER. Sie haengen an den Schwellen und
 * Wirkfenstern aus contracts/supplement.ts, und die sind nicht klinisch
 * freigegeben. Solange das so ist, ordnet diese Datei Entwurfswerte.
 *
 * ⚠️ KEINE WIRKAUSSAGE. Nichts hier sagt, dass ein Praeparat wirkt oder wogegen
 * es hilft. Was diese Datei kennt, sind Messwerte an einem Zielmarker und die
 * Frage, ob daraus ueberhaupt etwas ablesbar ist.
 *
 * ============================================================================
 * ZWEI ACHSEN, DIE SICH NICHT BERUEHREN DUERFEN
 * ============================================================================
 * EMPFEHLUNGSSTAERKE gliedert die Seite in Abschnitte. ABO-ZUGEHOERIGKEIT ist
 * eine Eigenschaft der einzelnen Zeile. Beides sind verschiedene Fragen:
 * "sollte ich das nehmen" und "nehme ich das schon".
 *
 * ⚠️ EIN ABSCHNITT "WEITER NEHMEN" WAERE DER FEHLER. Er verschmoelze beide
 * Achsen zu einer, und die Gliederung der Seite haenge dann daran, was gerade
 * im Abo liegt — beim Erstbesuch mit leerem Abo saehe die Seite voellig anders
 * aus als beim zweiten. Die Probe darauf ist einfach und muss jeder Aenderung
 * standhalten: bei null Praeparaten im Abo bleibt die Gliederung dieselbe.
 * Nur "nicht mehr empfohlen" faellt weg, und zwar zwangslaeufig — man kann
 * nichts absetzen, was nicht laeuft.
 */

/**
 * Wie stark ein Praeparat empfohlen wird. KEINE Statusfarbe: gruen, bernstein
 * und rot beantworten in diesem Produkt "wo steht dieser Messwert", und eine
 * Empfehlung ist etwas anderes. Der Abschnitt traegt die Aussage in seiner
 * Ueberschrift, nicht in einem Ton.
 */
export type RecommendationStrength =
  /** Es gibt einen messbaren Zielmarker, und nichts spricht dagegen. */
  | "empfohlen"
  /** Kein messbarer Zielmarker — die Entscheidung liegt beim Nutzer. */
  | "optional"
  /** Laeuft, hat sich nach dem Wirkfenster aber nicht bewegt. */
  | "nichtMehrEmpfohlen";

/**
 * Leitet die Empfehlungsstaerke ab. Die REIHENFOLGE der Pruefungen ist die
 * Regel — nach dem Vorbild von toSupplementStatus in features/analysis.
 *
 * 1. NICHT MEHR EMPFOHLEN nur bei laufender Einnahme. Die Bedingung dafuer ist
 *    "keine Reaktion", und dieser Stand entsteht per Definition erst nach dem
 *    Wirkfenster einer laufenden Einnahme (siehe toSupplementStatus). Die
 *    zusaetzliche Abfrage auf inSubscription ist trotzdem da: sie macht die
 *    Zusage "beim leeren Abo gibt es diesen Abschnitt nicht" zu etwas, das man
 *    an dieser Zeile liest, statt es aus zwei Dateien herzuleiten.
 *
 * 2. OPTIONAL, wo es keinen messbaren Zielmarker gibt. Das ist kein schwaecheres
 *    Urteil, sondern GAR KEINES: ohne Marker kann diese Auswertung nichts
 *    beitragen, und dann darf sie auch nicht so tun. Ein Praeparat wandert
 *    hierher, weil uns die Grundlage fehlt — nicht, weil es weniger taugt.
 *
 * 3. EMPFOHLEN ist der Rest: es gibt einen Zielmarker. Auch "zu frueh" faellt
 *    hierher, ausdruecklich (siehe unten).
 *
 * ⚠️ EINE ZWEITE GRUNDLAGE FUER "NICHT MEHR EMPFOHLEN" FEHLT NOCH: ein
 * Zielmarker, der seinen Zielbereich erreicht hat. Sie braucht die
 * Referenzgrenzen des Markers, und die stehen im Biomarker-Vertrag, nicht am
 * Praeparat. Sie hier zu raten waere schlimmer als sie wegzulassen — ein
 * Praeparat abzusetzen, weil ein erfundener Zielbereich als erreicht gilt, ist
 * ein Rat mit Folgen.
 */
export function toRecommendationStrength(
  prep: Supplement,
): RecommendationStrength {
  if (prep.inSubscription && toSupplementStatus(prep) === "keineReaktion") {
    return "nichtMehrEmpfohlen";
  }
  if (prep.targetMarker === null) {
    return "optional";
  }
  return "empfohlen";
}

/*
 * "ZU FRUEH" BEKOMMT KEINE EIGENE GRUPPE.
 *
 * Ein Praeparat, dessen Wirkfenster noch nicht begonnen hat, steht ganz normal
 * unter "Empfohlen" — es ist ja empfohlen, es ist nur noch nicht beurteilbar.
 * Eine eigene Gruppe dafuer waere eine Gliederung nach dem Kalender und nicht
 * nach der Empfehlung, und sie wuerde ausserdem wandern: dasselbe Praeparat
 * spraenge beim naechsten Test ohne eigenes Zutun in einen anderen Abschnitt.
 *
 * Was die Zeile stattdessen tut, steht in toEvidence: sie nennt den STAND
 * ("läuft seit 28 Tagen — beurteilbar ab 04.08.2026") statt ein Delta zu
 * erfinden.
 */

/**
 * Woraus sich eine Zeile begruendet: ein Messwert, oder — wo es keinen gibt —
 * eine knappe Erklaerung in ganzen Worten.
 */
export interface Evidence {
  /** Die Angabe selbst, z. B. "17 → 44 ng/ml". */
  text: string;
  /** Vorgelesene Fassung: "auf" statt Pfeil, Komma statt Gedankenstrich. */
  spoken: string;
  /**
   * true, wenn hier ein gemessener VERLAUF steht, und nicht die Erklaerung,
   * warum es keinen gibt. Die Zeile setzt darauf ihre Ziffernschrift.
   */
  measured: boolean;
}

const markerFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

const dayFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

/**
 * "2026-08-04" aus Beginn plus Tagen. Rechnet in UTC und ohne Date.now(), damit
 * Server und Client garantiert dieselbe Zeichenkette erzeugen — dieselbe Regel
 * wie bei den Datumsangaben der Kontext-Leiste.
 */
function toDatePlusDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return isoDate;
  }
  const stamp = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(stamp.getUTCDate())}.${pad(stamp.getUTCMonth() + 1)}.${stamp.getUTCFullYear()}`;
}

/** "seit 28 Tagen", und bei einem Tag auch nicht "seit 1 Tagen". */
function toDaysOn(daysOn: number): string {
  return `seit ${daysOn === 1 ? "einem Tag" : `${dayFormat.format(daysOn)} Tagen`}`;
}

/*
 * DIE HERKUNFT AUS DEM FRAGEBOGEN — der Fall ohne jeden Messwert.
 *
 * ENTSCHEIDUNG (kehrt eine fruehere um): Hier stand "kein messbarer
 * Zielmarker". Das nannte ein FELD unseres Modells und erklaerte nichts: wer
 * "Zielmarker" nicht kennt, liest eine Fehlermeldung, und wer ihn kennt, liest
 * eine Selbstauskunft der Auswertung. Die Zeile sagt jetzt, woher die
 * Empfehlung stammt und dass kein Blutwert dahintersteht — dieselbe Zurueck-
 * haltung, aber als Erklaerung statt als Absage.
 *
 * ⚠️ WEITER KEINE WIRKAUSSAGE. Genannt wird die QUELLE, nie das Thema. "aus
 * deinem Fragebogen: Schlaf" waere die Aussage, das Praeparat wirke auf den
 * Schlaf — deshalb traegt der Vertrag auch nur die Quelle und kein Thema.
 */
const FRAGEBOGEN_TEXT = "aus deinem Fragebogen, nicht aus einem Blutwert";

/**
 * Die Begruendung einer Zeile: ein Messwert, wo es einen gibt, sonst eine
 * KNAPPE ERKLAERUNG. Fuenf Faelle, und in keinem davon steht ein Satz darueber,
 * was das Praeparat bewirkt:
 *
 *   gemessen        "25-OH-Vitamin-D 17 → 44 ng/ml" — der Verlauf am Marker.
 *   Fragebogen      "aus deinem Fragebogen, nicht aus einem Blutwert".
 *   noch nicht      "Ansatzpunkt aus deinem Test: Zink (Serum)".
 *   zu frueh        "läuft seit 28 Tagen — beurteilbar ab 04.08.2026".
 *   ohne Messung    "läuft seit 119 Tagen, noch ohne zweite Messung".
 */
export function toEvidence(prep: Supplement): Evidence {
  const { targetMarker, intake } = prep;

  if (targetMarker === null) {
    /* Ohne Marker traegt nur die Herkunft — und die ist dann zwangslaeufig der
     * Fragebogen, dafuer sorgt der Vertrag. */
    return { text: FRAGEBOGEN_TEXT, spoken: FRAGEBOGEN_TEXT, measured: false };
  }

  if (intake === null) {
    /*
     * Noch nicht genommen. Frueher stand hier bloss der Markername ("Zink
     * (Serum)") — ein Wort ohne Aussage. Jetzt steht da, WOFUER er hier steht:
     * er ist der Ansatzpunkt aus dem letzten Test, dieselbe Sprache, die der
     * leere Abschnitt schon fuehrt ("Sobald deine Werte einen Ansatzpunkt
     * zeigen …").
     */
    if (prep.basis === "fragebogen") {
      return {
        text: FRAGEBOGEN_TEXT,
        spoken: FRAGEBOGEN_TEXT,
        measured: false,
      };
    }
    const text = `Ansatzpunkt aus deinem Test: ${targetMarker}`;
    return { text, spoken: text, measured: false };
  }

  const { baseline, current, daysOn, startedOn } = intake;

  if (baseline !== null && current !== null) {
    const unit = prep.targetUnit ? ` ${prep.targetUnit}` : "";
    const from = markerFormat.format(baseline);
    const to = markerFormat.format(current);
    return {
      text: `${targetMarker} ${from} → ${to}${unit}`,
      spoken: `${targetMarker} ${from} auf ${to}${unit}`,
      measured: true,
    };
  }

  /*
   * Kein Wertepaar. Vor dem Wirkfenster nennt die Zeile den TERMIN, ab dem
   * eines zu erwarten ist — das ist die Angabe, nach der man sonst fragt. Als
   * Satz und nicht als Notation: "seit 28 Tagen · ab 04.08.2026 beurteilbar"
   * waren zwei Angaben mit einem Trennzeichen dazwischen, und wer sie liest,
   * setzt den Zusammenhang selbst zusammen.
   */
  const days = toDaysOn(daysOn);
  if (daysOn < prep.effectWindowDays.from) {
    const assessableFrom = toDatePlusDays(
      startedOn,
      prep.effectWindowDays.from,
    );
    return {
      text: `läuft ${days} — beurteilbar ab ${assessableFrom}`,
      spoken: `läuft ${days}, beurteilbar ab ${assessableFrom}`,
      measured: false,
    };
  }

  const text = `läuft ${days}, noch ohne zweite Messung`;
  return { text, spoken: text, measured: false };
}

/*
 * ============================================================================
 * DIE BILANZ — es ist ein ABO, kein Einzelkauf.
 * ============================================================================
 * Der Korb zeigt deshalb nicht, was man kauft, sondern was sich AENDERT:
 * bisherige Summe, neue Summe, Differenz. Eine Zeile "Gesamt 82,10 €" waere die
 * Rechnung eines Einzelkaufs und verschwiege genau die Zahl, um die es geht.
 */

/** Was mit einer Zeile passieren soll, solange nichts bestaetigt ist. */
export type PendingAction = "hinzufuegen" | "entfernen";

/** Die noch nicht bestaetigten Aenderungen, je Praeparat-Id. */
export type PendingChanges = ReadonlyMap<string, PendingAction>;

/**
 * Liegt das Praeparat in der NAECHSTEN Fassung des Abos? Das ist der laufende
 * Stand plus die vorgemerkte Aenderung — und die Grundlage der neuen Summe.
 */
export function isInNextSubscription(
  prep: Supplement,
  pending: PendingChanges,
): boolean {
  const action = pending.get(prep.id);
  if (action === "hinzufuegen") return true;
  if (action === "entfernen") return false;
  return prep.inSubscription;
}

/*
 * ============================================================================
 * DER KORB IST BEIM AUFSCHLAGEN NICHT LEER — er steht auf VORSCHLAG.
 * ============================================================================
 * Was hier herauskommt, ist die Fassung des Abos, die sich aus der letzten
 * Auswertung ergibt: alles Empfohlene und Optionale liegt darin, und was nicht
 * mehr empfohlen ist, liegt draussen. Der Nutzer uebernimmt das oder aendert
 * es — er stellt es nicht aus dem Nichts zusammen.
 *
 * ⚠️ DAS IST EIN VORSCHLAG UND KEINE BESTELLUNG, und der Unterschied muss an
 * der Oberflaeche sichtbar bleiben. Bedingungen, ohne die das ein dunkles
 * Muster waere:
 *   1. Nichts geschieht ohne Bestaetigung. Der Vorschlag ist eine VORMERKUNG;
 *      solange niemand bestaetigt, aendert sich am Abo nichts.
 *   2. Jede Zeile ist mit einem Klick umzuschalten, in beide Richtungen.
 *   3. Der Korb sagt, dass es ein Vorschlag ist, und woher er kommt.
 *
 * ⚠️ OFFENE FRAGE AN DAS PRODUKT: "optional" heisst in diesem Produkt
 * ausdruecklich "wir koennen dazu nichts sagen" — es gibt keinen messbaren
 * Zielmarker. Diese Praeparate trotzdem vorzuschlagen, ist eine Entscheidung
 * des Geschaefts und keine der Auswertung. Sie steht hier an EINER Zeile, die
 * sich streichen laesst, falls der Vorschlag kuenftig nur Empfohlenes tragen
 * soll.
 */
export function toRecommendedChanges(
  supplements: readonly Supplement[],
): PendingChanges {
  const vorschlag = new Map<string, PendingAction>();

  for (const prep of supplements) {
    const strength = toRecommendationStrength(prep);

    if (strength === "nichtMehrEmpfohlen") {
      /* Laeuft per Definition (siehe toRecommendationStrength) — also raus. */
      if (prep.inSubscription) vorschlag.set(prep.id, "entfernen");
      continue;
    }

    /* ⚠️ Die Zeile aus der offenen Frage oben: sie nimmt "optional" mit. */
    if (!prep.inSubscription) vorschlag.set(prep.id, "hinzufuegen");
  }

  return vorschlag;
}

/**
 * Schaltet die Zugehoerigkeit EINER Zeile zur naechsten Fassung um.
 *
 * ENTSCHEIDUNG: eine Handlung statt der frueheren drei (hinzufuegen /
 * entfernen / rueckgaengig). Seit der Korb vorbefuellt ist, waere
 * "Rückgängig" die haeufigste Aufschrift der Seite — an jeder vorgeschlagenen
 * Zeile, bevor der Nutzer irgendetwas getan hat. Es gibt aber nichts
 * rueckgaengig zu machen, was man nicht selbst getan hat. Die Zeile fragt
 * seither nur noch: liegt das im naechsten Abo oder nicht.
 *
 * Die VORMERKUNG bleibt der Unterschied zum laufenden Stand — deshalb wird ein
 * Eintrag geloescht und nicht umgekehrt, sobald die Zeile wieder dort steht,
 * wo sie herkam. So bleibt "keine Vormerkung" gleichbedeutend mit "nichts zu
 * bestaetigen", und die Bilanz kann gar nicht erst Nullbewegungen zeigen.
 */
export function toggleMembership(
  prep: Supplement,
  pending: PendingChanges,
): PendingChanges {
  const next = new Map(pending);

  if (isInNextSubscription(prep, pending)) {
    if (prep.inSubscription) next.set(prep.id, "entfernen");
    else next.delete(prep.id);
  } else {
    if (prep.inSubscription) next.delete(prep.id);
    else next.set(prep.id, "hinzufuegen");
  }

  return next;
}

export interface SubscriptionChange {
  /** Monatssumme der laufenden Fassung, in Cent. */
  beforeCents: number;
  /** Monatssumme nach Bestaetigung, in Cent. */
  afterCents: number;
  /** afterCents − beforeCents. Vorzeichen ist die Richtung. */
  deltaCents: number;
  /** Kommt dazu. */
  added: readonly Supplement[];
  /**
   * Wird abgesetzt. Diese Liste ist der Grund, warum die Bestaetigung zwei
   * Stufen hat: ein Abgang ist eine Kuendigung und keine Korrektur am Korb.
   */
  removed: readonly Supplement[];
}

/**
 * Rechnet die Bilanz. EINE Stelle summiert; wuerde die Leiste ihre Zahlen
 * selbst bilden, koennten Anzeige und Bestaetigung verschiedene Summen meinen.
 *
 * Gerechnet wird in CENT (siehe Vertrag): 14,90 + 12,50 in Gleitkomma ergibt
 * 27,400000000000002, und eine Summe, die sich beim Aufaddieren verschiebt,
 * gehoert nicht neben einen Preis.
 */
export function toSubscriptionChange(
  supplements: readonly Supplement[],
  pending: PendingChanges,
): SubscriptionChange {
  let beforeCents = 0;
  let afterCents = 0;
  const added: Supplement[] = [];
  const removed: Supplement[] = [];

  for (const prep of supplements) {
    if (prep.inSubscription) beforeCents += prep.pricePerMonthCents;

    const next = isInNextSubscription(prep, pending);
    if (next) afterCents += prep.pricePerMonthCents;

    if (next && !prep.inSubscription) added.push(prep);
    if (!next && prep.inSubscription) removed.push(prep);
  }

  return {
    beforeCents,
    afterCents,
    deltaCents: afterCents - beforeCents,
    added,
    removed,
  };
}

const euroFormat = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

/** Cent → "14,90 €". */
export function toEuro(cents: number): string {
  return euroFormat.format(cents / 100);
}

/**
 * Dieselbe Summe als DIFFERENZ, also mit Vorzeichen. "+14,90 €" und "0,00 €"
 * sind zwei verschiedene Aussagen, und ohne Vorzeichen liest sich die erste wie
 * ein Preis statt wie eine Veraenderung.
 */
export function toEuroDelta(cents: number): string {
  if (cents === 0) return `±${toEuro(0)}`;
  return `${cents > 0 ? "+" : "−"}${toEuro(Math.abs(cents))}`;
}
