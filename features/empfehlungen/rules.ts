import type { Supplement, TargetRange } from "@/contracts";
import {
  CHANGE_FLAT,
  toObservedChange,
  toSupplementStatus,
} from "@/features/analysis";

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
 * DER ZIELMARKER ALS SCHIENE — was BiomarkerBar zeichnet.
 * ============================================================================
 * Dieselbe Begruendung wie in toEvidence, nur als Lage statt als Satz: wo der
 * Marker gestartet ist, wo er heute steht, wo er stehen soll. Die Zeile las
 * das vorher als grauen Fliesstext ("25-OH-Vitamin-D 17 → 44 ng/ml"); als
 * Schiene ist der wichtigste Teil der Zeile in einem Blick zu erfassen, statt
 * Zeile fuer Zeile gelesen zu werden.
 *
 * ⚠️ DIE SCHIENE IST KEINE ZWEITE QUELLE. Sie zeichnet genau die Werte aus dem
 * Vertrag — baseline, current, targetRange — und rechnet nichts hinzu. Der
 * gesprochene Text daneben kommt weiter aus toEvidence: eine Grafik und ein
 * Satz, die dasselbe sagen, aber nicht dieselbe Quelle haben, laufen
 * auseinander.
 *
 * ⚠️ KEINE STATUSFARBE, auch hier nicht. Die Seite ist farblos (siehe die
 * Farbregel in recommendation-board.tsx), und die Schiene bleibt es: sie
 * arbeitet mit LAGE und mit WORTEN, nicht mit Gruen und Bernstein. Die
 * Zustaende unten sind deshalb keine Farbstufen, sondern Faelle mit
 * verschiedenen Bestandteilen — mit oder ohne Startwert, mit oder ohne Punkt.
 */

/**
 * Was an einem Zielmarker ablesbar ist. FUENF Faelle und nicht vier: ein
 * gemessener Verlauf, der sich bewegt hat, aber den Zielbereich noch nicht
 * erreicht, ist der haeufigste von allen (Ferritin 41 → 68 bei Ziel 70–150).
 * Ihn "improved" zu nennen waere die Behauptung, das Ziel sei erreicht; ihn
 * "flat" zu nennen die Behauptung, es habe sich nichts bewegt. Beide waeren
 * falsch, also gibt es den Fall.
 */
export type BiomarkerBarState =
  /** Gemessen, und der aktuelle Wert liegt im Zielbereich. */
  | "improved"
  /** Gemessen und bewegt, aber noch nicht im Zielbereich. */
  | "moving"
  /** Gemessen, keine Bewegung ueber dem Rauschen. */
  | "flat"
  /** Laeuft, aber noch kein Wertepaar — noch nicht beurteilbar. */
  | "pending"
  /** Ansatzpunkt aus dem Test, noch keine Einnahme und kein Verlauf. */
  | "starting";

/**
 * Alles, was die Schiene braucht, aus einer Hand. `current` ist null im Fall
 * "starting" und "pending" — dann gibt es keinen Punkt zu setzen, und eine 0 an
 * seiner Stelle waere ein gezeichneter Messwert, den niemand gemessen hat.
 */
export interface BiomarkerReading {
  state: BiomarkerBarState;
  label: string;
  unit: string;
  range: TargetRange;
  baseline: number | null;
  current: number | null;
  /** Tage seit Einnahmebeginn, oder null: wird nicht genommen. */
  daysOn: number | null;
  /** Tag, ab dem ueberhaupt etwas zu erwarten ist (effectWindowDays.from). */
  assessableAfterDays: number;
  /** Formatiertes Datum, ab dem beurteilt werden kann, oder null. */
  assessableFrom: string | null;
  /**
   * Monat des Einnahmebeginns ("April"), oder null ohne Einnahme. Der Satz unter
   * der Schiene braucht einen Anfang fuer die Bewegung, und ein Monat ist die
   * groebste Angabe, die noch etwas sagt — ein Datum auf den Tag waere hier eine
   * Genauigkeit, die die Messung nicht hat.
   */
  startedIn: string | null;
}

/** Liegt der Wert im Zielbereich? Die Grenzen zaehlen mit. */
function isInTarget(value: number, range: TargetRange): boolean {
  return value >= range.min && value <= range.max;
}

/*
 * ⚠️ EINE BERECHNUNG, ZWEI DARSTELLUNGEN. isInTarget entscheidet BEIDES: ob der
 * Punkt der Schiene gefuellt ist und ob der Satz darunter "im Zielbereich" oder
 * "noch unter dem Zielbereich" sagt. Vorher las man an derselben Zeile zwei
 * verschiedene Antworten — Ferritin 68 bei Ziel ab 70: der Satz sagte "noch
 * unter", und der Punkt sah aus, als laege er drin, weil 2 von 144 Einheiten
 * Achse schmaler sind als der Punkt selbst. Wer hier eine zweite Schwelle
 * einfuehrt, holt genau diesen Widerspruch zurueck.
 */

/**
 * Die Lage am Zielmarker, oder null, wo es keinen gibt — dann zeichnet die
 * Zeile keine Schiene, statt eine leere zu zeigen.
 */
export function toBiomarkerReading(prep: Supplement): BiomarkerReading | null {
  const { targetMarker, targetRange, intake } = prep;
  if (targetMarker === null || targetRange === null) return null;

  const base = {
    label: targetMarker,
    unit: prep.targetUnit,
    range: targetRange,
    assessableAfterDays: prep.effectWindowDays.from,
  };

  if (intake === null) {
    /* Noch nicht genommen: es gibt einen Ansatzpunkt und sonst nichts. Kein
     * Startwert-Strich, kein Punkt — die Schiene zeigt nur, wohin es soll. */
    return {
      ...base,
      state: "starting",
      baseline: null,
      current: null,
      daysOn: null,
      assessableFrom: null,
      startedIn: null,
    };
  }

  const { baseline, current, daysOn, startedOn } = intake;

  if (baseline === null || current === null) {
    return {
      ...base,
      state: "pending",
      baseline,
      current: null,
      daysOn,
      assessableFrom: toDatePlusDays(startedOn, prep.effectWindowDays.from),
      startedIn: toMonthName(startedOn),
    };
  }

  /*
   * DIE SCHWELLE FUER "KEINE BEWEGUNG" IST DIE DER ANALYSE — CHANGE_FLAT, auf
   * dasselbe Verhaeltnis angewandt, das toObservedChange bildet. Eine eigene
   * Schwelle hier hiesse, dass dieselbe Messung auf zwei Seiten verschieden
   * bewertet wird; Omega-3 waere dann hier "bewegt" und in der Analyse "keine
   * Reaktion".
   */
  const observed = toObservedChange(prep);
  const moved =
    observed !== null &&
    (observed.ratio === null
      ? observed.delta !== 0
      : Math.abs(observed.ratio) > CHANGE_FLAT);

  const state: BiomarkerBarState = isInTarget(current, targetRange)
    ? "improved"
    : moved
      ? "moving"
      : "flat";

  return {
    ...base,
    state,
    baseline,
    current,
    daysOn,
    assessableFrom: toDatePlusDays(startedOn, prep.effectWindowDays.from),
    startedIn: toMonthName(startedOn),
  };
}

/*
 * ============================================================================
 * DER SATZ UNTER DER SCHIENE — er sagt, was die Lage bedeutet.
 * ============================================================================
 * ⚠️ KEINE WIRKAUSSAGE, wie ueberall. Was hier steht, ist die LAGE eines
 * Messwerts ("noch unter dem Zielbereich") und nie ein Nutzen. Der Unterschied
 * ist derselbe wie bei toEvidence: wo ein Wert steht, darf dastehen; dass ein
 * Praeparat ihn dorthin gebracht hat, nicht.
 */
export function toBarContext(reading: BiomarkerReading): string {
  const { state, baseline, current, range } = reading;

  if (state === "pending") return `Beurteilbar ab ${reading.assessableFrom}`;
  if (state === "starting") return "Ansatzpunkt aus deinem Test";

  /* Die drei gemessenen Faelle nennen den Startwert und dann die Lage. Ohne
   * Startwert bleibt die Lage allein — vorkommen kann das hier nicht, aber ein
   * "von null" waere die schlechteste Art, das herauszufinden. */
  const stand =
    state === "improved"
      ? "Zielbereich erreicht"
      : state === "flat"
        ? "unverändert"
        : /* "moving": die RICHTUNG gehoert dazu. Unter dem Ziel und darueber
           * sind zwei verschiedene Lagen, und "noch nicht erreicht" verschweigt
           * welche. */
          `noch ${current !== null && current < range.min ? "unter" : "über"} dem Zielbereich`;

  if (baseline === null) return stand;
  return `von ${markerFormat.format(baseline)} · ${stand}`;
}

/**
 * Der vollstaendige Wert als Satz — fuer Screenreader, weil die Grafik daneben
 * aria-hidden ist. Die Schiene darf nicht die einzige Quelle sein.
 */
export function toBarSpoken(reading: BiomarkerReading): string {
  const { label, unit, range, baseline, current } = reading;
  const suffix = unit ? ` ${unit}` : "";
  const ziel = `Zielbereich ${markerFormat.format(range.min)} bis ${markerFormat.format(range.max)}${suffix}`;

  if (current === null) {
    if (reading.state === "pending") {
      return `${label}: noch ohne zweite Messung, beurteilbar ab ${reading.assessableFrom}. ${ziel}.`;
    }
    return `${label}: noch nicht gemessen. ${ziel}.`;
  }

  const start =
    baseline === null ? "" : `von ${markerFormat.format(baseline)} `;
  return `${label}: ${start}auf ${markerFormat.format(current)}${suffix}. ${ziel}.`;
}

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

/** "2026-01-27" → "Januar". Ohne Date.now(), aus demselben Grund wie oben. */
function toMonthName(isoDate: string): string | null {
  const month = Number(isoDate.split("-")[1]);
  return MONTH_NAMES[month - 1] ?? null;
}

/**
 * Was im Wertfeld ueber der Schiene steht.
 *
 * ⚠️ KEIN GEDANKENSTRICH. Dort stand "—", und ein Strich ist keine Angabe: er
 * sieht aus wie ein fehlender Wert, also wie ein Fehler. Es gibt aber zwei
 * verschiedene Gruende, warum hier keine Zahl steht, und beide sind normal —
 * die Einnahme laeuft noch ohne zweite Messung, oder sie hat nicht begonnen.
 * Beides in Worten ist laenger als ein Strich und sagt etwas.
 */
export function toBarValue(reading: BiomarkerReading): string {
  if (reading.current !== null) {
    const suffix = reading.unit ? ` ${reading.unit}` : "";
    return `${markerFormat.format(reading.current)}${suffix}`;
  }
  return reading.state === "pending"
    ? "Wird gemessen"
    : "Erstmessung ausstehend";
}

/*
 * ============================================================================
 * DIE DEUTUNG DER ZEILE — ein Satz, angeschnitten.
 * ============================================================================
 * Die Seite sah aus wie eine Empfehlung ohne Begruendung: eine Schiene mit drei
 * Zahlen, und daneben ein grauer Pfeil, der nichts versprach. Dieser Satz sagt
 * in Worten, was die Schiene zeigt, und er ist ABSICHTLICH zu lang fuer seine
 * Zeile — der Anschnitt ist die Einladung, die Zeile aufzuklappen. Vollstaendig
 * steht er dann oben im Aufgeklappten.
 *
 * ⚠️ KEINE WIRKAUSSAGE, wie ueberall auf dieser Seite. Der Satz sagt, wo ein
 * MESSWERT steht und wohin er sich bewegt hat. Er sagt nicht, dass ein
 * Praeparat ihn dorthin gebracht hat — auch nicht in der Verneinung.
 *
 * ⚠️ ER IST AUS DEN MESSWERTEN GEBAUT UND KEINE REDAKTION. Der Entwurf wollte
 * hier eine Einordnung, die auf den Menschen eingeht ("… der bei Ausdauersport
 * relevant ist"). Genau das kann diese Datei nicht: sie kennt Zahlen. Ein Feld
 * fuer den redaktionellen Satz fehlt im Vertrag, siehe Bericht.
 */
export function toInterpretation(reading: BiomarkerReading): string {
  const { label, unit, range, baseline, current, state } = reading;
  const suffix = unit ? ` ${unit}` : "";
  const ziel = `${markerFormat.format(range.min)}–${markerFormat.format(range.max)}${suffix}`;
  const seit = reading.startedIn === null ? "" : ` seit ${reading.startedIn}`;

  if (state === "starting") {
    return `${label} ist ein Ansatzpunkt aus deinem Test: der Zielbereich liegt bei ${ziel}, und der Verlauf beginnt mit der ersten Messung nach dem Start.`;
  }

  if (state === "pending") {
    return `${label} wird zum nächsten Test gemessen. Die Einnahme läuft${seit}, beurteilbar ab ${reading.assessableFrom} — bis dahin gibt es keinen zweiten Wert zum Vergleich.`;
  }

  const heute = `${markerFormat.format(current ?? 0)}${suffix}`;

  if (state === "flat") {
    return `${label} liegt${seit} unverändert bei ${heute}, während der Zielbereich bei ${ziel} liegt.`;
  }

  const start =
    baseline === null ? "" : `von ${markerFormat.format(baseline)} auf `;
  const richtung =
    baseline !== null && current !== null && current < baseline
      ? "gefallen"
      : "gestiegen";

  if (state === "improved") {
    return `${label} ist${seit} ${start}${heute} ${richtung} und liegt damit im Zielbereich von ${ziel}.`;
  }

  /* "moving": die RICHTUNG der Lage gehoert dazu. Unter dem Ziel und darueber
   * sind zwei verschiedene Staende, und "noch nicht erreicht" verschweigt
   * welcher. */
  const lage =
    current !== null && current < range.min
      ? `noch unter dem Zielbereich, der bei ${markerFormat.format(range.min)}${suffix} beginnt`
      : `noch über dem Zielbereich, der bei ${markerFormat.format(range.max)}${suffix} endet`;
  return `${label} ist${seit} ${start}${heute} ${richtung} und liegt ${lage}.`;
}

/*
 * ============================================================================
 * DAS AUFGEKLAPPTE — die Begruendung in Feldern, und nur die vorhandenen.
 * ============================================================================
 * ⚠️ FEHLENDE FELDER WERDEN WEGGELASSEN und nicht leer gerendert. Eine Zeile
 * "Quelle: —" ist keine Auskunft, sondern der Hinweis, dass wir eine Zeile
 * gebaut haben, fuer die es keine Daten gibt.
 *
 * ⚠️ WAS HIER FEHLT, steht im Bericht: es gibt kein Feld fuer die Begruendung
 * der DOSIERUNG und keines fuer den naechsten Messzeitpunkt. Was stattdessen
 * dasteht, ist der naechste Schritt (actionHint) und — wo die Einnahme noch
 * laeuft — der Tag, ab dem sie beurteilbar ist. Beides sind andere Angaben, und
 * sie geben sich nicht als die fehlenden aus.
 */
export interface ReasonDetail {
  label: string;
  value: string;
}

export function toReasonDetails(prep: Supplement): readonly ReasonDetail[] {
  const details: ReasonDetail[] = [];
  const reading = toBiomarkerReading(prep);
  const suffix = prep.targetUnit ? ` ${prep.targetUnit}` : "";

  if (reading !== null) {
    const { range } = reading;
    const ziel = `Zielbereich ${markerFormat.format(range.min)}–${markerFormat.format(range.max)}${suffix}`;

    details.push({
      label: "Messwert",
      value:
        reading.current === null
          ? `noch keine zweite Messung · ${ziel}`
          : `${markerFormat.format(reading.current)}${suffix} · ${ziel}`,
    });

    if (reading.baseline !== null && reading.current !== null) {
      details.push({
        label: "Verlauf",
        value: `${markerFormat.format(reading.baseline)}${suffix} bei Einnahmebeginn, ${markerFormat.format(reading.current)}${suffix} im Test vom ${EVALUATION_DATE}`,
      });
    }
  }

  /* Die Dosis steht immer, ihre Begruendung nur, soweit die Daten eine kennen:
   * actionHint ist der naechste Schritt und wird deshalb auch so genannt. */
  details.push({ label: "Dosierung", value: prep.dose });
  details.push({ label: "Nächster Schritt", value: prep.actionHint });

  if (reading?.assessableFrom !== null && reading?.state === "pending") {
    details.push({
      label: "Nächste Beurteilung",
      value: `ab ${reading.assessableFrom}, wenn das erwartete Wirkfenster beginnt`,
    });
  }

  details.push({
    label: "Quelle",
    value:
      prep.basis === "messung"
        ? `Blutwert aus deinem Test vom ${EVALUATION_DATE}`
        : "Deine Angaben im Fragebogen, kein Blutwert",
  });

  return details;
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
 * ============================================================================
 * ⚠️ BEANTWORTETE FRAGE: "OPTIONAL" WIRD NICHT MEHR VORGESCHLAGEN.
 * ============================================================================
 * Hier stand eine offene Frage an das Produkt, und sie ist entschieden: nein.
 * "Optional" heisst in diesem Produkt ausdruecklich "wir koennen dazu nichts
 * sagen" — es gibt keinen messbaren Zielmarker. Etwas vorzuschlagen, worueber
 * die Auswertung nichts weiss, waere ein Vorschlag des Geschaefts im Gewand
 * eines Befunds. Optionale Ergaenzungen sind deshalb OPT-IN: sie stehen in
 * ihrem Abschnitt, ausgeschaltet, und kommen erst durch einen Klick in Korb
 * und Summe.
 *
 * ⚠️ WAS LAEUFT, LAEUFT WEITER. Opt-in gilt fuer den VORSCHLAG und nicht gegen
 * den Bestand: ein optionales Praeparat, das im Abo liegt (Ashwagandha), bleibt
 * ohne Vormerkung darin. Es auszutragen waere die Kuendigung einer laufenden
 * Einnahme, weil unsere Auswertung nichts dazu sagen kann — das waere der
 * Fehler in der anderen Richtung und teurer als der erste.
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

    /* Opt-in: der Vorschlag traegt nur, was die Messung traegt. */
    if (strength === "optional") continue;

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

/*
 * ============================================================================
 * DER KOPF DER SEITE — eine AUSWERTUNG, kein Angebot.
 * ============================================================================
 * Hier stand ein Hero mit Produktfoto, Anzahl und Monatspreis: was man bekommt
 * und was es kostet, ganz oben, vor jeder Begruendung. Damit war die erste
 * Aussage der Seite eine kommerzielle, und die Liste darunter las sich als
 * Bestellung.
 *
 * ⚠️ DIE LINKE SPALTE TRAEGT KEINEN BETRAG MEHR — nirgends, auch nicht klein
 * und grau. Preise, Bilanz und Bestaetigung stehen im Warenkorb, und der ist
 * die EINE kommerzielle Flaeche dieser Seite. Der Kopf sagt stattdessen, was
 * der Test ergeben hat: wie viele Werte sich bewegt haben, welche im
 * Zielbereich liegen, wie viele Ansatzpunkte neu dazugekommen sind.
 *
 * ⚠️ ES BLEIBT KEINE SEITENUEBERSCHRIFT (siehe AGENTS.md): kein h1, kein
 * Eyebrow ueber dem Seitennamen. Was hier steht, ist das ERGEBNIS und nicht der
 * Name der Seite.
 */

/*
 * ============================================================================
 * ⚠️ DREI DATEN, DIE NOCH KEIN FELD HABEN.
 * ============================================================================
 * Der Kopf nennt den Test, auf dem die Auswertung beruht, und den Vortest, mit
 * dem sie vergleicht; die Lieferkachel nennt den ersten Liefermonat. Keines von
 * beidem steht im Vertrag: die Testtermine liegen an der Auswertung, der
 * Liefertakt an der Fulfillment-Seite, die es nicht gibt.
 *
 * Sie stehen deshalb HIER und nicht in den Komponenten — vorher stand das
 * Testdatum als Zeichenkette mitten im Warenkorb, und der Kopf haette daneben
 * eine zweite gebraucht. Zwei Stellen mit demselben Datum laufen auseinander,
 * sobald eine angefasst wird.
 *
 * ⚠️ NICHT AUS Date.now() ABLEITEN. Server und Client muessen dieselbe
 * Zeichenkette erzeugen, sonst weicht die Hydration ab — dieselbe Regel wie bei
 * toDatePlusDays und den Datumsangaben der Kontext-Leiste. Sobald es Felder
 * gibt, kommen die Werte aus den Daten und diese Konstanten fallen weg.
 */

/** ⚠️ PLATZHALTER — Datum der Auswertung, auf der die Empfehlung beruht. */
export const EVALUATION_DATE = "21.07.2026";

/** ⚠️ PLATZHALTER — Monat des Vortests, mit dem der Kopf vergleicht. */
export const PREVIOUS_TEST_MONTH = "Januar";

/** ⚠️ PLATZHALTER — Monat, ab dem das Tagespack geliefert wird. */
export const DELIVERY_FROM_MONTH = "August";

/**
 * Was der Test ergeben hat — die Zahlen des Kopfes.
 *
 * ⚠️ SIE ZAEHLEN WERTE UND NICHT PRAEPARATE. "6 von 8 Werten" bezieht sich auf
 * die Zielmarker mit zwei Messpunkten; ein Praeparat ohne Marker (aus dem
 * Fragebogen) kommt in dieser Rechnung gar nicht vor, weil an ihm nichts
 * gemessen ist. Ein Zaehler, der beides mischte, waere die Behauptung, wir
 * haetten zu jedem Praeparat einen Wert.
 */
export interface EvaluationSummary {
  /** Werte mit zwei Messpunkten — die Grundgesamtheit von `closer`. */
  compared: number;
  /**
   * Davon die, deren ABSTAND ZUM ZIELBEREICH kleiner geworden ist.
   *
   * ⚠️ DAS IST GENAU DIE AUSSAGE DER SCHLAGZEILE und nicht ihre Annaeherung:
   * "liegen näher am Zielbereich" ist wahr, wenn der Abstand gesunken ist, und
   * genau das rechnet toTargetDistance. Deshalb braucht die Zahl keine
   * Wirkrichtung — bei einem Wert, der ueber das Ziel hinausgeschossen ist, waere
   * "in die erwuenschte Richtung bewegt" wahr und "näher am Zielbereich" falsch.
   */
  closer: number;
  /** Namen der Marker, die im Zielbereich liegen. */
  inTarget: readonly string[];
  /** Ansatzpunkte aus dem Test, zu denen noch nichts laeuft. */
  newStarts: number;
  /**
   * Gibt es ueberhaupt einen Vergleich? Ohne zwei Messpunkte an irgendeinem
   * Marker kann der Kopf keine Bewegung nennen und faellt auf die Ansatzpunkte
   * zurueck — der Erstbesuch nach dem ersten Test.
   */
  hasPreviousTest: boolean;
}

/** Abstand eines Werts zum Zielbereich. 0 heisst: er liegt darin. */
function toTargetDistance(value: number, range: TargetRange): number {
  if (value < range.min) return range.min - value;
  if (value > range.max) return value - range.max;
  return 0;
}

export function toEvaluationSummary(
  supplements: readonly Supplement[],
): EvaluationSummary {
  let compared = 0;
  let closer = 0;
  let newStarts = 0;
  const inTarget: string[] = [];

  for (const prep of supplements) {
    const reading = toBiomarkerReading(prep);
    if (reading === null) continue;

    if (reading.state === "starting") {
      newStarts += 1;
      continue;
    }

    if (reading.baseline === null || reading.current === null) continue;

    compared += 1;
    if (reading.state === "improved") inTarget.push(reading.label);

    const vorher = toTargetDistance(reading.baseline, reading.range);
    const heute = toTargetDistance(reading.current, reading.range);
    if (heute < vorher) closer += 1;
  }

  return {
    compared,
    closer,
    inTarget,
    newStarts,
    hasPreviousTest: compared > 0,
  };
}

/**
 * Der Satz unter der Schlagzeile des Kopfes: welche Werte im Zielbereich
 * stehen, und wie viele Ansatzpunkte neu dazugekommen sind. Leer, wo es zu
 * beidem nichts zu sagen gibt — ein Satz, der "0 Werte und 0 Ansatzpunkte"
 * meldet, ist eine Fehlermeldung mit Punkt am Ende.
 */
export function toEvaluationSentence(summary: EvaluationSummary): string {
  const parts: string[] = [];
  const { inTarget, newStarts } = summary;

  if (inTarget.length === 1) {
    parts.push(`${inTarget[0]} liegt im Zielbereich`);
  } else if (inTarget.length > 1) {
    const last = inTarget[inTarget.length - 1];
    parts.push(
      `${inTarget.slice(0, -1).join(", ")} und ${last} liegen im Zielbereich`,
    );
  }

  if (newStarts === 1) {
    parts.push("ein Ansatzpunkt ist neu dazugekommen");
  } else if (newStarts > 1) {
    parts.push(`${newStarts} Ansatzpunkte sind neu dazugekommen`);
  }

  if (parts.length === 0) return "";
  return `${parts.join(", ")}.`;
}

/*
 * ============================================================================
 * DIE BEGRUENDUNG EINES ABGANGS — ein Satz, nicht eine durchgestrichene Zahl.
 * ============================================================================
 * Der Abschnitt "Fällt weg" zeigte bisher dieselbe Zeile wie die anderen, nur
 * durchgestrichen. Damit musste man aus zwei Messwerten selbst schliessen,
 * warum etwas herausfaellt. Der Satz sagt es.
 *
 * ⚠️ KEINE WIRKAUSSAGE, auch nicht in der Verneinung. "kein messbarer Effekt"
 * waere eine — sie spricht ueber die Wirkung des Praeparats, nur mit einem
 * "kein" davor, und die Seite darf ueber Wirkung nichts sagen, in keine
 * Richtung. Was dasteht, ist die MESSUNG: der Wert hat sich nicht bewegt.
 * Warum das zum Absetzen fuehrt, sagt der Abschnittstitel.
 */
export function toDropReason(prep: Supplement): string {
  const reading = toBiomarkerReading(prep);

  if (reading === null || reading.current === null) {
    /* Kein Zielmarker oder kein Wertepaar. Dann traegt nur die Herkunft — und
     * ein Abgang ohne Messung ist ohnehin keiner, den diese Auswertung
     * vorschlaegt (siehe toRecommendationStrength). */
    return "Aus deinen Angaben ergibt sich hier keine Empfehlung mehr.";
  }

  const unit = reading.unit ? ` ${reading.unit}` : "";
  const value = markerFormat.format(reading.current);

  if (reading.state === "flat") {
    return `${reading.label} seit Start unverändert bei ${value}${unit} — keine messbare Veränderung.`;
  }

  /* Bewegt, aber nicht genug: die Zahl steht da, das Urteil traegt die
   * Ueberschrift des Abschnitts. */
  const start =
    reading.baseline === null
      ? ""
      : ` (Start ${markerFormat.format(reading.baseline)}${unit})`;
  return `${reading.label} bei ${value}${unit}${start} — die Bewegung bleibt unter der Schwelle, ab der wir sie ablesen.`;
}
