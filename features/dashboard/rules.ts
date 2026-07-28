import type { Biomarker } from "@/contracts";

/*
 * ============================================================================
 * DIE DEUTUNG EINES MARKERS — die einzige Stelle, an der das Dashboard urteilt.
 * ============================================================================
 * ⚠️ DIESE DATEI HAT DIE REGEL DES DASHBOARDS GEAENDERT. Bis hierher galt:
 * "Das Dashboard zeigt, es bewertet nicht" — Wert, Verlauf, Referenzlage, und
 * die Einordnung passiert auf der Analyse-Oberflaeche. Jetzt faerbt die Kachel
 * den Verlauf nach der Lage des Werts und die Veraenderung nach ihrer Richtung.
 *
 * Die Deutung steht deshalb HIER und nicht im JSX: sie ist eine Aussage ueber
 * Gesundheitsdaten, und eine solche Aussage gehoert an eine Stelle, die man
 * pruefen, testen und im Zweifel zurueckdrehen kann — nicht verteilt auf drei
 * Klassenlisten in einer Komponente.
 *
 * ⚠️ SIE STEHT UND FAELLT MIT DEN GRENZWERTEN. referenceLow/High und
 * optimalLow/High sind laut contracts/biomarker.ts PLATZHALTER und nicht
 * klinisch validiert. Solange das so ist, faerbt diese Datei Entwurfswerte ein
 * — gruen heisst hier "innerhalb eines geschaetzten Bereichs" und nicht
 * "gesund". Vor dem Release muessen die Grenzwerte freigegeben sein; bis dahin
 * gehoert der Platzhalter-Hinweis sichtbar auf die Seite.
 */

/** Ein geschlossener Wertebereich. Beide Grenzen zaehlen als "drin". */
export interface ValueRange {
  low: number;
  high: number;
}

/**
 * Der aktuelle Wert ist der LETZTE Eintrag des Verlaufs — es gibt kein eigenes
 * Wertfeld, das davon abweichen koennte. Ein leerer Verlauf heisst "noch nicht
 * gemessen" und ergibt deshalb null, nicht 0.
 */
export function toCurrentValue(marker: Biomarker): number | null {
  return marker.history.at(-1)?.value ?? null;
}

/**
 * Der Optimalbereich ist optional und braucht BEIDE Grenzen. Liegt nur eine vor
 * oder stehen sie verdreht, gibt es keinen — lieber eine Zone weniger als eine
 * erfundene.
 */
export function toOptimalRange(marker: Biomarker): ValueRange | null {
  const { optimalLow, optimalHigh } = marker;
  if (optimalLow === undefined || optimalHigh === undefined) return null;
  if (optimalHigh <= optimalLow) return null;
  return { low: optimalLow, high: optimalHigh };
}

/**
 * Der Bereich, auf den es zulaeuft: der Optimalbereich, wo es einen gibt, sonst
 * der Referenzbereich. Ohne diese eine Quelle haette die Faerbung des Verlaufs
 * ein anderes Ziel als die Deutung der Veraenderung — dieselbe Kachel wuerde
 * dann zwei verschiedene Zielbereiche behaupten.
 */
export function toTargetRange(marker: Biomarker): ValueRange {
  return (
    toOptimalRange(marker) ?? {
      low: marker.referenceLow,
      high: marker.referenceHigh,
    }
  );
}

/**
 * Abstand zum Zielbereich; INNERHALB ist der Abstand 0. Damit ist "naeher
 * herangekommen" eine simple Subtraktion — und ein Wert, der von 12 auf 8
 * faellt, ist genauso weit gekommen wie einer, der von -12 auf -8 steigt.
 */
function toDistance(value: number, range: ValueRange): number {
  if (value < range.low) return range.low - value;
  if (value > range.high) return value - range.high;
  return 0;
}

/*
 * WO DER WERT STEHT — drei Stufen, weil es drei Baender gibt.
 *
 * "imZiel" heisst NICHT "gesund". Es heisst: dieser Wert liegt in dem Bereich,
 * den die Grenzwerte fuer diesen Marker als Ziel fuehren. Ein Mensch besteht
 * aus mehr als zwanzig Zahlen, und die Kachel weiss nur diese eine.
 */
export type MarkerStanding =
  /** Im Optimalbereich — oder im Referenzbereich, wo es keinen Optimalbereich gibt. */
  | "imZiel"
  /** Im Referenzbereich, aber ausserhalb des engeren Optimalbereichs. */
  | "grenzwertig"
  /** Ausserhalb des Referenzbereichs. */
  | "auffaellig"
  /** Noch nicht gemessen. Traegt NIE eine Farbe. */
  | "unbekannt";

export function toMarkerStanding(marker: Biomarker): MarkerStanding {
  const value = toCurrentValue(marker);
  if (value === null) return "unbekannt";

  if (value < marker.referenceLow || value > marker.referenceHigh) {
    return "auffaellig";
  }

  const optimal = toOptimalRange(marker);
  /*
   * Ohne Optimalbereich gibt es keine feinere Stufe: "im Referenzbereich" ist
   * dann alles, was die Daten hergeben, und das ist das Ziel. Hier "grenzwertig"
   * zu melden, waere eine Warnung, fuer die es keinen Grenzwert gibt.
   */
  if (optimal === null) return "imZiel";

  return value < optimal.low || value > optimal.high ? "grenzwertig" : "imZiel";
}

/*
 * Unterhalb dieser relativen Bewegung zeigt die Kachel keine Richtung: der
 * Prozentwert wird auf ganze Prozent gerundet, und ein Pfeil an einer 0 % waere
 * ein Widerspruch zur Zahl daneben. Dieselbe Schwelle entscheidet, ob eine
 * Veraenderung ueberhaupt gedeutet wird — Messrauschen ist kein Fortschritt.
 */
export const DELTA_THRESHOLD = 0.005;

/*
 * WOHIN DIE LETZTE VERAENDERUNG GING — gemessen am Zielbereich, nicht an der
 * Richtung der Zahl. Ein steigender Wert ist bei Ferritin gut und bei TSH
 * schlecht; was zaehlt, ist einzig, ob er dem Zielbereich naeher gekommen ist.
 * Genau deshalb braucht der Contract kein Feld "erwartete Richtung": sie steht
 * schon in den Grenzwerten.
 */
export type ChangeReading = "guenstig" | "unguenstig" | "neutral";

export function toChangeReading(marker: Biomarker): ChangeReading {
  const current = marker.history.at(-1)?.value;
  const previous = marker.history.at(-2)?.value;
  if (current === undefined || previous === undefined) return "neutral";

  /* Rauschen bleibt ungedeutet — dieselbe Schwelle wie beim Pfeil. */
  if (
    previous !== 0 &&
    Math.abs((current - previous) / previous) < DELTA_THRESHOLD
  ) {
    return "neutral";
  }

  const target = toTargetRange(marker);
  const before = toDistance(previous, target);
  const after = toDistance(current, target);

  /*
   * BEWEGUNG INNERHALB DES ZIELBEREICHS IST KEINE VERBESSERUNG. Wer von 5,0 auf
   * 5,4 geht und dabei die ganze Zeit im Ziel steht, hat nichts gewonnen und
   * nichts verloren — ihn gruen zu faerben, machte aus Schwankung Fortschritt
   * und aus dem naechsten Rueckweg einen Rueckschritt.
   */
  if (before === 0 && after === 0) return "neutral";

  if (after < before) return "guenstig";
  if (after > before) return "unguenstig";
  return "neutral";
}
