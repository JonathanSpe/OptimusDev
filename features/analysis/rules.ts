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

import type { Bundle, FindingMarker } from "./sample-data";

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
