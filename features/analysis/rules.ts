/*
 * ============================================================================
 * DIE REGELN DER ANALYSE — einmal hingeschrieben, von allen gelesen.
 * ============================================================================
 * Zwei Bausteine beantworten dieselbe Frage: die Landkarte hebt die
 * Ansatzpunkte hervor, die Prioritaetskarte nennt den ersten davon. Staende die
 * Regel zweimal im Code, wuerden die beiden irgendwann auseinanderlaufen — die
 * Karte betont ein Buendel, die Kachel nennt ein anderes. Dem Leser faellt
 * nicht auf, dass dahinter zwei Kopien einer Regel stecken; ihm faellt auf,
 * dass die Analyse sich widerspricht, und dann glaubt er keiner der beiden.
 *
 * ⚠️ Alle Stufen hier sind PLATZHALTER. Sie kommen spaeter aus dem
 * Bluttest-Framework und muessen vor dem Release freigegeben werden.
 */

import type { Bundle, FindingMarker, Supplement } from "./sample-data";

/*
 * ENTSCHEIDUNG: Es gibt eine Grenze auf der KONFIDENZ-Achse und keine auf der
 * Score-Achse. Eine Konfidenzgrenze sagt etwas ueber unsere Daten ("ab hier ist
 * belastbar gemessen") — das duerfen wir behaupten. Eine Scoregrenze wuerde
 * etwas ueber den Menschen sagen ("ab hier ist es schlecht"), und die ist
 * klinisch zu setzen, nicht zu schaetzen.
 */
export const CONFIDENCE_SOLID = 4;

/*
 * Betonung ohne Schwelle: betont werden nicht "alle unter X", sondern die drei
 * NIEDRIGSTEN der belastbar gemessenen Buendel. Das ist eine Rangfolge, keine
 * Grenze — sie behauptet nicht, dass 72 schlecht ist, sondern dass es unter den
 * gut gemessenen das dritt-niedrigste ist. Drei, weil eine Liste von
 * Ansatzpunkten, die laenger ist als drei, keine Ansatzpunkte mehr sind.
 */
export const FOCUS_COUNT = 3;

/**
 * Die Buendel, auf die es ankommt: belastbar gemessen UND am weitesten unten,
 * das niedrigste zuerst.
 */
export function toFocusBundles(bundles: readonly Bundle[]): readonly Bundle[] {
  return bundles
    .filter((bundle) => bundle.confidence >= CONFIDENCE_SOLID)
    .toSorted((left, right) => left.score - right.score)
    .slice(0, FOCUS_COUNT);
}

/** Dieselbe Auswahl als Id-Menge — die Landkarte fragt je Punkt nach. */
export function toFocusIds(bundles: readonly Bundle[]): ReadonlySet<string> {
  return new Set(toFocusBundles(bundles).map((bundle) => bundle.id));
}

/**
 * Der EINE Ansatzpunkt: das niedrigste belastbar gemessene Buendel. Kein
 * belastbares Buendel — kein Ansatzpunkt; dann empfiehlt die Analyse nichts.
 */
export function toPriorityBundle(
  bundles: readonly Bundle[],
): Bundle | undefined {
  return toFocusBundles(bundles)[0];
}

/*
 * Ab wie vielen Messungen ein Marker bewertet werden darf. Ein einzelner Wert
 * hat keinen Vergleich: er kann der Zustand sein oder der Messtag. Ihn trotzdem
 * einzuordnen hiesse, aus einem Punkt eine Linie zu machen.
 *
 * ⚠️ PLATZHALTER. Die echte Regel wiegt spaeter auch das ALTER der Messung —
 * drei Werte aus dem letzten Jahrzehnt sind keine Datenlage.
 */
export const MIN_MEASUREMENTS_FOR_VERDICT = 2;

export type MarkerVerdict =
  /** Zu wenige Messungen, um irgendetwas zu sagen. Traegt NIE eine Farbe. */
  | "duenneDaten"
  | "unterReferenz"
  | "ueberReferenz"
  | "unterOptimum"
  | "ueberOptimum"
  | "imOptimum"
  /** Im Referenzbereich, und ein Optimalbereich ist fuer den Marker nicht gesetzt. */
  | "imReferenzbereich";

export interface MarkerReading {
  /** Letzter Messwert; null, wenn der Marker noch nie gemessen wurde. */
  value: number | null;
  /** Datum dieses Werts (ISO), null bei leerem Verlauf. */
  latestDate: string | null;
  /** Zahl der Messungen — sie entscheidet ueber die Datenlage. */
  measurements: number;
  verdict: MarkerVerdict;
}

/**
 * Wertet einen Marker aus. Die Pruefung auf duenne Datenlage steht ZUERST: so
 * gibt es keinen Weg durch diese Funktion, auf dem ein Marker mit zu wenigen
 * Messungen doch noch ein Urteil bekommt. Die Regel steht damit im Code und
 * nicht nur im Text darueber.
 */
export function toMarkerReading(marker: FindingMarker): MarkerReading {
  const latest = marker.history.at(-1);
  const reading = {
    value: latest?.value ?? null,
    latestDate: latest?.date ?? null,
    measurements: marker.history.length,
  };

  if (
    latest === undefined ||
    marker.history.length < MIN_MEASUREMENTS_FOR_VERDICT
  ) {
    return { ...reading, verdict: "duenneDaten" };
  }

  if (latest.value < marker.referenceLow) {
    return { ...reading, verdict: "unterReferenz" };
  }
  if (latest.value > marker.referenceHigh) {
    return { ...reading, verdict: "ueberReferenz" };
  }

  if (marker.optimalLow === undefined || marker.optimalHigh === undefined) {
    return { ...reading, verdict: "imReferenzbereich" };
  }
  if (latest.value < marker.optimalLow) {
    return { ...reading, verdict: "unterOptimum" };
  }
  if (latest.value > marker.optimalHigh) {
    return { ...reading, verdict: "ueberOptimum" };
  }
  return { ...reading, verdict: "imOptimum" };
}

/*
 * ============================================================================
 * PRAEPARATE — wann eine Einnahme als Wirkung zaehlt, und wann nicht.
 * ============================================================================
 * Drei Regeln, die in dieser Reihenfolge stehen muessen:
 *
 *   1. Ohne messbaren Zielmarker gibt es KEIN Urteil — "nicht beurteilbar".
 *   2. Vor dem Wirkfenster gibt es KEIN "keine Reaktion" — nur "zu frueh".
 *      Eine fehlende Wirkung vor dem Fenster ist keine fehlende Wirkung; sie
 *      ist eine Messung zur Unzeit.
 *   3. Ausgebliebene Wirkung NACH dem Fenster ist ein EIGENER Befund. Sie
 *      fuehrt zu einem angepassten Rat (Dosis, anderes Praeparat, absetzen),
 *      nie dazu, denselben Rat zu wiederholen. Der Text des Rats steht am
 *      Praeparat; dass er angepasst sein MUSS, steht hier.
 *
 * ⚠️ Schwellwerte und Wirkfenster sind PLATZHALTER (siehe Supplement).
 */

export type SupplementStatus =
  "wirkt" | "wirktSchwach" | "keineReaktion" | "zuFrueh" | "nichtBeurteilbar";

/**
 * Leitet den Status eines Praeparats ab. Die Reihenfolge der Pruefungen ist
 * die Regel — siehe Kommentarblock oben.
 */
export function toSupplementStatus(prep: Supplement): SupplementStatus {
  if (prep.targetMarker === null) {
    return "nichtBeurteilbar";
  }

  /* Vor dem Fenster: immer "zu frueh", egal welches Delta schon da waere. */
  if (prep.daysOn < prep.effectWindowDays.from) {
    return "zuFrueh";
  }

  if (prep.observedDelta === null) {
    return "nichtBeurteilbar";
  }

  /*
   * Delta in Wirkrichtung drehen: ein Anstieg bei expectedDirection "up" und
   * ein Abfall bei "down" sind dieselbe Aussage ("es tut, was es soll").
   */
  const aligned =
    prep.expectedDirection === "up" ? prep.observedDelta : -prep.observedDelta;

  if (aligned >= prep.strongDelta) {
    return "wirkt";
  }
  if (aligned >= prep.weakDelta) {
    return "wirktSchwach";
  }
  return "keineReaktion";
}

/**
 * Prueft, ob der actionHint bei "keine Reaktion" nicht dieselbe Dosis noch
 * einmal empfiehlt. Ein solcher Text waere genau der Fehler, den die Regel
 * verhindern soll — er wird deshalb hier abgefangen, nicht erst im Review.
 *
 * ENTSCHEIDUNG: Die Heuristik sucht nach Formulierungen, die die laufende
 * Einnahme unveraendert fortsetzen ("beibehalten", "weiternehmen",
 * "weiter so"). Sie ist absichtlich streng und lieber falsch-positiv: ein
 * angepasster Rat, der eines dieser Woerter braucht, muss anders formuliert
 * werden. Die echte Freigabe der Texte kommt spaeter mit dem Framework.
 */
export function isAdjustedActionHint(
  status: SupplementStatus,
  actionHint: string,
): boolean {
  if (status !== "keineReaktion") {
    return true;
  }
  const normalized = actionHint.toLowerCase();
  const repeatsSame = [
    "beibehalten",
    "weiternehmen",
    "weiter so",
    "unverändert fortsetzen",
    "unveraendert fortsetzen",
  ].some((phrase) => normalized.includes(phrase));
  return !repeatsSame;
}
