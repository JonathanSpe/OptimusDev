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
 * ============================================================================
 * DATENLAGE — dieselbe Groesse, in der Sprache des Lesers.
 * ============================================================================
 * Im Code, im Vertrag und in den Daten heisst diese Groesse weiter
 * `confidence`. SICHTBAR heisst sie "Datenlage", und sie tritt als WORT auf,
 * nicht als Zahl: "3 von 5" ist eine Skala, die nur wir kennen — wer sie liest,
 * muss raten, ob 3 viel ist. UI-Wort und Fachbegriff sind hier bewusst
 * entkoppelt; das Umbenennen der Felder waere eine Vertragsaenderung fuer eine
 * Textentscheidung.
 *
 * Die Punkte unter dem Ring bleiben: sie zeigen die Stufe, das Wort benennt
 * sie. Beide kommen aus derselben Zahl.
 */
export type EvidenceLevel = "gering" | "mittel" | "gut";

/**
 * Die Konfidenzstufe als Wort. "gut" beginnt genau dort, wo auch die Auswahl
 * der Ansatzpunkte greift (CONFIDENCE_SOLID) — Wort und Regel duerfen nicht
 * auseinanderlaufen, sonst empfiehlt die Analyse etwas, dessen Datenlage sie
 * selbst nur "mittel" nennt.
 */
export function toEvidenceLevel(confidence: number): EvidenceLevel {
  if (confidence >= CONFIDENCE_SOLID) return "gut";
  if (confidence >= CONFIDENCE_SOLID - 1) return "mittel";
  return "gering";
}

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
 * Rang je Buendel-Id — 1 bis 3 fuer die Ansatzpunkte, sonst kein Eintrag.
 *
 * Fuer Ansichten, die alle Buendel zeigen und nur wissen muessen, WELCHE davon
 * eine Nummer tragen. Sie ziehen ihre Nummer damit aus derselben Auswahl wie
 * jede Liste; ein zweites Kriterium ("die drei niedrigsten der Kategorie")
 * waere eine zweite Rangfolge und wuerde in einer Spalte eine Zeile betonen,
 * die die Analyse an anderer Stelle nicht empfiehlt.
 */
export function toFocusRanks(
  bundles: readonly Bundle[],
): ReadonlyMap<string, number> {
  return new Map(
    toFocusEntries(bundles).map((entry) => [entry.bundle.id, entry.rank]),
  );
}

/*
 * Die Reihenfolge der Buendel INNERHALB einer Kategorie: der staerkste zuerst.
 *
 * ENTSCHEIDUNG: absteigend nach Score und nicht nach Rang oder Kategorie-Nummer.
 * Die Spalte liest sich damit wie der Ring ueber ihr — voll ist besser, und wer
 * von oben nach unten liest, kommt beim Ansatzpunkt an. Eine Reihenfolge nach
 * Nummer waere die Reihenfolge des Fachmodells und keine Aussage; eine nach Rang
 * zoege die Ansatzpunkte nach oben und behauptete, der Rest sei Nachtrag.
 *
 * Bei Gleichstand entscheidet der Name, damit die Reihenfolge zwischen zwei
 * Renderings dieselbe bleibt.
 */
export function toCategoryBundles(
  bundles: readonly Bundle[],
  categoryId: string,
): readonly Bundle[] {
  return bundles
    .filter((bundle) => bundle.categoryId === categoryId)
    .toSorted((left, right) => {
      const score = right.score - left.score;
      return score !== 0 ? score : left.name.localeCompare(right.name, "de");
    });
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
 * Wie viele Marker die Entwicklung namentlich nennt.
 *
 * Drei, und die Zahl ist eine AUSSAGE ueber die Kachel und nicht ueber den
 * Platz: die Entwicklung zeigt, wohin es ging, und benennt die Bewegungen, die
 * das getragen haben. Dreizehn Zeilen daneben waeren wieder die Aufschluesselung,
 * die diese Kachel ersetzt hat — vollstaendig, aber ohne Aussage. Der
 * vollstaendige Weg zu allen Werten steht in der Tabelle unter der Kachel.
 *
 * Aufgefuellt wird nie: gibt es weniger vergleichbare Marker, stehen weniger da.
 */
export const TOP_CHANGE_COUNT = 3;

/**
 * Die Marker, deren Bewegung die Entwicklung namentlich nennt — die groessten
 * zuerst, hoechstens TOP_CHANGE_COUNT.
 */
export function toTopChanges(
  changes: readonly MarkerChange[],
): readonly MarkerChange[] {
  return toChangeOrder(changes).slice(0, TOP_CHANGE_COUNT);
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
 * Deshalb entscheidet EINE Regel, wie stark gezeigt wird: der Betrag der
 * Veraenderung seit dem vorherigen Test gegen ein Rauschband. Was darunter
 * bleibt, wird BLASS gezeichnet und behaelt ein graues Delta — es ist damit
 * weder verschwiegen noch zum Trend erklaert.
 *
 * ENTSCHEIDUNG: Vorher bekam eine Kategorie im Band GAR KEINE Linie, sondern
 * einen Satz unter der Kachel. Das war strenger und in einem Punkt falsch: das
 * Feld heisst "Entwicklung" und zeigte dann drei von vier Bereichen, ohne dass
 * dem Leser auffiel, dass einer fehlt — er sah drei Linien und hielt sie fuer
 * alle. Blass gezeichnet ist die vierte da, aber nicht mitgezaehlt. Was blass
 * BEDEUTET, sagt die Erklaerung am Kachelkopf; die Farbe ist also nicht das
 * einzige Signal, und die Tabelle nennt das Band ohnehin in Worten.
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
  /** Derselbe Bereich in einem Wort — die Fassung fuer die Beschriftung am
   * Linienende. Siehe CategoryScore.shortName. */
  shortName: string;
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
 * Auswahl, an der Linie, Beschriftung und Tabelle haengen. Sie steht hier und
 * nicht in der Komponente: eine Kategorie, deren Linie blass gezeichnet waere,
 * deren Delta daneben aber gruen stuende, waere derselbe Widerspruch wie zwei
 * Rangfolgen nebeneinander.
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
        shortName: category.shortName,
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

/** Was sich am Zielmarker seit Einnahmebeginn getan hat. */
export interface ObservedChange {
  /** Messwert bei Einnahmebeginn, in targetUnit. */
  baseline: number;
  /** Messwert am Bewertungsstichtag, in targetUnit. */
  current: number;
  /** current − baseline, in targetUnit. Vorzeichen ist die Richtung. */
  delta: number;
  /**
   * Dieselbe Bewegung relativ zum Ausgangswert. null, wenn der Ausgangswert 0
   * ist — eine Steigerung "um unendlich viel Prozent" ist keine Angabe.
   */
  ratio: number | null;
}

/**
 * Die beobachtete Veraenderung, oder null, wenn es keine zwei vergleichbaren
 * Messwerte gibt. EINE Stelle rechnet diese Differenz; Zeile und Status ziehen
 * beide von hier, sonst zeigt die Zeile eine Bewegung, die der Status nicht
 * kennt.
 */
export function toObservedChange(prep: Supplement): ObservedChange | null {
  const { baseline, current } = prep;
  if (baseline === null || current === null) return null;
  return {
    baseline,
    current,
    delta: current - baseline,
    ratio: baseline === 0 ? null : (current - baseline) / baseline,
  };
}

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

  const change = toObservedChange(prep);
  if (change === null) {
    return "nichtBeurteilbar";
  }

  /*
   * Delta in Wirkrichtung drehen: ein Anstieg bei expectedDirection "up" und
   * ein Abfall bei "down" sind dieselbe Aussage ("es tut, was es soll").
   */
  const aligned =
    prep.expectedDirection === "up" ? change.delta : -change.delta;

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
