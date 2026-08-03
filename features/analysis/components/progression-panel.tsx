"use client";

import { scaleLinear, scalePoint } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { motion } from "motion/react";
import { useEffect, useId, useRef, useState, type RefObject } from "react";

import { PanelExplainer } from "@/components/common/panel-explainer";
import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  toCategoryMovements,
  toChangeReading,
  toTopChanges,
  type CategoryMovement,
  type ChangeVerdict,
} from "../rules";
import {
  SCORE_MAX,
  SCORE_MIN,
  categoryIdByMarker,
  type CategorySeries,
  type MarkerChange,
  type ScoreSummary,
} from "../sample-data";
import { CategoryIcon } from "./category-icon";
import { ScoreDelta, toDeltaText } from "./score-delta";

/*
 * ============================================================================
 * DIE ENTWICKLUNG — ein Feld, vier Linien, vier Namen.
 * ============================================================================
 * Diese Kachel ersetzt zwei: den Verlauf (fuenf gleichberechtigte Linien) und
 * die Aufschluesselung (dreizehn Marker-Zeilen). Beide beantworteten dieselbe
 * Frage — "was hat sich veraendert?" — und beide antworteten mit einer Liste.
 * Zwei Listen nebeneinander sind aber keine Antwort, sondern eine Aufgabe: der
 * Leser muss selbst herausfinden, was davon zaehlt.
 *
 * Hier steht die Antwort ZWEIMAL, in zwei Auflösungen, und beide stehen offen
 * da:
 *
 *   DAS FELD     wohin es ging. Jede Linie ist ein Bereich, ihre Beschriftung
 *                steht an ihrem ENDE — dort, wo sie aufhoert, und nicht in einer
 *                Legende, die man erst zuordnen muss.
 *   DIE LISTE    was es getragen hat. Die drei groessten Marker-Bewegungen mit
 *                Werten, Einheit und Urteil.
 *
 * WAS HIER NICHT MEHR STEHT, IST DIE ZAHL. Der Gesamtscore stand als 71 am Kopf
 * dieser Kachel — und zugleich in 72px auf der dunklen Kachel derselben Seite.
 * Dieselbe Zahl zweimal auf einem Bildschirm ist keine Betonung, sondern die
 * Frage, ob es zwei Zahlen sind.
 *
 * ES GIBT AUCH KEINE CHIPS MEHR. Sie waren ein Umweg: man hielt einen Chip, um
 * eine Linie vortreten zu sehen, und klickte ihn, um Marker aufzuklappen. Die
 * Beschriftung am Linienende macht den ersten Schritt unnoetig, die Liste
 * darunter den zweiten — und beides steht jetzt da, ohne dass jemand danach
 * greifen muss.
 *
 * ENTSCHEIDUNG (kehrt eine fruehere um): UND ES GIBT KEINE GESAMTLINIE MEHR.
 *
 * Hier stand bis eben, die Marke trete in diesem Feld genau einmal auf — als
 * die eine rote Linie des Gesamtscores, "die Antwort auf die Frage, die das
 * Feld stellt". Diese Linie ist auf Anweisung entfernt, und das Argument gegen
 * sie ist dasselbe, mit dem die ZAHL zwei Absaetze weiter oben verschwunden
 * ist: der Gesamtscore steht auf derselben Seite schon in 72px auf der dunklen
 * Kachel, mit eigenem Verlauf darunter. Er war hier die fuenfte Linie fuer eine
 * Angabe, die zwei Kacheln weiter links vollstaendig beantwortet ist — und weil
 * er als einziger farbig war, zog er den Blick auf die Wiederholung statt auf
 * die vier Bereiche, die es hier zu vergleichen gibt.
 *
 * Was das kostet, steht hier, damit es niemand suchen muss:
 *
 *   KEIN AKZENT MEHR. Das Feld ist jetzt vollstaendig grau. Der Markenton ist
 *   dadurch in dieser Kachel gar nicht mehr vertreten — was der Farbpolitik
 *   nicht widerspricht (Rot ist Akzent, keine Pflicht), aber die Kachel
 *   braucht ihre Ordnung jetzt aus Strichstaerke, Zeichen und Beschriftung.
 *   Deshalb tragen die Beschriftungen seit derselben Aenderung ein
 *   Bereichszeichen (CategoryIcon).
 *
 *   KEIN ANKER FUER DEN AUFTRITT. Vorher zeichnete sich die tragende Linie
 *   zuerst, alles Uebrige wartete auf ihr Ende. Jetzt zeichnen alle vier
 *   Linien versetzt, und Achse, Punkte und Beschriftungen warten auf die
 *   letzte — siehe linesDrawn.
 */

/*
 * DIE ERKLAERUNG DER KACHEL — hinter dem ⓘ am Kopf, einmal im Code.
 *
 * Sie muss die eine Notation in Worte fassen, die man sonst nicht erraten kann:
 * dass eine BLASSE Linie eine Bewegung im Rauschband ist. Ohne diesen Satz waere
 * der Blassgrad eine Farbe mit Bedeutung und sonst nichts — genau das, was
 * Farbe nie sein darf.
 */
const PROGRESSION_EXPLAINER =
  "Jede Linie ist einer deiner vier Bereiche; ihr Zeichen und ihr Name stehen an ihrem Ende. Alle vier sind gleich gezeichnet — welche Bewegung belastbar ist, sagt die Angabe neben dem Namen: Bereiche, deren Veränderung im Rauschband liegt, tragen sie grau. Dort ist der Unterschied kleiner als die Streuung zwischen zwei Tests, also noch kein Trend. Die Achse links zeigt einen Ausschnitt der Skala 0 bis 100 und beginnt nicht bei null — sie folgt deinen Werten und kann von Test zu Test anders sitzen. Vergleiche deshalb die Zahlen und nicht, wie steil eine Linie aussieht. Deinen Gesamtscore findest du auf der Kachel links.";

/* ------------------------------------------------------------------------- */
/* Formate                                                                     */
/* ------------------------------------------------------------------------- */

const markerFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

/* Dieselbe Rundung wie die Delta-Pille auf dem Dashboard. */
const percentFormat = new Intl.NumberFormat("de-DE", {
  style: "percent",
  signDisplay: "exceptZero",
  maximumFractionDigits: 0,
});

/**
 * "2026-05-26" wird zu "26.05" — ohne Date-Objekt, also ohne Zeitzone.
 *
 * Ohne Schlusspunkt: der Punkt am Ende gehoert zur Ordinalzahl eines
 * ausgeschriebenen Datums. In einer Achsenzeile, in der vier Termine
 * untereinander dieselbe Form haben, ist er ein Satzzeichen ohne Satz — und vier
 * davon nebeneinander lesen sich als Auslassung.
 */
function toShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return month && day ? `${day}.${month}` : isoDate;
}

function toLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}

/**
 * Aufzaehlung in deutschem Satzbau: "A", "A und B", "A, B und C". Ein Komma vor
 * dem letzten Eintrag waere hier ein Aufzaehlungszeichen, kein Satz.
 */
function toGermanList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} und ${parts.at(-1)}`;
}

/**
 * Wort, Ton und Fuellung der Marker-Bewegung. Ohne hinterlegte Richtung: kein
 * Urteil. Die Fuellungen sind dieselben wie bei VerdictChip und ScoreDelta —
 * drei Zuordnungen fuer dieselben drei Toene sind eine zuviel, aber sie hier
 * zusammenzulegen hiesse, eine Marker-Richtung und ein Score-Urteil in einen
 * Topf zu werfen. Sie bleiben getrennt und tragen dieselben Klassen.
 */
const VERDICT_TONE: Readonly<
  Record<ChangeVerdict, { tone: string; pill: string; label: string }>
> = {
  guenstig: {
    tone: "text-success",
    pill: "bg-success-subtle",
    label: "günstig",
  },
  unguenstig: {
    tone: "text-warning",
    pill: "bg-warning-subtle",
    label: "ungünstig",
  },
  unbewertet: {
    tone: "text-muted-foreground",
    pill: "bg-muted",
    label: "ohne Urteil",
  },
  unveraendert: {
    tone: "text-muted-foreground",
    pill: "bg-muted",
    label: "unverändert",
  },
};

/* ------------------------------------------------------------------------- */
/* Geometrie                                                                   */
/* ------------------------------------------------------------------------- */

/*
 * toScoreDomain und toGridTicks sind exportiert, weil sie geprueft werden
 * (test/progression-axis.test.ts) — nicht, weil sie jemand sonst braucht. Sie
 * stehen deshalb NICHT in features/analysis/index.ts: die oeffentliche Flaeche
 * des Bereichs bleibt die Kachel, nicht ihre Achsenrechnung.
 */

/** Hoehe des Feldes in Pixeln. */
const FIELD_HEIGHT = 224;

/**
 * Raster, auf das die Achse einschnappt. Eine Achse, die 64,6 bis 68,4
 * beschriftet, ist keine Achse, sondern vier Kommazahlen: runde Werte sind die
 * Voraussetzung dafuer, dass eine Beschriftung ueberhaupt lesbar ist, und sie
 * halten die Spanne ausserdem ueber mehrere Tests stabil — sie springt nur in
 * Zehnerschritten und nicht bei jedem neuen Messwert.
 */
const DOMAIN_SNAP = 10;

/**
 * Um welchen Faktor die Spanne der Achse das Rauschband mindestens uebersteigt.
 *
 * DIES IST DER EINE WAECHTER, DEN DIE ACHSE BRAUCHT. Eine frei auf die Daten
 * gezogene Achse macht aus einer Bewegung von drei Punkten die ganze Feldhoehe —
 * und drei Punkte sind genau das Band, das diese Kachel als BLASS zeichnet und
 * im ⓘ-Text ausdruecklich noch keinen Trend nennt. Ohne Bodensatz wuerde die
 * Achse also mit echten Zahlen bekraeftigen, was die Farbe daneben relativiert.
 *
 * Bei 8 belegt eine Bewegung am Rand des Rauschbands hoechstens ein Achtel der
 * Hoehe: sichtbar, aber keine Steigung. Der Faktor haengt am Band und nicht an
 * einer eigenen Zahl — kommen die echten Baender aus dem Verlaufs-Framework,
 * folgt die Achse ihnen, ohne dass hier etwas angefasst wird.
 */
const NOISE_HEADROOM = 8;

/**
 * Hoechstzahl der Gitterlinien. Sechs auf 224px sind rund 45px Abstand — darunter
 * liest sich das Feld als Millimeterpapier, und ein Netz zieht die
 * Aufmerksamkeit auf sich statt unter die Linien.
 */
const MAX_GRID_LINES = 6;

/**
 * Die Spanne der Wertachse — die ganze Rechnung an EINER Stelle, als reine
 * Funktion. Sie stand vorher mitten im Rendern von TrendField; dort war sie
 * weder nachzurechnen noch zu testen, und genau daran haengt hier alles: teilt
 * die Skala durch eine Spanne von null, wird jede Koordinate im Feld zu NaN.
 *
 * Die drei Zusagen, die sie einhaelt:
 *
 *   MITTIG   Die Daten sitzen in der Mitte der Spanne, die Grenzen schnappen
 *            nach aussen auf DOMAIN_SNAP.
 *   BREIT    Die Spanne ist mindestens `minSpan` (das Rauschband mal
 *            NOISE_HEADROOM) und in JEDEM Fall mindestens ein Rasterschritt.
 *   NIE NULL `high` ist immer echt groesser als `low`. Beweis: `low` rundet auf
 *            hoechstens den kleinsten Datenwert ab, `high` auf mindestens
 *            `kleinster + span` auf, und `span` ist mindestens DOMAIN_SNAP.
 *
 * Randfaelle, die hier abgefangen sind:
 *
 *   OHNE WERTE   Traegt keine Reihe eine Messung, liefert Math.min() Infinity
 *                und die Mitte NaN. Dann steht die ganze Skala da — ein Feld
 *                ohne Daten zeigt den Massstab, nicht ein NaN-Gitter.
 *   ALLE GLEICH  Spanne der Daten null; der Boden traegt sie.
 *   AM ANSCHLAG  Liegen die Werte an 0 oder SCORE_MAX, wuerde die Klammer der
 *                Spanne ein Stueck abschneiden und das Rauschband damit wieder
 *                aufblasen. Was ein Ende an der Skalengrenze verliert, holt das
 *                andere deshalb nach.
 */
export function toScoreDomain(
  values: readonly (number | null)[],
  minSpan: number,
): { low: number; high: number } {
  const measured = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  if (measured.length === 0) return { low: SCORE_MIN, high: SCORE_MAX };

  const dataLow = Math.min(...measured);
  const dataHigh = Math.max(...measured);

  const floor = Number.isFinite(minSpan)
    ? Math.max(minSpan, DOMAIN_SNAP)
    : DOMAIN_SNAP;
  const span = Math.max(dataHigh - dataLow, floor);
  const middle = (dataLow + dataHigh) / 2;

  let low = Math.floor((middle - span / 2) / DOMAIN_SNAP) * DOMAIN_SNAP;
  let high = Math.ceil((middle + span / 2) / DOMAIN_SNAP) * DOMAIN_SNAP;

  if (low < SCORE_MIN) {
    high += SCORE_MIN - low;
    low = SCORE_MIN;
  }
  if (high > SCORE_MAX) {
    low -= high - SCORE_MAX;
    high = SCORE_MAX;
  }

  /* Verlangt jemand mehr Spanne, als die Skala hat, bleibt die ganze Skala. */
  return {
    low: Math.max(SCORE_MIN, low),
    high: Math.min(SCORE_MAX, high),
  };
}

/**
 * Die Marken der Achse. NICHT d3.ticks(): das waehlt bei einer Spanne von 30
 * Fuenfer-Schritte und beschriftet dann 55, 65, 75 — die Rasterung auf Zehner
 * waere damit an der einen Stelle wieder aufgegeben, an der man sie sieht. Der
 * Schritt bleibt deshalb ein Vielfaches von DOMAIN_SNAP und waechst nur, wenn es
 * sonst zu viele Linien wuerden.
 *
 * Setzt eine ENDLICHE Spanne voraus — bei Infinity liefe die Schleife ewig.
 * toScoreDomain garantiert das, weil es auf SCORE_MIN…SCORE_MAX klammert.
 */
export function toGridTicks(low: number, high: number): readonly number[] {
  let step = DOMAIN_SNAP;
  while ((high - low) / step > MAX_GRID_LINES - 1) step += DOMAIN_SNAP;

  const ticks: number[] = [];
  for (let value = Math.ceil(low / step) * step; value <= high; value += step) {
    ticks.push(value);
  }
  return ticks;
}

/**
 * Breite der Achsenspur links. Zwei Ziffern in text-3xs brauchen dieses Mass;
 * die Fuge zum Feld macht LABEL_GAP, damit es im Feld nur EINEN Abstand gibt.
 */
const AXIS_WIDTH = 22;

/**
 * Breite der Beschriftungsspur rechts. Sie ist aus dem INHALT gerechnet:
 * Zeichen, der laengste Bereichsname ("Herz-Kreislauf") und die Delta-Pille
 * stehen bei diesem Mass umbruchfrei nebeneinander. Breiter gezogen nimmt sie
 * dem Feld die Breite, in der die Steigungen ueberhaupt sichtbar sind.
 *
 * Sie stand auf 152, als hier ein 6px-Punkt und ein Delta ohne Flaeche standen.
 * Das Bereichszeichen und die Pille um das Delta kosten zusammen rund 30px —
 * ohne dieses groessere Mass bricht "Herz-Kreislauf" um oder wird beschnitten.
 */
const LABEL_WIDTH = 184;

/** Abstand zwischen Feld und Spur. */
const LABEL_GAP = 8;

/**
 * Ab dieser Zeilenbreite steht die Spur NEBEN dem Feld. Darunter waere das Feld
 * schmaler als 200px, und auf 200px sind vier Testtermine keine Kurve mehr,
 * sondern ein Zickzack — dann rutschen die Beschriftungen unter das Feld und
 * bekommen die ganze Breite.
 */
const STACK_BELOW = AXIS_WIDTH + LABEL_GAP + LABEL_WIDTH + LABEL_GAP + 200;

/**
 * Hoehe einer Beschriftung in Pixeln. Sie wird von der Delta-Pille bestimmt und
 * nicht von der Schrift: leading-4 sind 16px, py-0.5 legt oben und unten je 2px
 * dazu.
 */
const END_LABEL_HEIGHT = 20;

/**
 * Mindestabstand zweier Beschriftungen am Linienende, in Pixeln — von Mitte zu
 * Mitte. Bei END_LABEL_HEIGHT bleiben so acht Pixel Luft zwischen zwei
 * Pillen: rechnerisch kollisionsfrei UND als Fuge erkennbar. Rechnerisch allein
 * genuegt nicht — vier Zeichen plus vier Namen plus vier Pillen dicht
 * untereinander sind ein Block, auch wenn sich nichts beruehrt.
 */
const END_LABEL_GAP = END_LABEL_HEIGHT + 8;

/**
 * Halbe Zeilenhoehe. Die Beschriftungen sitzen auf ihrer Mitte
 * (-translate-y-1/2), also ist das der Abstand, den die oberste und die
 * unterste zum Feldrand halten muessen, um nicht angeschnitten zu werden.
 */
const END_LABEL_HALF = END_LABEL_HEIGHT / 2;

/**
 * Eine gezeichnete Reihe: ihre Werte, ihre Beschriftung und ihr Rang im Feld.
 * Feld und Beschriftungsspur lesen BEIDE aus dieser Liste — eine Linie, die
 * anders eingefaerbt waere als ihr Punkt in der Spur, waere zwei Linien.
 */
interface Trace {
  /** Id der Bewertungs-Kategorie — sie waehlt auch das Zeichen. */
  id: string;
  /** Beschriftung am Linienende. Kurzform, siehe CategoryScore.shortName. */
  label: string;
  /** Punkte gegenueber dem vorherigen Test. */
  delta: number;
  /**
   * true = Bewegung im Rauschband. Das faerbt nur noch die Angabe NEBEN der
   * Linie grau; die Linie selbst sieht aus wie jede andere.
   */
  quiet: boolean;
  /** Ein Eintrag je Testtermin; null heisst: an diesem Termin nicht erhoben. */
  values: readonly (number | null)[];
}

interface FieldSize {
  width: number;
  height: number;
}

/**
 * Misst die ZEILE in echten Pixeln — Feld plus Spur. Gerechnet wird NICHT in
 * Prozent: die Zeichenbewegung laeuft ueber stroke-dasharray, und in einem
 * gedehnten Koordinatensystem zerfaellt ein gestrichelter Strich in Stuecke.
 *
 * Gemessen wird die Zeile und nicht das Feld: die Breite des Feldes ist das
 * ERGEBNIS dieser Messung (Zeile minus Spur), und ein Feld, das seine eigene
 * Breite misst, waehrend sie von der Messung abhaengt, schwingt.
 */
function useRowSize(): [RefObject<HTMLDivElement | null>, FieldSize] {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<FieldSize>({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) setSize({ width: box.width, height: box.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

interface EndSlot {
  id: string;
  /** Hoehe des letzten Messpunkts. */
  dataY: number;
  /** Hoehe der Beschriftung — gleich dataY, solange nichts kollidiert. */
  labelY: number;
}

/**
 * Schiebt Beschriftungen auseinander, die uebereinander laegen. Die REIHENFOLGE
 * bleibt die der Messwerte: keine Beschriftung wandert an einer anderen vorbei,
 * sonst stuende sie an der falschen Linie.
 *
 * ZWEI DURCHGAENGE, und der zweite ist der Grund, warum die Spur jetzt haelt.
 * Ein einzelner Durchgang von oben nach unten schiebt jede Kollision nach
 * UNTEN; liegen alle vier Enden dicht beieinander — und genau dann braucht man
 * die Funktion — wandert der ganze Stapel aus dem Feld, und das Zurueckschieben
 * am Stueck presste die oberste Beschriftung wieder gegen ihre Nachbarin.
 *
 * Der Rueckwaertsdurchgang schiebt stattdessen von unten nach oben nach: erst
 * wird jede Beschriftung mindestens END_LABEL_GAP unter ihre Vorgaengerin
 * gelegt, dann jede mindestens so weit ueber ihre Nachfolgerin. Was danach
 * bleibt, ist die dichteste Anordnung, die die Reihenfolge und beide Feldraender
 * respektiert.
 */
function toEndSlots(
  ends: readonly { id: string; y: number }[],
  height: number,
): readonly EndSlot[] {
  const slots: EndSlot[] = ends
    .toSorted((left, right) => left.y - right.y)
    .map((end) => ({ id: end.id, dataY: end.y, labelY: end.y }));

  /* Hin: niemand liegt hoeher als der Feldrand oder zu dicht unter dem
   * Vorgaenger. */
  let floor = END_LABEL_HALF;
  for (const slot of slots) {
    slot.labelY = Math.max(slot.labelY, floor);
    floor = slot.labelY + END_LABEL_GAP;
  }

  /* Zurueck: niemand liegt tiefer als der Feldrand oder zu dicht ueber dem
   * Nachfolger. Diese Richtung darf die erste ueberstimmen — laeuft der Stapel
   * unten an, muss er oben nachgeben. */
  let ceiling = height - END_LABEL_HALF;
  for (let index = slots.length - 1; index >= 0; index -= 1) {
    const slot = slots[index];
    if (!slot) continue;
    slot.labelY = Math.min(slot.labelY, ceiling);
    ceiling = slot.labelY - END_LABEL_GAP;
  }

  return slots;
}

/* ------------------------------------------------------------------------- */
/* Das Feld                                                                    */
/* ------------------------------------------------------------------------- */

interface TrendFieldProps {
  dates: readonly string[];
  /** Die Bereichsreihen. Alle gleichrangig — es gibt keine tragende mehr. */
  traces: readonly Trace[];
  /** Beschreibung des ganzen Bildes fuer Screenreader. */
  fieldLabel: string;
  /**
   * Kleinste Spanne, die die Achse zeigen darf, in Punkten. Kommt aus dem
   * breitesten Rauschband des Feldes — siehe NOISE_HEADROOM.
   */
  minSpan: number;
  /** Reihe, deren Linie gerade vortritt. */
  activeId: string | null;
  onHover: (id: string | null) => void;
}

function TrendField({
  dates,
  traces,
  fieldLabel,
  minSpan,
  activeId,
  onHover,
}: TrendFieldProps) {
  const motionPreset = useMotionPreset();
  const [row, rowSize] = useRowSize();
  /*
   * Achse, Endpunkte und Beschriftungen warten auf das ENDE der ZULETZT
   * gezeichneten Linie, nicht auf eine Zahl: so gibt es keine zweite Zeitangabe
   * im Code, und bei reduzierter Bewegung sind die Linien sofort fertig — dann
   * steht alles zusammen da.
   *
   * Der Anker war frueher die tragende Linie. Seit die weg ist, zeichnen alle
   * Reihen versetzt (drawPath nimmt den Reihenplatz aus `custom`), und die
   * letzte gibt das Signal. "Letzte" heisst dabei die zuletzt GESTARTETE: der
   * Versatz ist gedeckelt, aber monoton, also endet sie auch als letzte.
   */
  const [linesDrawn, setLinesDrawn] = useState(false);

  const stacked = rowSize.width > 0 && rowSize.width < STACK_BELOW;
  const fieldWidth = Math.max(
    0,
    rowSize.width -
      AXIS_WIDTH -
      LABEL_GAP -
      (stacked ? 0 : LABEL_WIDTH + LABEL_GAP),
  );
  const isMeasured = fieldWidth > 0;

  /*
   * EINE Skala fuer alle Linien, und sie ist jetzt BESCHRIFTET.
   *
   * ENTSCHEIDUNG (ersetzt die vorherige, die hier stand). Vorher trug das Feld
   * gar keine Achse: es zeigte Verlaeufe nur ZUEINANDER, die absoluten Werte
   * standen am Ring, im Delta und in der Tabelle. Der Kommentar an dieser Stelle
   * verlangte, dass eine beschriftete Achse zurueck auf 0–100 muesse — sonst
   * werde aus drei Punkten ein halber Bildschirm.
   *
   * Beides war zu streng in der einen und zu lax in der anderen Richtung. Auf
   * 0–100 sind vier Punkte neun Pixel: eine beschriftete Achse, an der man
   * nichts ablesen kann. Frei auf die Daten gezogen ist sie dagegen genau der
   * halbe Bildschirm, vor dem der alte Kommentar warnte.
   *
   * Die Achse laeuft deshalb MIT, aber unter zwei Bedingungen:
   *
   *   RASTER   Die Grenzen schnappen nach aussen auf Zehner. Das macht die
   *            Beschriftung ueberhaupt erst lesbar und laesst die Spanne
   *            zwischen zwei Tests meist stehen, statt bei jedem Messwert zu
   *            wandern.
   *   BODEN    Die Spanne ist mindestens NOISE_HEADROOM mal so breit wie das
   *            Rauschband. Damit kann eine Bewegung im Band nicht mehr als ein
   *            Achtel der Hoehe belegen — die Achse widerspricht der blassen
   *            Linie also nicht.
   *
   * Was dieses Feld damit AUFGIBT: die Steigung ist keine ueber Tests hinweg
   * vergleichbare Groesse mehr, und weil die Spanne breiter ist als die Daten,
   * sind die Winkel flacher als vorher. Beides ist hier verschmerzbar — die
   * Aussage der Kachel ist, WO die Linien stehen und wohin sie zeigen, nicht wie
   * steil sie das tun. Wer Steigungen vergleichen will, nimmt die Tabelle.
   *
   * Die Rechnung selbst steht in toScoreDomain — mitsamt der Zusage, dass die
   * Spanne nie null wird.
   */
  const { low, high } = toScoreDomain(
    traces.flatMap((trace) => trace.values),
    minSpan,
  );

  const toY = scaleLinear().domain([low, high]).range([FIELD_HEIGHT, 0]);

  const gridTicks = toGridTicks(low, high);

  /*
   * Die Termine sind eine ORDINALE Achse: zwischen zwei Tests liegt kein halber
   * Test, und ungleiche Abstaende wuerden hier eine Geschwindigkeit behaupten,
   * die der Score nicht hat.
   */
  const toX = scalePoint<string>().domain(dates).range([0, fieldWidth]);
  const positions = dates.map((date) => toX(date) ?? 0);

  /*
   * ENTSCHEIDUNG (kehrt eine fruehere um): DIE VERBINDUNGEN SIND GERUNDET.
   *
   * Hier stand "Gerade Verbindungen, keine Glaettung: eine Spline erfindet
   * zwischen zwei Tests Werte, die niemand gemessen hat." Der Einwand stimmt
   * und bleibt richtig — deshalb ist die Kurve, die ihn jetzt bricht, die
   * zahmste, die es gibt.
   *
   * curveMonotoneX und NICHT curveCatmullRom oder curveBasis. Der Unterschied
   * ist genau der Einwand von oben:
   *
   *   MONOTON   Zwischen zwei Messpunkten bleibt die Kurve zwischen deren
   *             Werten. Sie ueberschwingt nie, erfindet also kein Hoch, das
   *             hoeher waere als beide Nachbarn — bei einem Score, der als
   *             Bestwert gelesen wird, waere genau das die gefaehrliche Luege.
   *   DURCH     Sie laeuft durch JEDEN Messpunkt, nicht daran vorbei.
   *             curveBasis tut das nicht; die Kurve laege dann neben den
   *             Punkten, die die Achse beschriftet.
   *
   * Was trotzdem erfunden bleibt: die Steigung ZWISCHEN zwei Terminen. Sie war
   * vorher konstant und ist jetzt weich, und beides ist gleich falsch — niemand
   * hat dazwischen gemessen. Der ⓘ-Text sagt ohnehin, dass man die Zahlen
   * vergleichen soll und nicht die Neigung.
   */
  const toPath = line<number | null>()
    .defined((value) => value !== null)
    .curve(curveMonotoneX)
    .x((_, index) => positions[index] ?? 0)
    .y((value) => toY(value ?? 0));

  const ends = traces.flatMap((trace) => {
    const value = trace.values.at(-1);
    return value === null || value === undefined
      ? []
      : [{ id: trace.id, y: toY(value) }];
  });
  const slotById = new Map(
    toEndSlots(ends, FIELD_HEIGHT).map((slot) => [slot.id, slot]),
  );

  /*
   * EIN Markup fuer beide Lagen. Was sich zwischen "neben dem Feld" und "unter
   * dem Feld" aendert, ist ausschliesslich die POSITIONIERUNG — nicht der
   * Inhalt und nicht die Reihenfolge. Zwei Zweige mit denselben Zeilen liefen
   * irgendwann auseinander, und dann truege eine Lage eine Angabe, die die
   * andere nicht hat.
   */
  const labels = (
    <ul
      className={cn(
        stacked ? "mt-3 flex flex-wrap gap-x-5 gap-y-1" : "relative shrink-0",
      )}
      style={stacked ? undefined : { width: LABEL_WIDTH, height: FIELD_HEIGHT }}
    >
      {traces.map((trace, position) => {
        const slot = slotById.get(trace.id);
        const isRecessed = activeId !== null && activeId !== trace.id;

        return (
          <motion.li
            key={trace.id}
            variants={motionPreset.fadeIn}
            initial="hidden"
            animate={linesDrawn ? "visible" : "hidden"}
            custom={position}
            style={
              stacked || slot === undefined ? undefined : { top: slot.labelY }
            }
            className={cn(
              "text-2xs leading-4 transition-opacity",
              stacked ? null : "absolute left-0 w-full -translate-y-1/2",
              isRecessed && "opacity-55",
            )}
          >
            {/*
             * EIN BUTTON, DER NICHTS OEFFNET — und trotzdem der richtige Tag.
             *
             * Die Betonung einer Linie lief vorher nur ueber die Maus: Hover
             * auf dieser Beschriftung und auf der Trefferflaeche im Feld. Per
             * Tastatur gab es die Funktion nicht, und auf einem Touchgeraet
             * ebenfalls nicht — dort loest kein Hover aus. Als fokussierbares
             * Element bekommt jede Reihe jetzt einen Halt in der
             * Tab-Reihenfolge, und was der Screenreader dort vorliest, ist
             * dank ScoreDelta ein ganzer Satz: "Energie, +7 Punkte seit dem
             * letzten Test, gestiegen".
             *
             * ENTSCHEIDUNG: KEIN onClick. Ein Klick, der die Betonung
             * festhaelt, waere der Chip zurueck, den diese Kachel bewusst
             * abgeschafft hat (siehe Kopf der Datei) — und ein zweiter,
             * dauerhafter Zustand neben dem fluechtigen. Fokus und Hover
             * schreiben deshalb beide dasselbe, und beide geben es wieder her.
             */}
            <button
              type="button"
              onMouseEnter={() => onHover(trace.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(trace.id)}
              onBlur={() => onHover(null)}
              className={cn(
                "focus-visible:outline-ring flex items-center gap-1.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2",
                stacked ? null : "w-full",
              )}
            >
              {/*
               * Das Bereichszeichen steht, wo bis eben ein 6px-Punkt stand, und
               * erbt dessen Aufgabe mit: es traegt den Ton SEINER Linie und ist
               * damit die Verbindung zwischen Beschriftung und Kurve. Dazu
               * leistet es, was der Punkt nicht konnte — es benennt den Bereich
               * mit demselben Zeichen wie sein Kopf im Bereichsfeld und seine
               * Herkunft in der Veraenderungsliste.
               *
               * ⚠️ HIER KOMMT KEINE STATUSFARBE HIN, auch nicht, seit das
               * Bereichsfeld darueber eine traegt. Die Farben dort beantworten
               * "wo stehst du"; dieses Feld beantwortet "wohin geht es". Ein
               * bernsteines Zeichen an einer steigenden Linie waere beides
               * gleichzeitig, und die Linie verloere ihre einzige Aussage. Die
               * vier Linien sehen alle gleich aus — unterschieden durch
               * Zeichen und Beschriftung, nicht durch Ton oder Strichart.
               */}
              <CategoryIcon
                categoryId={trace.id}
                className="text-trend-hairline"
              />
              {/*
               * Der NAME bleibt neutral. Alle vier Reihen sind gleichrangig,
               * seit die tragende Linie weg ist — ein hervorgehobener Name
               * behauptete eine Rangfolge, die es hier nicht gibt.
               */}
              <span
                className={cn(
                  "text-foreground",
                  stacked ? null : "min-w-0 truncate",
                )}
              >
                {trace.label}
              </span>
              <ScoreDelta
                delta={trace.delta}
                quiet={trace.quiet}
                className="shrink-0"
              />
            </button>
          </motion.li>
        );
      })}
    </ul>
  );

  return (
    <div ref={row}>
      <div className="flex items-start" style={{ gap: LABEL_GAP }}>
        {/*
         * Die Achsenspur. Sie steht AUSSERHALB des Feldbildes, obwohl sie zu ihm
         * gehoert: das Feld ist ein role="img" mit einer Beschreibung, und die
         * nennt die Werte schon in Worten. Vorgelesen waeren diese Ziffern eine
         * zweite, tonlose Kopie derselben Angabe.
         *
         * Sie wartet auf dieselbe Linie wie die Haarlinien: eine Achse, die vor
         * ihren Daten dasteht, ist eine leere Tabelle.
         *
         * ENTSCHEIDUNG: text-muted-foreground statt text-faint. Nachgemessen
         * gegen surface.card haelt text.faint 4,23:1 im hellen und 3,23:1 im
         * dunklen Theme. Fuer Grafik (3:1) genuegt das, fuer SCHRIFT nicht —
         * und 10px sind nirgends "gross" (das faengt bei 18,66px fett an). Eine
         * Achse, deren Zahlen man nicht lesen kann, ist keine Achse. Eine Stufe
         * dunkler bringt 6,11:1 und 4,78:1: beide ueber AA, und im Bild bleibt
         * die Spur trotzdem die leiseste Schrift der Kachel, weil sie mit
         * Abstand die kleinste ist. Kein neues Token.
         */}
        <motion.div
          aria-hidden="true"
          variants={motionPreset.fadeIn}
          initial="hidden"
          animate={linesDrawn ? "visible" : "hidden"}
          className="relative shrink-0"
          style={{ width: AXIS_WIDTH, height: FIELD_HEIGHT }}
        >
          {isMeasured
            ? gridTicks.map((tick) => (
                <span
                  key={`achse-y-${tick}`}
                  className="text-muted-foreground text-3xs absolute right-0 -translate-y-1/2 tabular-nums"
                  style={{ top: toY(tick) }}
                >
                  {tick}
                </span>
              ))
            : null}
        </motion.div>

        {/*
         * Das Feld ist EIN Bild mit einer Beschreibung. Die Einzelteile darin
         * bleiben fuer Screenreader unsichtbar — vorgelesen waeren sie eine
         * Reihe zusammenhangloser Zahlen. Denselben Inhalt tragen die
         * Beschriftungen DANEBEN (echter Text, deshalb ausserhalb dieses Bildes)
         * und die Tabelle unter der Kachel.
         */}
        <div
          role="img"
          aria-label={fieldLabel}
          className="relative shrink-0"
          style={{ width: fieldWidth, height: FIELD_HEIGHT }}
        >
          {isMeasured && traces.length > 0 ? (
            <>
              {/*
               * ENTSCHEIDUNG: Hier lagen eine Verlaufsflaeche unter der
               * tragenden Linie (trend-wash) und ein Schein hinter ihrem
               * letzten Punkt (trend-glow). Beide sind ersatzlos entfernt —
               * inzwischen ohnehin gegenstandslos, weil auch die Linie weg ist,
               * an der sie hingen (siehe Kopf der Datei).
               *
               * Der Grund war, dass es Effekte auf DATEN sind. Eine Flaeche
               * unter einer Linie gibt ihr ein Gewicht, das die Zahl nicht hat,
               * und ein Schein hinter dem letzten Messpunkt macht aus "zuletzt
               * gemessen" ein Ereignis.
               *
               * ⚠️ Die Utilities trend-wash und trend-glow in app/globals.css
               * und ihre Token plot.trendWash / plot.trendGlow existieren
               * weiterhin — sie werden nur nirgends mehr benutzt. Dasselbe gilt
               * seit dem Wegfall der Gesamtlinie fuer plot.trendLine
               * (trend-line). Sie gehoeren nicht zu dieser Kachel und sind
               * deshalb nicht angefasst; wer aufraeumt, faengt hier an.
               */}
              <svg
                aria-hidden="true"
                width={fieldWidth}
                height={FIELD_HEIGHT}
                className="absolute inset-0 overflow-visible"
              >
                {/*
                 * Das Gitter liegt unter ALLEM. Es traegt border und damit den
                 * Ton jeder anderen Trennlinie der Seite — eine Gitterlinie ist
                 * Konstruktion und nie ein Befund. Statusfarbe kommt hier
                 * genauso wenig hin wie an die Linien selbst (siehe Farbpolitik
                 * in analysis-board.tsx).
                 */}
                <motion.g
                  variants={motionPreset.fadeIn}
                  initial="hidden"
                  animate={linesDrawn ? "visible" : "hidden"}
                >
                  {gridTicks.map((tick) => (
                    <line
                      key={`netz-${tick}`}
                      x1={0}
                      x2={fieldWidth}
                      y1={toY(tick)}
                      y2={toY(tick)}
                      strokeWidth={1}
                      className="stroke-border"
                    />
                  ))}
                </motion.g>

                {/*
                 * Alle vier Linien sind gleichrangig; die Reihenfolge im DOM
                 * ist die der Daten und bedeutet nichts. Wer vortritt,
                 * entscheidet allein activeId — die betonte Linie bekommt mehr
                 * Staerke und den dunkelsten Ton, die uebrigen weichen zurueck.
                 *
                 * ENTSCHEIDUNG (kehrt die vorherige um): DAS RAUSCHBAND
                 * FAERBT DIE LINIE NICHT MEHR, und es strichelt sie auch nicht.
                 *
                 * Hier stand, der Schritt zum Rauschband sei DOPPELT codiert —
                 * blasser plus gestrichelt, damit er Graustufen ueberlebt. Die
                 * Codierung ist auf Anweisung ganz entfallen: alle vier Linien
                 * tragen denselben Ton, dieselbe Staerke und keinen Strich.
                 *
                 * Nachgemessen war das blasse Ende ohnehin nicht haltbar. Die
                 * gestrichelte Linie kam auf 1,60:1 gegen die Karte im hellen
                 * und 2,16:1 im dunklen Theme — beides unter der 3:1-Schwelle
                 * fuer grafische Elemente. Eine Angabe, die man nicht sehen
                 * kann, ist keine leise Angabe.
                 *
                 * WO "im Rauschband" JETZT STEHT: allein in der Beschriftung.
                 * Die Delta-Pille bleibt dort grau statt gruen oder bernstein,
                 * die Zahl steht auf ±0, und der Screenreader hoert es als
                 * Wort (siehe ScoreDelta, `quiet`). Das Feld selbst behauptet
                 * ueber die Belastbarkeit einer Linie nichts mehr — es zeigt
                 * nur noch, wo sie liegt.
                 *
                 * Damit faellt auch der Grund weg, aus dem eine Linie hier
                 * einblenden statt zeichnen musste: ein Strichmuster und
                 * drawPath schliessen einander aus, weil Motion pathLength
                 * ueber stroke-dasharray umsetzt und dabei gewinnt. Ohne
                 * Muster zeichnen wieder alle vier.
                 */}
                {traces.map((trace, position) => {
                  const isActive = activeId === trace.id;
                  const isRecessed = activeId !== null && !isActive;
                  const isLast = position === traces.length - 1;

                  return (
                    <g key={trace.id}>
                      <motion.path
                        d={toPath(trace.values) ?? ""}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        variants={motionPreset.drawPath}
                        initial="hidden"
                        animate="visible"
                        custom={position}
                        onAnimationComplete={
                          isLast ? () => setLinesDrawn(true) : undefined
                        }
                        /* style statt animate: die Staerke ist ein ZUSTAND und
                         * kein Auftritt. Ueber `animate` liefe sie mit den
                         * Varianten des Auftritts in denselben Topf und
                         * ueberschriebe pathLength.
                         *
                         * 1,5 statt 1: eine Haarlinie musste sich neben der
                         * tragenden Markenlinie zurueckhalten. Die gibt es
                         * nicht mehr, und vier gleich leise Linien halten sich
                         * nur noch voreinander zurueck. */
                        style={{ strokeWidth: isActive ? 2.25 : 1.5 }}
                        className={cn(
                          "transition-[stroke,stroke-width] duration-150",
                          isActive
                            ? "stroke-trend-hairline-active"
                            : isRecessed
                              ? "stroke-trend-hairline-muted"
                              : "stroke-trend-hairline",
                        )}
                      />
                      {/*
                       * JEDER Messpunkt bekommt einen Punkt, der letzte einen
                       * groesseren: eine Linie ohne Punkte laesst offen, wie
                       * viele Tests sie ueberhaupt verbindet, und seit die
                       * Verlaeufe gerundet sind, sieht man die Termine auch
                       * nicht mehr am Knick.
                       */}
                      <motion.g
                        variants={motionPreset.fadeIn}
                        initial="hidden"
                        animate={linesDrawn ? "visible" : "hidden"}
                        custom={position}
                        className={cn(
                          "transition-colors",
                          isActive
                            ? "fill-trend-hairline-active"
                            : isRecessed
                              ? "fill-trend-hairline-muted"
                              : "fill-trend-hairline",
                        )}
                      >
                        {trace.values.map((value, tick) =>
                          value === null ? null : (
                            <circle
                              key={`punkt-${trace.id}-${dates[tick] ?? tick}`}
                              cx={positions[tick] ?? 0}
                              cy={toY(value)}
                              r={
                                tick === trace.values.length - 1
                                  ? isActive
                                    ? 3
                                    : 2.5
                                  : 1.5
                              }
                            />
                          ),
                        )}
                      </motion.g>
                    </g>
                  );
                })}

                {/*
                 * Griffe fuer die Maus: eine Haarlinie ist einen Pixel breit,
                 * und niemand trifft einen Pixel. Das sind keine
                 * Bedienelemente, sondern grosszuegigere Trefferflaechen fuer
                 * dieselbe Betonung, die auch die Beschriftung daneben ausloest.
                 * Sie liegen zuletzt im DOM, damit sie ueber allen Linien
                 * liegen — sonst faenge die oberste Linie die Zeiger ab, die
                 * eigentlich der darunter gelten.
                 */}
                {traces.map((trace) => (
                  <path
                    key={`griff-${trace.id}`}
                    d={toPath(trace.values) ?? ""}
                    fill="none"
                    strokeWidth={16}
                    pointerEvents="stroke"
                    className="stroke-transparent"
                    onMouseEnter={() => onHover(trace.id)}
                    onMouseLeave={() => onHover(null)}
                  />
                ))}
              </svg>
            </>
          ) : null}
        </div>

        {stacked ? null : labels}
      </div>

      {/*
       * Die Achse steht unter dem FELD, ist genau so breit wie es und faengt
       * dort an, wo es anfaengt — also hinter der Achsenspur.
       *
       * Die Teilstriche sind der Grund, warum sie jetzt am Feld haengt statt
       * darunter zu schweben: eine Datumszeile ohne Marken laesst offen, ob
       * '24.03.' den zweiten Messpunkt meint oder die Strecke bis dorthin. Sie
       * sitzen mittig auf ihrem Punkt, auch dort, wo die Beschriftung darunter
       * buendig steht.
       */}
      <div
        aria-hidden="true"
        className="relative mt-1.5 h-5"
        style={{ width: fieldWidth, marginLeft: AXIS_WIDTH + LABEL_GAP }}
      >
        {dates.map((date, index) => (
          <span
            key={`strich-${date}`}
            className="bg-border absolute top-0 h-1 w-px -translate-x-1/2"
            style={{
              left: `${(index / Math.max(1, dates.length - 1)) * 100}%`,
            }}
          />
        ))}
        {dates.map((date, index) => (
          <span
            key={`achse-${date}`}
            className={cn(
              /* Derselbe Ton wie die Wertachse — siehe die Kontrastnotiz
               * dort. Zwei Achsen einer Grafik in zwei Graustufen waeren
               * ausserdem eine Unterscheidung ohne Unterschied. */
              "text-muted-foreground text-3xs absolute bottom-0 tabular-nums",
              /* Die aeusseren Beschriftungen stehen buendig statt mittig —
               * zentriert liefen sie aus dem Feld. */
              index === 0
                ? "left-0"
                : index === dates.length - 1
                  ? "right-0"
                  : "-translate-x-1/2",
            )}
            style={
              index === 0 || index === dates.length - 1
                ? undefined
                : {
                    left: `${(index / Math.max(1, dates.length - 1)) * 100}%`,
                  }
            }
          >
            {toShortDate(date)}
          </span>
        ))}
      </div>

      {stacked ? labels : null}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Die groessten Bewegungen                                                    */
/* ------------------------------------------------------------------------- */

interface MovementListProps {
  changes: readonly MarkerChange[];
  /** Fuer den Bereich hinter dem Markernamen. */
  categories: readonly CategorySeries[];
  /** Platz des ERSTEN Eintrags in der Auftrittsreihe der Kachel. */
  index: number;
}

/**
 * Die drei groessten Marker-Bewegungen, mit Werten und Urteil.
 *
 * Sie stand vorher hinter einem Chip-Klick, je Kategorie getrennt. Aufgeklappt
 * zeigte sie alle Marker EINER Kategorie — vollstaendig, aber erst nachdem man
 * geraten hatte, welche Kategorie interessant ist. Offen und ueber alle
 * Kategorien hinweg antwortet dieselbe Liste auf die Frage, die man wirklich
 * hat: was hat sich bewegt?
 */
function MovementList({ changes, categories, index }: MovementListProps) {
  const motionPreset = useMotionPreset();

  return (
    <div className="border-border mt-6 border-t pt-4">
      <h3 className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        {/* Getrennt geschrieben ("Blutwert Veränderungen") waere es kein
         * deutsches Wort. Zusammengeschrieben stuende hier ein
         * 21-Buchstaben-Kompositum in versalen 10px, und dort verliert ein
         * Kompositum seine Wortgrenzen — der Bindestrich ist genau dafuer
         * zulaessig. */}
        Wichtigste Blutwert-Veränderungen
      </h3>
      {/*
       * DAS RASTER LIEGT AUF DER LISTE, NICHT AUF DER ZEILE.
       *
       * Vorher war jede Zeile ihr eigenes Grid. Drei eigene Grids nebeneinander
       * teilen keine Spalten: '1,1 → 0,7 mg/l' und '58 → 68 ng/ml' bekamen jede
       * ihre eigene Breite, also stand der Pfeil in jeder Zeile woanders und die
       * Werte fluchteten nur zufaellig an der rechten Kante. Bei Zahlen ist genau
       * das der Unterschied zwischen einer Tabelle und drei Zeilen.
       *
       * Mit subgrid erben die Zeilen die Spalten der Liste. Vorher-Wert, Pfeil
       * und Nachher-Wert bekommen deshalb je eine EIGENE Spalte: der Pfeil steht
       * dann in allen Zeilen auf derselben Senkrechten, und die Werte laufen von
       * ihm aus nach beiden Seiten auseinander.
       */}
      <ul className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] @lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
        {changes.map((change, position) => {
          const reading = toChangeReading(change);
          const verdict = VERDICT_TONE[reading.verdict];
          /* Der Bereich steht nur da, wenn er hinterlegt ist: ein geratener
           * Bereich neben einem Markernamen ist schlimmer als keiner. */
          const areaId = categoryIdByMarker(change.id);
          const areaName = categories.find(
            (category) => category.id === areaId,
          )?.shortName;

          return (
            <motion.li
              key={change.id}
              variants={motionPreset.fadeRise}
              custom={index + position}
              /*
               * Die Zeile bringt keine eigenen Spalten mehr mit, sie erbt die
               * der Liste. Was sie behaelt, ist die Umbruchstelle: unter 32rem
               * Kachelbreite rutscht das Urteil UNTER die Messwerte.
               *
               * Warum es die Stufe ueberhaupt gibt: die Kachel steht in Zeile 2
               * ueber sechs von zwoelf Spalten, und das sind auf einem 1440er
               * Schirm MIT Kontext-Leiste rund 350px Inhaltsbreite. Dort
               * brauchen 'LDL-Cholesterin Herz-Kreislauf', '102 → 88 mg/dl' und
               * '−14 % günstig' nebeneinander mehr Platz als da ist — also
               * bricht die Zeile, aber nur EINMAL und immer an derselben Stelle.
               */
              className="border-border/60 col-span-full grid grid-cols-subgrid items-baseline gap-x-2 gap-y-0.5 border-b py-2 last:border-b-0"
            >
              <span className="min-w-0 pr-2">
                <span className="text-foreground text-xs font-semibold">
                  {change.name}
                </span>
                {/*
                 * Zeichen und Name des Bereichs bleiben ZUSAMMEN: inline-flex
                 * in einem eigenen Kasten, damit sie bei einem Umbruch des
                 * langen Markernamens nicht auseinandergerissen werden. Das
                 * Zeichen ist dasselbe wie im Bereichskopf und an der Linie
                 * der Entwicklung — es ist die ganze Zuordnung.
                 */}
                {areaId && areaName ? (
                  <span className="text-muted-foreground text-2xs ml-2 inline-flex items-center gap-1 align-baseline">
                    <CategoryIcon categoryId={areaId} />
                    {areaName}
                  </span>
                ) : null}
              </span>
              {/*
               * Drei Spalten fuer einen Wertepaar-Vergleich: rechtsbuendig,
               * Pfeil, linksbuendig. Nur so stehen die Kommastellen von '1,1'
               * und '58' in derselben Senkrechten wie die der Zeilen darunter.
               */}
              <span className="text-muted-foreground text-2xs text-right tabular-nums">
                {markerFormat.format(change.previous)}
                <span className="sr-only">
                  {change.unit ? ` ${change.unit}` : ""} auf
                </span>
              </span>
              {/* Auch hier text-muted-foreground und nicht text-faint: der
               * Pfeil ist zwar aria-hidden, aber sichtbar ist er das EINZIGE,
               * was "von" und "nach" auseinanderhaelt. Dieselbe Rechnung wie an
               * der Achse. */}
              <span
                aria-hidden="true"
                className="text-muted-foreground text-2xs"
              >
                →
              </span>
              {/*
               * Die Einheit steht EINMAL, am Ende. Vorher trug sie jeder der
               * beiden Werte — dieselbe Angabe zweimal in einer Zeile, und sie
               * kostete genau die Breite, an der die dritte Spalte scheiterte.
               * Laborbefunde schreiben sie hinter das Paar, nicht hinter jede
               * Zahl.
               */}
              <span className="text-2xs whitespace-nowrap tabular-nums">
                <span className="text-foreground font-medium">
                  {markerFormat.format(change.current)}
                </span>
                {change.unit ? (
                  <span className="text-muted-foreground ml-1">
                    {change.unit}
                  </span>
                ) : null}
              </span>
              {/*
               * In der schmalen Form steht das Urteil UNTER den Messwerten und
               * rechts an derselben Kante — col-start-2 haelt es aus der
               * Namensspalte heraus. In der breiten faellt beides weg und es
               * rueckt in seine eigene, fuenfte Spalte. Die Pille selbst sitzt
               * in einem Wrapper, weil justify-self an ihr die Spalte fuellen
               * wuerde: eine Pille ist so breit wie ihr Inhalt, nicht so breit
               * wie ihre Spalte.
               */}
              <span className="col-span-3 col-start-2 justify-self-end @lg:col-span-1 @lg:col-start-5">
                <span
                  className={cn(
                    /* Dieselbe Form wie VerdictChip und ScoreDelta — siehe die
                     * Begruendung im Kopf von score-delta.tsx. */
                    "text-2xs inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 leading-4 font-medium tabular-nums",
                    verdict.pill,
                    verdict.tone,
                  )}
                >
                  {reading.verdict === "unveraendert"
                    ? "unverändert"
                    : percentFormat.format(reading.ratio)}
                  {/* Das Wort neben dem Prozentwert, sichtbar: bei einem Marker
                   * sagt das VORZEICHEN nichts ueber gut oder schlecht — minus
                   * 14 Prozent LDL ist die Erholung, plus 14 Prozent hs-CRP das
                   * Problem. Ohne das Wort waere die Farbe hier das einzige
                   * Signal. */}
                  {reading.verdict === "unveraendert" ? null : (
                    <span className="text-3xs">{verdict.label}</span>
                  )}
                </span>
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Tabelle                                                                     */
/* ------------------------------------------------------------------------- */

export interface ProgressionTableProps {
  score: ScoreSummary;
  /** Alle Kategorien mit ihrer Bewegung — auch die im Rauschband. */
  movements: readonly CategoryMovement[];
  categories: readonly CategorySeries[];
  className?: string;
}

/**
 * Dieselben Werte in Zeilen — und zwar ALLE. Sie steht UNTER der Kachel und
 * nicht in ihr: ein Umschalter dort machte aus der Entwicklung eine
 * Ansichtsoption. Draussen ist sie das, was sie sein soll — der vollstaendige,
 * lineare Weg zu denselben Zahlen.
 */
export function ProgressionTable({
  score,
  movements,
  categories,
  className,
}: ProgressionTableProps) {
  const dates = score.history.map((point) => point.date);
  const totalValues = score.history.map((point) => point.value);

  const valuesAt = (id: string): readonly (number | null)[] => {
    const history = categories.find((entry) => entry.id === id)?.history ?? [];
    return dates.map(
      (date) => history.find((point) => point.date === date)?.value ?? null,
    );
  };

  return (
    <details className={cn(className)}>
      <summary className="text-muted-foreground focus-visible:outline-ring text-2xs w-fit cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
        Alle Werte als Tabelle
      </summary>
      <table className="mt-3 w-full text-left">
        <caption className="text-muted-foreground text-2xs sr-only">
          Gesamtscore und Kategorie-Scores je Testtermin, Punkte von 0 bis{" "}
          {SCORE_MAX}, dazu die Veränderung seit dem vorherigen Test.
        </caption>
        <thead>
          <tr className="border-border border-b">
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 font-medium"
            >
              Reihe
            </th>
            {dates.map((date) => (
              <th
                key={`kopf-${date}`}
                scope="col"
                className="text-muted-foreground text-2xs pb-2 text-right font-medium tabular-nums"
              >
                {toLongDate(date)}
              </th>
            ))}
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 text-right font-medium"
            >
              Seit letztem Test
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-border border-b">
            <th
              scope="row"
              className="text-foreground py-2 text-xs font-medium"
            >
              Gesamtscore
            </th>
            {totalValues.map((value, index) => (
              <td
                key={`gesamt-${dates[index]}`}
                className="text-foreground py-2 text-right text-xs font-medium tabular-nums"
              >
                {value}
              </td>
            ))}
            <td className="text-foreground py-2 text-right text-xs tabular-nums">
              {toDeltaText(
                (totalValues.at(-1) ?? 0) - (totalValues.at(-2) ?? 0),
              )}
            </td>
          </tr>

          {movements.map((movement) => (
            <tr key={`zeile-${movement.id}`} className="border-border border-b">
              <th
                scope="row"
                className="text-muted-foreground py-2 text-xs font-medium"
              >
                {movement.name}
              </th>
              {valuesAt(movement.id).map((value, index) => (
                <td
                  key={`zelle-${movement.id}-${dates[index]}`}
                  className="text-muted-foreground py-2 text-right text-xs tabular-nums"
                >
                  {value ?? "nicht erhoben"}
                </td>
              ))}
              <td className="text-muted-foreground py-2 text-right text-xs tabular-nums">
                {toDeltaText(movement.delta)}
                {movement.insideNoise ? (
                  <span className="text-2xs block">im Rauschband</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/* ------------------------------------------------------------------------- */
/* Die Kachel                                                                  */
/* ------------------------------------------------------------------------- */

export interface ProgressionPanelProps {
  /** Der Gesamtverlauf. Seine Termine spannen die Achse auf. */
  score: ScoreSummary;
  categories: readonly CategorySeries[];
  /**
   * Die Marker-Bewegungen, aus denen die Liste unter dem Feld ihre Namen zieht.
   * Ohne sie bleibt die Kachel vollstaendig — sie sagt dann nur nicht, woher
   * eine Bewegung kommt.
   */
  changes?: readonly MarkerChange[];
  /**
   * Platz in der Auftrittsreihe der SEITE. Er verzoegert nur den Auftritt der
   * Kachel; Feld und Liste behalten ihre eigene Reihenfolge.
   */
  index?: number;
  className?: string;
}

/**
 * Der Kopf der Kachel: Titel links, ⓘ rechts. Als eigenes Bauteil, damit der
 * Leerzustand denselben Kopf traegt wie die gefuellte Kachel.
 */
function ProgressionHeading({ id }: { id?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 id={id} className="text-foreground panel-title">
        Entwicklung
      </h2>
      <PanelExplainer label="Was die Entwicklung zeigt" className="-mt-1 -mr-1">
        {PROGRESSION_EXPLAINER}
      </PanelExplainer>
    </div>
  );
}

/** Leerzustand: eine Entwicklung entsteht erst zwischen zwei Messungen. */
function EmptyProgression({ className }: { className?: string }) {
  return (
    <section
      aria-label="Entwicklung"
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <ProgressionHeading />
      <p className="text-foreground mt-4 text-sm font-medium">
        Noch keine Entwicklung
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Eine Entwicklung braucht zwei Tests. Nach deinem nächsten Bluttest steht
        hier, wohin sich dein Score bewegt hat — und welche Bereiche ihn bewegt
        haben.
      </p>
    </section>
  );
}

export function ProgressionPanel({
  score,
  categories,
  changes = [],
  index = 0,
  className,
}: ProgressionPanelProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();

  /* Fluechtig: Maus. Betont eine Linie, oeffnet nichts. */
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const current = score.history.at(-1);
  const previous = score.history.at(-2);
  const movements = toCategoryMovements(categories);

  /*
   * Ohne zweiten Testtermin gibt es keine Entwicklung — und seit die
   * Gesamtlinie weg ist, auch ohne einen einzigen Bereich nichts zu zeichnen.
   * Frueher blieb in diesem Fall die tragende Linie allein stehen; jetzt waere
   * es ein leeres graues Feld mit einer Achse daneben.
   */
  if (!current || !previous || movements.length === 0) {
    return <EmptyProgression className={className} />;
  }

  const dates = score.history.map((point) => point.date);

  /*
   * ALLE vier Bereiche werden gezeichnet. Das Rauschband entscheidet nicht, OB
   * eine Linie da ist, sondern WIE LAUT sie ist — siehe den Block dazu in
   * rules.ts.
   */
  const traces: readonly Trace[] = movements.map((movement) => {
    const history =
      categories.find((entry) => entry.id === movement.id)?.history ?? [];
    return {
      id: movement.id,
      label: movement.shortName,
      delta: movement.delta,
      quiet: movement.insideNoise,
      values: dates.map(
        (date) => history.find((point) => point.date === date)?.value ?? null,
      ),
    };
  });

  /*
   * Der Boden der Achsenspanne. Genommen wird das BREITESTE Band des Feldes: die
   * Achse ist eine und muss der unsichersten Linie standhalten, sonst blaest sie
   * genau deren Rauschen auf. Dass die Liste hier nicht leer ist, hat die
   * Weiche oben sichergestellt.
   */
  const minSpan =
    Math.max(...movements.map((movement) => movement.noise)) * NOISE_HEADROOM;

  const topChanges = toTopChanges(changes);

  const fieldLabel = `Entwicklung über ${dates.length} Tests. ${toGermanList(
    traces.map(
      (trace) =>
        `${trace.label} ${toDeltaText(trace.delta)} Punkte auf ${
          trace.values.at(-1) ?? "nicht erhoben"
        }`,
    ),
  )}. Stand ${toLongDate(current.date)}.`;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <motion.section
        variants={motionPreset.fadeRise}
        custom={index}
        initial="hidden"
        animate="visible"
        aria-labelledby={titleId}
        /* Die Kachel ist ihr eigener Container: ob die Liste darunter drei
         * Spalten traegt oder eine, richtet sich nach IHRER Breite. */
        className="surface-card @container rounded-2xl p-6"
      >
        <ProgressionHeading id={titleId} />

        <div className="mt-5">
          <TrendField
            dates={dates}
            traces={traces}
            fieldLabel={fieldLabel}
            minSpan={minSpan}
            activeId={hoveredId}
            onHover={setHoveredId}
          />
        </div>

        {topChanges.length === 0 ? null : (
          <MovementList
            changes={topChanges}
            categories={categories}
            /* Die Kachel ist Element 0, die Beschriftungen laufen mit dem Feld —
             * die Liste folgt ihnen. */
            index={traces.length}
          />
        )}
      </motion.section>

      <ProgressionTable
        score={score}
        movements={movements}
        categories={categories}
      />
    </div>
  );
}
