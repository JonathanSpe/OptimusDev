/*
 * ============================================================================
 * DIE REGELN DER ANALYSE — einmal hingeschrieben, von allen gelesen.
 * ============================================================================
 * Zwei Haelften beantworten dieselbe Frage: die Flaeche der Landkarte
 * nummeriert die Ansatzpunkte, die Liste daneben benennt sie. Staende die Regel
 * zweimal im Code, wuerden die beiden irgendwann auseinanderlaufen — das Feld
 * betont ein Buendel, die Liste nennt ein anderes. Dem Leser faellt
 * nicht auf, dass dahinter zwei Kopien einer Regel stecken; ihm faellt auf,
 * dass die Analyse sich widerspricht, und dann glaubt er keiner der beiden.
 *
 * ⚠️ Alle Stufen hier sind PLATZHALTER. Sie kommen spaeter aus dem
 * Bluttest-Framework und muessen vor dem Release freigegeben werden.
 */

import type {
  Bundle,
  CategorySeries,
  FindingMarker,
  MarkerChange,
  Supplement,
} from "./sample-data";

/*
 * ⚠️ PLATZHALTER, und die EINZIGE Stelle, an der diese Stufe steht.
 *
 * Ab hier gilt eine Messung als belastbar. Eine Konfidenzgrenze sagt etwas
 * ueber unsere Daten ("ab hier ist belastbar gemessen") — das duerfen wir
 * behaupten. Eine Grenze auf dem SCORE wuerde etwas ueber den Menschen sagen
 * ("ab hier ist es schlecht"), und die ist klinisch zu setzen, nicht zu
 * schaetzen; deshalb gibt es sie hier nicht und nirgends sonst.
 *
 * Die Landkarte ZEICHNET diese Stufe nicht mehr. Eine Linie in der Flaeche wird
 * als Urteil gelesen, egal was daneben steht — die Stufe wirkt jetzt
 * ausschliesslich hier, in der Auswahl der Ansatzpunkte, und wird dort in
 * Worten genannt statt in einem Strich behauptet.
 */
export const CONFIDENCE_SOLID = 4;

/*
 * Betonung ohne Schwelle: betont werden nicht "alle unter X", sondern die
 * NIEDRIGSTEN der belastbar gemessenen Buendel, HOECHSTENS drei. Das ist eine
 * Rangfolge, keine Grenze — sie behauptet nicht, dass 72 schlecht ist, sondern
 * dass es unter den gut gemessenen das dritt-niedrigste ist. Drei, weil eine
 * Liste von Ansatzpunkten, die laenger ist als drei, keine Ansatzpunkte mehr
 * sind.
 *
 * Qualifizieren weniger als drei, stehen weniger da. AUFGEFUELLT WIRD NIE — ein
 * dritter Rang, der nur existiert, damit die Liste voll aussieht, behauptet
 * einen Ansatzpunkt, den die Daten nicht hergeben.
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

/** Ein Ansatzpunkt mit seiner Nummer. Rang 1 ist der niedrigste. */
export interface FocusEntry {
  bundle: Bundle;
  /** 1-basiert. Dieselbe Nummer traegt die Marke im Feld und die Zeile daneben. */
  rank: number;
}

/**
 * Dieselbe Auswahl, nummeriert. Feld und Liste ziehen ihre Nummer aus DIESER
 * Funktion — zwei Nummerierungen nebeneinander waeren zwei Rangfolgen.
 */
export function toFocusEntries(
  bundles: readonly Bundle[],
): readonly FocusEntry[] {
  return toFocusBundles(bundles).map((bundle, position) => ({
    bundle,
    rank: position + 1,
  }));
}

/**
 * Der EINE Ansatzpunkt: das niedrigste belastbar gemessene Buendel, Rang 1.
 * Kein belastbares Buendel — kein Ansatzpunkt; dann empfiehlt die Analyse
 * nichts. Fuer eine Zusammenfassung, die nur den ersten nennen will.
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
 * VERAENDERUNGEN — Richtung ist nicht Qualitaet.
 * ============================================================================
 * Das Dashboard nennt die Veraenderung als FAKT und faerbt sie deshalb nie:
 * ob ein Anstieg gut ist, haengt am Marker. Genau dieses Urteil faellt hier —
 * und es faellt AUSSCHLIESSLICH ueber die am Marker hinterlegte guenstige
 * Richtung. Aus dem Vorzeichen laesst es sich nicht ableiten: derselbe Pfeil
 * nach oben ist bei Ferritin die Erholung und bei LDL das Problem.
 *
 * Fehlt die Richtung, gibt es kein Urteil und keine Farbe. Das ist der
 * haeufigere Fall, nicht der Ausnahmefall — die meisten Marker sind in beide
 * Richtungen auffaellig.
 */

/*
 * Ab welcher Bewegung eine Zeile ueberhaupt von Bewegung spricht. Das ist eine
 * ANZEIGE-Regel und keine klinische: unter einem halben Prozent rundet der
 * Prozentwert auf "0 %", und ein Pfeil neben einer Null waere ein Widerspruch
 * in derselben Zeile. Dieselbe Schwelle traegt die Delta-Pille auf dem
 * Dashboard — dieselbe Messung darf nicht hier "unveraendert" heissen und dort
 * einen Pfeil bekommen.
 *
 * ⚠️ Die analytische Streuung des einzelnen Markers ist damit NICHT abgebildet:
 * ein Prozent Kreatinin ist Rauschen, ein Prozent TSH nicht.
 */
export const CHANGE_FLAT = 0.005;

/** Bewegungsrichtung — eine Beobachtung, noch kein Urteil. */
export type ChangeDirection = "up" | "down" | "flat";

export type ChangeVerdict =
  /** Bewegung in die am Marker hinterlegte guenstige Richtung. */
  | "guenstig"
  /** Bewegung gegen sie. */
  | "unguenstig"
  /** Keine Richtung hinterlegt — die Bewegung steht ohne Urteil da. */
  | "unbewertet"
  /** Unter der Anzeigeschwelle: ein eigener Befund, keine kleine Bewegung. */
  | "unveraendert";

export interface ChangeReading {
  /** Relative Veraenderung zum Vorwert, z. B. -0.364 fuer minus 36 Prozent. */
  ratio: number;
  direction: ChangeDirection;
  verdict: ChangeVerdict;
}

/**
 * Wertet eine Bewegung aus. Die Reihenfolge ist die Regel: erst "hat sich
 * ueberhaupt etwas bewegt", dann "ist die Richtung bekannt", erst zuletzt das
 * Urteil. So gibt es keinen Weg durch diese Funktion, auf dem eine unbekannte
 * Richtung doch noch eine Farbe bekommt.
 */
export function toChangeReading(change: MarkerChange): ChangeReading {
  /*
   * Ein Vorwert von 0 hat keine prozentuale Veraenderung. Solche Marker
   * entstehen als Zeile gar nicht erst (siehe toMarkerChanges) — hier faengt
   * die Regel den Fall trotzdem ab, statt Unendlich weiterzureichen.
   */
  if (change.previous === 0) {
    return { ratio: 0, direction: "flat", verdict: "unbewertet" };
  }

  const ratio = (change.current - change.previous) / change.previous;

  if (Math.abs(ratio) < CHANGE_FLAT) {
    return { ratio, direction: "flat", verdict: "unveraendert" };
  }

  const direction: ChangeDirection = ratio > 0 ? "up" : "down";

  if (change.favourable === null) {
    return { ratio, direction, verdict: "unbewertet" };
  }

  return {
    ratio,
    direction,
    verdict: direction === change.favourable ? "guenstig" : "unguenstig",
  };
}

/**
 * Die groesste Bewegung fuehrt. Bei Gleichstand entscheidet der Name, damit die
 * Reihenfolge zwischen zwei Renderings dieselbe bleibt.
 */
export function toChangeOrder(
  changes: readonly MarkerChange[],
): readonly MarkerChange[] {
  return changes.toSorted((left, right) => {
    const move =
      Math.abs(toChangeReading(right).ratio) -
      Math.abs(toChangeReading(left).ratio);
    return move !== 0 ? move : left.name.localeCompare(right.name, "de");
  });
}

/*
 * ============================================================================
 * DAS RAUSCHBAND — welche Kategorie sich wirklich bewegt hat.
 * ============================================================================
 * Zwischen zwei Tests bewegt sich jede Kategorie ein wenig. Das meiste davon
 * ist Streuung: Tagesform, Abnahmezeitpunkt, Labor. Eine Entwicklung, die
 * jeden dieser Ausschlaege als Linie zeichnet, zeigt vier Trends, wo es
 * vielleicht einen gibt — und der Leser kann nicht unterscheiden, welcher
 * davon etwas bedeutet.
 *
 * Deshalb entscheidet EINE Regel, was ueberhaupt gezeigt wird: der Betrag der
 * Veraenderung seit dem vorherigen Test gegen ein Rauschband. Was darunter
 * bleibt, bekommt keine Linie und keinen Chip — es wird in einem Satz genannt
 * und damit nicht verschwiegen, aber auch nicht zum Trend erklaert.
 *
 * ⚠️ PLATZHALTER, klinisch nicht freigegeben.
 */

/*
 * ENTSCHEIDUNG: Die Schwelle steht als NACHSCHLAGETABELLE mit Rueckfallwert,
 * nicht als eine Konstante. Die echten Baender kommen aus dem
 * Verlaufs-Framework (Teil 2) und sind dann PRO MARKER verschieden — ein
 * Prozent Kreatinin ist Rauschen, ein Prozent TSH nicht. Eine einzige globale
 * Zahl muesste man dafuer spaeter ueberall wieder aufbrechen; ein Eintrag je
 * Kategorie laesst sich ersetzen, ohne dass eine Komponente davon erfaehrt.
 *
 * Bis dahin traegt jede Kategorie denselben Platzhalter: drei Punkte auf der
 * Skala 0–100.
 */
const CATEGORY_NOISE: Readonly<Record<string, number>> = {
  k1: 3,
  k2: 3,
  k3: 3,
  k4: 3,
};

/** ⚠️ PLATZHALTER — Band fuer Kategorien ohne eigenen Eintrag. */
export const CATEGORY_NOISE_FALLBACK = 3;

/** Das Rauschband EINER Kategorie. Die einzige Stelle, die die Tabelle liest. */
export function toCategoryNoise(categoryId: string): number {
  return CATEGORY_NOISE[categoryId] ?? CATEGORY_NOISE_FALLBACK;
}

/** Die Bewegung einer Kategorie zwischen den letzten beiden Tests. */
export interface CategoryMovement {
  id: string;
  name: string;
  /** Stand beim vorherigen Test; null, wenn es keinen gibt. */
  previous: number | null;
  /** Datum dieses Vergleichs (ISO); null ohne Vorwert. */
  previousDate: string | null;
  current: number;
  currentDate: string;
  /** Punkte gegenueber dem vorherigen Test. 0, solange es keinen gibt. */
  delta: number;
  /** Das Band, gegen das diese Kategorie geprueft wurde. */
  noise: number;
  /** true = unterhalb des Bandes, also kein belastbarer Trend. */
  insideNoise: boolean;
}

/**
 * Alle Kategorien mit ihrer Bewegung, die groesste zuerst — und die EINE
 * Auswahl, an der Linien, Chips und Fusszeile haengen. Sie steht hier und nicht
 * in der Komponente: eine Kategorie, die eine Haarlinie bekommt, aber keinen
 * Chip, waere derselbe Widerspruch wie zwei Rangfolgen nebeneinander.
 *
 * Bei Gleichstand entscheidet der Name, damit die Reihenfolge zwischen zwei
 * Renderings dieselbe bleibt.
 */
export function toCategoryMovements(
  categories: readonly CategorySeries[],
): readonly CategoryMovement[] {
  return categories
    .map((category) => {
      const current = category.history.at(-1) ?? category.history[0];
      const previous = category.history.at(-2) ?? null;
      const noise = toCategoryNoise(category.id);
      const delta = previous === null ? 0 : current.value - previous.value;

      return {
        id: category.id,
        name: category.name,
        previous: previous?.value ?? null,
        previousDate: previous?.date ?? null,
        current: current.value,
        currentDate: current.date,
        delta,
        noise,
        /* Ohne Vorwert gibt es keine Bewegung — und damit auch keinen Trend. */
        insideNoise: previous === null || Math.abs(delta) < noise,
      };
    })
    .toSorted((left, right) => {
      const move = Math.abs(right.delta) - Math.abs(left.delta);
      return move !== 0 ? move : left.name.localeCompare(right.name, "de");
    });
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
