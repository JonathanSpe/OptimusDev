"use client";

import { scaleLinear, scalePoint } from "d3-scale";
import { line } from "d3-shape";
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
import { ScoreDelta, toDeltaText } from "./score-delta";

/*
 * ============================================================================
 * DIE ENTWICKLUNG — ein Feld, fünf Linien, drei Namen.
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
 * DIE MARKE TRITT GENAU EINMAL AUF: als die eine Linie des Gesamtscores. Sie
 * ist damit kein Schmuck, sondern die Antwort auf die Frage, die das Feld
 * stellt. Jede zweite rote Linie wuerde diese Aussage halbieren.
 */

/*
 * DIE ERKLAERUNG DER KACHEL — hinter dem ⓘ am Kopf, einmal im Code.
 *
 * Sie fasst die Notationen in Worte, die man sonst raten muesste. Drei davon
 * gibt es, und keine erklaert sich von selbst:
 *
 *   DIE ACHSE laeuft ueber die volle Score-Skala. Das ist der Grund, warum die
 *   Linien dicht beieinander liegen — und es ist die Wahrheit ueber die Werte,
 *   nicht ein Mangel der Darstellung. Wer das nicht dazuschreibt, laesst den
 *   Leser vermuten, hier sei etwas zusammengedrueckt worden.
 *   DIE GESTRICHELTE LINIE ist eine Bewegung im Rauschband. Ohne diesen Satz
 *   waere der Strichel eine Notation mit Bedeutung und sonst nichts.
 *   DAS ANFASSEN eines Termins ist die einzige Angabe, die man nicht sieht,
 *   solange man es nicht tut.
 */
const PROGRESSION_EXPLAINER =
  `Jede Linie ist ein Bereich, die rote der Gesamtscore. Die Achse zeigt die volle Skala von ${SCORE_MIN} bis ${SCORE_MAX} Punkten — die Linien liegen deshalb dicht beieinander, und genau so gross sind die Bewegungen auch. ` +
  "Gestrichelt und blass gezeichnet sind Bereiche, deren Bewegung im Rauschband liegt: dort ist der Unterschied kleiner als die Streuung zwischen zwei Tests, also noch kein Trend. " +
  "Zeigst du auf einen Testtermin — mit der Maus oder mit der Tabulatortaste —, stehen die Werte aller Reihen zu diesem Termin an ihren Beschriftungen.";

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

/** Dimensionslose Marker bekommen keine Einheit angehaengt. */
function withUnit(value: number, unit: string): string {
  const text = markerFormat.format(value);
  return unit ? `${text} ${unit}` : text;
}

/** "2026-05-26" wird zu "26.05." — ohne Date-Objekt, also ohne Zeitzone. */
function toShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return month && day ? `${day}.${month}.` : isoDate;
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

/** Wort und Ton der Marker-Bewegung. Ohne hinterlegte Richtung: kein Urteil. */
const VERDICT_TONE: Readonly<
  Record<ChangeVerdict, { tone: string; label: string }>
> = {
  guenstig: { tone: "text-success", label: "günstig" },
  unguenstig: { tone: "text-warning", label: "ungünstig" },
  unbewertet: { tone: "text-muted-foreground", label: "ohne Urteil" },
  unveraendert: { tone: "text-muted-foreground", label: "unverändert" },
};

/* ------------------------------------------------------------------------- */
/* Geometrie                                                                   */
/* ------------------------------------------------------------------------- */

/** Hoehe des Feldes in Pixeln. */
const FIELD_HEIGHT = 256;

/*
 * ============================================================================
 * DIE ACHSE — volle Skala, beschriftet, und die Folgen davon ausgehalten.
 * ============================================================================
 * ⚠️ HIER STAND EINE ZUGESCHNITTENE SPANNE: das Feld reichte von der kleinsten
 * bis zur groessten gezeichneten Zahl plus zwoelf Prozent Luft, und die
 * ENTSCHEIDUNG daneben hielt das fuer vertretbar, SOLANGE keine Achse
 * danebensteht. Genau daran lag der Fehler — eine Kurve, die den halben Kasten
 * durchmisst, wird als grosse Bewegung gelesen, ob eine Achse danebensteht oder
 * nicht. Vier Punkte Unterschied sahen aus wie ein Aufschwung.
 *
 * Jetzt laeuft die Skala von SCORE_MIN bis SCORE_MAX, drei Linien, beschriftet.
 * DIE FOLGE IST BEABSICHTIGT: die fuenf Reihen liegen in einem schmalen Band im
 * oberen Drittel, und die Bewegungen sehen klein aus. Sie SIND klein. Die
 * Betraege stehen als Delta an jeder Beschriftung, die einzelnen Werte holt man
 * sich am Termin, und was die Bewegung getragen hat, steht in der Liste
 * darunter — es geht also nichts verloren ausser dem falschen Eindruck.
 *
 * Wer diese Spanne je wieder zuschneidet, muss BEIDES tun: die Achse ihre
 * echten Enden zeigen lassen und es im ⓘ-Text sagen. Zugeschnitten UND
 * unbeschriftet ist die eine Kombination, die es nicht mehr geben darf.
 */
const AXIS_TICKS: readonly number[] = [
  SCORE_MIN,
  (SCORE_MIN + SCORE_MAX) / 2,
  SCORE_MAX,
];

/**
 * Breite der Achsenbeschriftung links. "100" bei 10px Schrift misst rund 18px;
 * mehr braucht die breiteste Marke dieser Skala nicht.
 */
const AXIS_WIDTH = 20;

/** Abstand zwischen Achsenbeschriftung und Feldkante. */
const AXIS_GAP = 6;

/**
 * Breite der Beschriftungsspur rechts. Sie ist aus dem INHALT gerechnet: Punkt
 * (6) plus Fuge (6) plus der laengste Bereichsname ("Herz-Kreislauf", rund 72px
 * bei 11px Schrift) plus Fuge (6) plus die Wertspalte (40, siehe VALUE_WIDTH).
 *
 * ⚠️ SIE WAR 152px und damit ein Fuenftel der Kachel fuer fuenf kurze Woerter.
 * Was zu breit gemessen war, war nicht die Schrift, sondern die Reserve
 * dahinter. Die 22px gehen an das Feld, und dort sind sie Steigung.
 */
const LABEL_WIDTH = 130;

/**
 * Abstand zwischen Feld und Spur. Er ist zugleich die LAUFSTRECKE der
 * Verbindungslinien (siehe Leader unten): unter etwa 14px hat eine Verbindung,
 * die 30px in der Hoehe ueberbrueckt, keine lesbare Neigung mehr, sondern steht
 * fast senkrecht.
 */
const LABEL_GAP = 16;

/** Feld plus beide Spuren — alles, was neben dem Feld Platz braucht. */
const SIDE_WIDTH = AXIS_WIDTH + AXIS_GAP + LABEL_WIDTH + LABEL_GAP;

/**
 * Ab dieser Zeilenbreite steht die Spur NEBEN dem Feld. Darunter waere das Feld
 * schmaler als 200px, und auf 200px sind vier Testtermine keine Kurve mehr,
 * sondern ein Zickzack — dann rutschen die Beschriftungen unter das Feld und
 * bekommen die ganze Breite. Die Achse bleibt in beiden Lagen stehen: eine
 * Skala, die bei schmaler Kachel verschwindet, ist keine Skala.
 */
const STACK_BELOW = SIDE_WIDTH + 200;

/**
 * Ab dieser Verschiebung bekommt eine Beschriftung ihre Verbindungslinie. Ein
 * halber Pixel Versatz braucht keine — eine Linie zu zeichnen, wo nichts
 * auseinanderliegt, waere ein Zeichen ohne Anlass.
 */
const LEADER_MIN_OFFSET = 2;

/**
 * Mindestabstand zweier Beschriftungen am Linienende, in Pixeln — von Mitte zu
 * Mitte. Eine Beschriftung ist 16px hoch (leading-4), 18px liessen also zwei
 * Pixel Luft zwischen zwei Zeilen: rechnerisch kollisionsfrei und trotzdem ein
 * Block. Vier Punkte plus vier Namen plus vier Deltas brauchen eine Fuge, die
 * man als Fuge erkennt.
 */
const END_LABEL_GAP = 24;

/**
 * Halbe Zeilenhoehe. Die Beschriftungen sitzen auf ihrer Mitte
 * (-translate-y-1/2), also ist das der Abstand, den die oberste und die
 * unterste zum Feldrand halten muessen, um nicht angeschnitten zu werden.
 */
const END_LABEL_HALF = 8;

/**
 * Eine gezeichnete Reihe: ihre Werte, ihre Beschriftung und ihr Rang im Feld.
 * Feld und Beschriftungsspur lesen BEIDE aus dieser Liste — eine Linie, die
 * anders eingefaerbt waere als ihr Punkt in der Spur, waere zwei Linien.
 */
interface Trace {
  id: string;
  /** Beschriftung am Linienende. Kurzform, siehe CategoryScore.shortName. */
  label: string;
  /** Punkte gegenueber dem vorherigen Test. */
  delta: number;
  /** true = Bewegung im Rauschband: blasse Linie, graues Delta. */
  quiet: boolean;
  /** true = die tragende Linie (Gesamtscore). Genau EINE traegt das. */
  lead: boolean;
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

/** Breite der Wertspalte am Linienende — Delta und Messwert teilen sie sich. */
const VALUE_WIDTH = "w-10";

/**
 * Radius eines Messpunkts. Er haengt an drei Fragen, und alle drei sind
 * Rangfragen: traegt die Reihe die Aussage, ist das der juengste Test, wird
 * dieser Termin gerade gelesen.
 */
function toPointRadius(
  lead: boolean,
  isLast: boolean,
  isRead: boolean,
): number {
  const base = lead ? (isLast ? 4 : 2.5) : isLast ? 3 : 1.75;
  return isRead ? base + 1 : base;
}

interface TrendFieldProps {
  dates: readonly string[];
  /** Alle Reihen; genau eine davon traegt lead. */
  traces: readonly Trace[];
  /** Beschreibung des ganzen Bildes fuer Screenreader. */
  fieldLabel: string;
  /** Reihe, deren Linie gerade vortritt. Kommt von ihrer Beschriftung. */
  activeId: string | null;
  onHover: (id: string | null) => void;
  /** Angefasster Testtermin als Platz in `dates`; null = keiner. */
  readIndex: number | null;
  onRead: (index: number | null) => void;
}

function TrendField({
  dates,
  traces,
  fieldLabel,
  activeId,
  onHover,
  readIndex,
  onRead,
}: TrendFieldProps) {
  const motionPreset = useMotionPreset();
  const [row, rowSize] = useRowSize();
  /*
   * Die Haarlinien warten auf das ENDE der tragenden Linie, nicht auf eine
   * Zahl: so gibt es keine zweite Zeitangabe im Code, und bei reduzierter
   * Bewegung ist die Linie sofort fertig — dann steht alles zusammen da.
   */
  const [leadDrawn, setLeadDrawn] = useState(false);

  const gutter = AXIS_WIDTH + AXIS_GAP;
  const stacked = rowSize.width > 0 && rowSize.width < STACK_BELOW;
  const fieldWidth = Math.max(
    0,
    rowSize.width - gutter - (stacked ? 0 : LABEL_WIDTH + LABEL_GAP),
  );
  const isMeasured = fieldWidth > 0;

  const lead = traces.find((trace) => trace.lead);
  const hairlines = traces.filter((trace) => !trace.lead);
  const lastIndex = dates.length - 1;

  /* EINE Skala fuer alle Linien, und es ist die volle — siehe AXIS_TICKS. */
  const toY = scaleLinear()
    .domain([SCORE_MIN, SCORE_MAX])
    .range([FIELD_HEIGHT, 0]);

  /* Die Rasterlinien an den Enden der Skala liegen auf der Feldkante; ein
   * halber Pixel nach innen haelt sie vollstaendig im Bild. */
  const toGridY = (value: number): number =>
    Math.min(FIELD_HEIGHT - 0.5, Math.max(0.5, toY(value)));

  /*
   * Die Termine sind eine ORDINALE Achse: zwischen zwei Tests liegt kein halber
   * Test, und ungleiche Abstaende wuerden hier eine Geschwindigkeit behaupten,
   * die der Score nicht hat.
   */
  const toX = scalePoint<string>().domain(dates).range([0, fieldWidth]);
  const positions = dates.map((date) => toX(date) ?? 0);

  /*
   * Gerade Verbindungen, keine Glaettung: eine Spline erfindet zwischen zwei
   * Tests Werte, die niemand gemessen hat.
   */
  const toPath = line<number | null>()
    .defined((value) => value !== null)
    .x((_, index) => positions[index] ?? 0)
    .y((value) => toY(value ?? 0));

  const lastX = positions.at(-1) ?? 0;

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
   * Die Lesespalten: je Termin ein Streifen, der bis zur Mitte zum Nachbarn
   * reicht. Gerechnet und nicht gleichmaessig geteilt, weil die aeusseren
   * Termine nur eine halbe Spalte haben — ihre Punkte sitzen auf der Feldkante.
   */
  const columns = positions.map((x, index) => {
    const left = index === 0 ? 0 : ((positions[index - 1] ?? x) + x) / 2;
    const right =
      index === lastIndex ? fieldWidth : (x + (positions[index + 1] ?? x)) / 2;
    return { left, width: Math.max(0, right - left) };
  });

  /** Alle fuenf Reihen zu EINEM Termin — die Vorlesefassung der Lesespalte. */
  const toReadLabel = (index: number): string =>
    `${toLongDate(dates[index] ?? "")}: ${toGermanList(
      traces.map((trace) => {
        const value = trace.values[index];
        return value === null || value === undefined
          ? `${trace.label} nicht erhoben`
          : `${trace.label} ${value}`;
      }),
    )}, jeweils von ${SCORE_MAX} Punkten.`;

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
        /* Zwei verschiedene Nullen: "es wird gerade kein Termin gelesen" und
         * "an diesem Termin wurde nichts erhoben". Die zweite muss als Luecke
         * dastehen — faellt sie auf das Delta zurueck, stuende in einer Reihe
         * von vier Messwerten eine Bewegung, und die liest sich als fuenfter. */
        const reading = readIndex !== null;
        const readValue = reading ? (trace.values[readIndex] ?? null) : null;

        return (
          <motion.li
            key={trace.id}
            variants={motionPreset.fadeIn}
            initial="hidden"
            animate={leadDrawn ? "visible" : "hidden"}
            custom={position}
            onMouseEnter={() => onHover(trace.id)}
            onMouseLeave={() => onHover(null)}
            style={
              stacked || slot === undefined ? undefined : { top: slot.labelY }
            }
            className={cn(
              "text-2xs flex items-center gap-1.5 leading-4 transition-opacity",
              stacked ? null : "absolute left-0 -translate-y-1/2",
              isRecessed && "opacity-55",
            )}
          >
            {/*
             * Der Punkt traegt die Farbe SEINER Linie — er ist die ganze
             * Verbindung zwischen Beschriftung und Kurve, und wo die
             * Beschriftung von ihrem Linienende weggeschoben wurde, laeuft
             * zusaetzlich eine Verbindungslinie zu ihm.
             *
             * ⚠️ HIER KOMMT KEINE STATUSFARBE HIN, auch nicht, seit das
             * Bereichsfeld darueber eine traegt. Die Farben dort beantworten
             * "wo stehst du"; dieses Feld beantwortet "wohin geht es". Ein
             * bernsteiner Punkt an einer steigenden Linie waere beides
             * gleichzeitig, und die Linie verloere ihre einzige Aussage. Der
             * Akzent bleibt der tragenden Linie vorbehalten, die vier
             * Bereichslinien bleiben Haarlinien — unterschieden durch Staerke,
             * Strichel und Beschriftung, nicht durch Ton.
             */}
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                trace.lead
                  ? "bg-trend-line"
                  : trace.quiet
                    ? "bg-trend-hairline-muted"
                    : "bg-trend-hairline",
              )}
            />
            {/*
             * Der NAME bleibt neutral, auch der der tragenden Linie. Zwei
             * Gruende, und beide zaehlen: die Marke tritt in diesem Feld genau
             * EINMAL auf, als die Linie selbst — ein zweites Mal als Schrift
             * halbierte diese Aussage. Und im Dunkelmodus haelt der Markenton
             * auf der Karte nur 3,7:1; das genuegt einer Linie (Grafik, 3:1),
             * nicht einer 11px-Schrift (4,5:1). Die Verbindung zur Linie macht
             * der Punkt davor, und der ist Grafik.
             */}
            <span
              className={cn(
                "text-foreground",
                trace.lead && "font-semibold",
                stacked ? null : "min-w-0 truncate",
              )}
            >
              {trace.label}
            </span>
            {/*
             * DIESELBE SPALTE, ZWEI ANGABEN — und welche dasteht, haengt daran,
             * ob gerade ein Termin gelesen wird.
             *
             * In Ruhe steht hier das Delta: die Frage der Kachel ist "wohin ging
             * es", und die beantwortet die Bewegung. Faehrt man einen Termin an,
             * steht hier sein WERT — dann ist die Frage eine andere geworden
             * ("wo stand es damals"), und sie an anderer Stelle zu beantworten
             * hiesse, eine zweite Flaeche aufzumachen, die man erst suchen muss.
             *
             * Die feste Breite ist kein Schmuck: ohne sie ruecken beim Lesen
             * fuenf Beschriftungen seitlich, waehrend die Verbindungslinien auf
             * ihre alten Enden zeigen.
             */}
            <span
              className={cn(
                "flex shrink-0 justify-end tabular-nums",
                /* Nur neben dem Feld: unter dem Feld stehen die Beschriftungen
                 * in einer umbrechenden Reihe, dort waere die feste Breite eine
                 * Luecke zwischen Name und Wert und sonst nichts. */
                stacked ? null : VALUE_WIDTH,
              )}
            >
              {reading ? (
                <span className="text-foreground font-medium">
                  {readValue ?? "—"}
                </span>
              ) : (
                <ScoreDelta delta={trace.delta} quiet={trace.quiet} />
              )}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );

  return (
    <div ref={row}>
      <div className="flex items-start" style={{ gap: LABEL_GAP }}>
        <div className="flex shrink-0 items-start" style={{ gap: AXIS_GAP }}>
          {/*
           * DIE WERTACHSE. Drei Marken, rechtsbuendig an der Feldkante, in der
           * leisesten Schriftstufe — sie ordnet ein, sie meldet sich nicht. Die
           * Rasterlinien dazu liegen im Feld (siehe unten); Marke und Linie
           * teilen sich dieselbe Liste, damit sie nicht auseinanderlaufen.
           */}
          <div
            aria-hidden="true"
            className="relative shrink-0"
            style={{ width: AXIS_WIDTH, height: FIELD_HEIGHT }}
          >
            {AXIS_TICKS.map((tick) => (
              <span
                key={`marke-${tick}`}
                className="text-faint text-3xs absolute right-0 -translate-y-1/2 tabular-nums"
                style={{ top: toY(tick) }}
              >
                {tick}
              </span>
            ))}
          </div>

          <div
            className="relative shrink-0"
            style={{ width: fieldWidth, height: FIELD_HEIGHT }}
          >
            {/*
             * Das Feld ist EIN Bild mit einer Beschreibung. Die Einzelteile
             * darin bleiben fuer Screenreader unsichtbar — vorgelesen waeren
             * sie eine Reihe zusammenhangloser Zahlen. Denselben Inhalt tragen
             * die Beschriftungen DANEBEN (echter Text, deshalb ausserhalb
             * dieses Bildes), die Lesespalten und die Tabelle unter der Kachel.
             */}
            <div
              role="img"
              aria-label={fieldLabel}
              className="absolute inset-0"
            >
              {isMeasured && lead ? (
                <svg
                  aria-hidden="true"
                  width={fieldWidth}
                  height={FIELD_HEIGHT}
                  className="absolute inset-0 overflow-visible"
                >
                  {/* Das Raster zuerst: alles Weitere liegt darauf. */}
                  {AXIS_TICKS.map((tick) => (
                    <line
                      key={`raster-${tick}`}
                      x1={0}
                      x2={fieldWidth}
                      y1={toGridY(tick)}
                      y2={toGridY(tick)}
                      strokeWidth={1}
                      className="stroke-trend-grid"
                    />
                  ))}

                  {/* Das Fadenkreuz des gelesenen Termins. Es zeigt nur, WO
                   * gelesen wird — die Werte stehen als Text in der Spur. */}
                  {readIndex === null ? null : (
                    <line
                      x1={positions[readIndex] ?? 0}
                      x2={positions[readIndex] ?? 0}
                      y1={0}
                      y2={FIELD_HEIGHT}
                      strokeWidth={1}
                      className="stroke-trend-crosshair"
                    />
                  )}

                  {/*
                   * Die Haarlinien liegen UNTER der tragenden Linie: kreuzen sie
                   * sich, gehoert die Kreuzung der Linie, die die Aussage traegt.
                   */}
                  {hairlines.map((trace, position) => {
                    const isActive = activeId === trace.id;
                    const isRecessed = activeId !== null && !isActive;
                    /* Ausgeschriebene Klassen, keine zusammengesetzten: Tailwind
                     * liest den Quelltext und findet nur, was als ganzes Wort
                     * dasteht. */
                    const stroke = isActive
                      ? "stroke-trend-hairline-active"
                      : isRecessed || trace.quiet
                        ? "stroke-trend-hairline-muted"
                        : "stroke-trend-hairline";
                    const fill = isActive
                      ? "fill-trend-hairline-active"
                      : isRecessed || trace.quiet
                        ? "fill-trend-hairline-muted"
                        : "fill-trend-hairline";

                    return (
                      <motion.g
                        key={trace.id}
                        variants={motionPreset.fadeIn}
                        initial="hidden"
                        animate={leadDrawn ? "visible" : "hidden"}
                        /* Platz 1 aufwaerts: die tragende Linie ist Platz 0. */
                        custom={position + 1}
                      >
                        <motion.path
                          d={toPath(trace.values) ?? ""}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          /*
                           * GESTRICHELT HEISST "IM RAUSCHBAND". Der Blassgrad
                           * allein war ein Beinahe-Unterschied: vier Linien in
                           * derselben Staerke, eine davon etwas heller, liest
                           * niemand als Aussage — man haelt es fuer eine Linie
                           * weiter hinten. Der Strichel ist der Schritt, den man
                           * SIEHT, und er sagt in der Bildsprache jeder
                           * Statistik dasselbe, was hier gemeint ist:
                           * vorlaeufig, noch kein Trend. In Graustufen bleibt er
                           * ebenfalls stehen (WCAG 1.4.1); das Wort dazu steht
                           * im ⓘ.
                           */
                          strokeDasharray={trace.quiet ? "3 4" : undefined}
                          /* initial={false}: die Staerke ist ein ZUSTAND und kein
                           * Auftritt — sie steht beim ersten Frame da und wird
                           * erst beim Betonen animiert. Ohne das sucht Motion
                           * einen Ausgangswert im DOM, findet keinen und meldet
                           * "undefined is not an animatable value". */
                          initial={false}
                          animate={{ strokeWidth: isActive ? 1.75 : 1 }}
                          transition={motionPreset.hover}
                          className={cn("transition-colors", stroke)}
                        />
                        {/*
                         * JEDE MESSUNG IST EIN PUNKT. Vorher trug nur das Ende
                         * einen — die vier Tests davor waren durch die Linie
                         * nur BEHAUPTET, und eine Linie ohne Punkte behauptet
                         * ausserdem einen Verlauf zwischen den Messungen, den es
                         * nicht gibt. Dieselbe Regel faehrt die Kachel auf dem
                         * Dashboard.
                         */}
                        {trace.values.map((value, index) =>
                          value === null ? null : (
                            <circle
                              key={`punkt-${trace.id}-${dates[index]}`}
                              cx={positions[index] ?? 0}
                              cy={toY(value)}
                              r={toPointRadius(
                                false,
                                index === lastIndex,
                                index === readIndex,
                              )}
                              className={cn(
                                "transition-colors",
                                index === readIndex
                                  ? "fill-trend-hairline-active"
                                  : fill,
                              )}
                            />
                          ),
                        )}
                      </motion.g>
                    );
                  })}

                  {/* Die tragende Linie zeichnet sich EINMAL, in der Richtung der
                   * Zeit. Alles Weitere im Feld wartet auf ihr Ende. */}
                  <motion.path
                    d={toPath(lead.values) ?? ""}
                    fill="none"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="stroke-trend-line"
                    variants={motionPreset.drawPath}
                    initial="hidden"
                    animate="visible"
                    onAnimationComplete={() => setLeadDrawn(true)}
                  />

                  <motion.g
                    variants={motionPreset.fadeIn}
                    initial="hidden"
                    animate={leadDrawn ? "visible" : "hidden"}
                  >
                    {lead.values.map((value, index) =>
                      value === null ? null : (
                        <circle
                          key={`punkt-gesamt-${dates[index]}`}
                          cx={positions[index] ?? 0}
                          cy={toY(value)}
                          r={toPointRadius(
                            true,
                            index === lastIndex,
                            index === readIndex,
                          )}
                          className="fill-trend-line"
                        />
                      ),
                    )}
                  </motion.g>

                  {/*
                   * DIE VERBINDUNGSLINIEN. Sobald der Loeser eine Beschriftung
                   * von ihrem Linienende wegschiebt, steht sie auf der Hoehe
                   * einer FREMDEN Linie — und ein Feld, das Werte der falschen
                   * Reihe zuordnet, ist schlimmer als eines, in dem sich zwei
                   * Beschriftungen ueberlappen. Die Linie laeuft als flache
                   * Kurve vom Messpunkt zum Punkt der Beschriftung; sie beginnt
                   * ausserhalb des Messpunkts, damit sie nicht aus ihm
                   * herauszuwachsen scheint.
                   *
                   * Sie bleibt im Haarlinienton, auch die der tragenden Linie:
                   * eine Verbindung ist kein Messwert, und der Akzent gehoert
                   * den Daten.
                   *
                   * UNTER dem Feld gibt es sie nicht: dort stehen die
                   * Beschriftungen in einer Reihe unter der Datumszeile, und
                   * eine Linie, die zu einer Stelle laeuft, an der nichts mehr
                   * steht, zeigt auf den Kartenrand.
                   */}
                  <motion.g
                    variants={motionPreset.fadeIn}
                    initial="hidden"
                    animate={leadDrawn ? "visible" : "hidden"}
                  >
                    {(stacked ? [] : traces).map((trace) => {
                      const slot = slotById.get(trace.id);
                      if (
                        !slot ||
                        Math.abs(slot.labelY - slot.dataY) < LEADER_MIN_OFFSET
                      ) {
                        return null;
                      }

                      const from = lastX + 5;
                      const to = lastX + LABEL_GAP;
                      const bend = (from + to) / 2;

                      return (
                        <path
                          key={`fuehrung-${trace.id}`}
                          d={`M ${from} ${slot.dataY} C ${bend} ${slot.dataY}, ${bend} ${slot.labelY}, ${to} ${slot.labelY}`}
                          fill="none"
                          strokeWidth={1}
                          className="stroke-trend-hairline"
                        />
                      );
                    })}
                  </motion.g>
                </svg>
              ) : null}
            </div>

            {/*
             * DIE LESESPALTEN — je Testtermin eine, ueber die ganze Feldhoehe.
             *
             * Das ist die Stelle, an der aus einem Bild ein Diagramm wird: bis
             * hierher konnte man eine Linie betonen, aber nicht ABLESEN, was an
             * einem Termin stand. Es sind echte Schaltflaechen und keine
             * Mausflaechen, weil das Ablesen sonst nur mit Zeiger ginge — mit
             * der Tabulatortaste wandert man jetzt Termin fuer Termin durch das
             * Feld, und die Beschriftung jeder Spalte nennt alle fuenf Werte.
             * Sie tun beim Klick nichts: sie sind eine LESEPOSITION und keine
             * Aktion.
             */}
            {isMeasured
              ? columns.map((column, index) => (
                  <button
                    key={`termin-${dates[index]}`}
                    type="button"
                    onMouseEnter={() => onRead(index)}
                    onMouseLeave={() => onRead(null)}
                    onFocus={() => onRead(index)}
                    onBlur={() => onRead(null)}
                    aria-label={toReadLabel(index)}
                    className="focus-visible:outline-ring absolute inset-y-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ left: column.left, width: column.width }}
                  />
                ))
              : null}
          </div>
        </div>

        {stacked ? null : labels}
      </div>

      {/*
       * Die Datumsreihe steht unter dem FELD, genau so breit wie es und dicht
       * daran: sie ist die Beschriftung der Achse und kein eigener Block.
       * Der gelesene Termin tritt hier vor — damit hat das Fadenkreuz einen
       * NAMEN und nicht nur eine Stelle.
       */}
      <div
        aria-hidden="true"
        className="relative mt-1 h-4"
        style={{ width: fieldWidth, marginLeft: gutter }}
      >
        {dates.map((date, index) => (
          <span
            key={`achse-${date}`}
            className={cn(
              "text-3xs absolute tabular-nums transition-colors",
              index === readIndex
                ? "text-foreground font-medium"
                : "text-faint",
              /* Die aeusseren Beschriftungen stehen buendig statt mittig —
               * zentriert liefen sie aus dem Feld. */
              index === 0
                ? "left-0"
                : index === lastIndex
                  ? "right-0"
                  : "-translate-x-1/2",
            )}
            style={
              index === 0 || index === lastIndex
                ? undefined
                : { left: `${(index / Math.max(1, lastIndex)) * 100}%` }
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
 *
 * ============================================================================
 * SIE IST JETZT EINE TABELLE, und das ist der ganze Unterschied.
 * ============================================================================
 * ⚠️ HIER STAND EINE LISTE aus drei Rastern mit je zwei bis drei Zellen, in der
 * Messwerte und Urteil als rechtsbuendiger Pulk zusammenstanden. Jede Zeile war
 * fuer sich lesbar; DREI Zeilen untereinander waren es nicht, weil "102 → 88
 * mg/dl" und "0,9 → 0,6 mg/l" verschieden breit sind und ihre Nachbarangaben
 * damit an verschiedenen Stellen anfingen. Wer die Prozentwerte vergleichen
 * wollte, musste jede Zeile einzeln zerlegen.
 *
 * Fuenf echte Spalten mit Kopf loesen genau das: die Augen laufen einmal
 * SENKRECHT durch die Prozentspalte, statt dreimal waagerecht durch eine Zeile.
 * Und es ist ohnehin, was der Inhalt ist — fuenf gleichartige Angaben zu drei
 * Zeilen sind eine Tabelle, ganz gleich, welches Element man dafuer nimmt. Als
 * <table> bekommen die Spaltenkoepfe zusaetzlich ihre Zuordnung fuer
 * Screenreader geschenkt.
 *
 * SCHMAL FALLEN ZWEI SPALTEN WEG, nicht ihr Inhalt: unter 32rem Kachelbreite
 * ruecken Bereich und Urteil in die Zellen, zu denen sie gehoeren. Fuenf
 * Textspalten auf 350px waeren fuenf abgeschnittene Woerter.
 *
 * DER AUFTRITT IST fadeIn UND NICHT fadeRise. Eine Tabellenzeile ist ein
 * display:table-row; sie laesst sich zuverlaessig in der Deckkraft animieren,
 * aber nicht verschieben, ohne dass das Raster darunter zuckt.
 */
function MovementList({ changes, categories, index }: MovementListProps) {
  const motionPreset = useMotionPreset();

  return (
    <div className="border-border mt-4 border-t pt-4">
      <h3 className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Grösste Bewegungen
      </h3>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr className="text-faint text-3xs">
            <th scope="col" className="pb-1 font-medium">
              Marker
            </th>
            <th
              scope="col"
              className="hidden pb-1 pl-3 font-medium @lg:table-cell"
            >
              Bereich
            </th>
            <th scope="col" className="pb-1 pl-3 text-right font-medium">
              Von → Nach
            </th>
            <th scope="col" className="pb-1 pl-3 text-right font-medium">
              Veränderung
            </th>
            <th
              scope="col"
              className="hidden pb-1 pl-3 text-right font-medium @lg:table-cell"
            >
              Urteil
            </th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change, position) => {
            const reading = toChangeReading(change);
            const verdict = VERDICT_TONE[reading.verdict];
            /* Der Bereich steht nur da, wenn er hinterlegt ist: ein geratener
             * Bereich neben einem Markernamen ist schlimmer als keiner. */
            const areaName = categories.find(
              (category) => category.id === categoryIdByMarker(change.id),
            )?.shortName;

            return (
              <motion.tr
                key={change.id}
                variants={motionPreset.fadeIn}
                custom={index + position}
                className="border-border/60 border-t"
              >
                <th
                  scope="row"
                  className="text-foreground py-2 text-xs font-semibold"
                >
                  {change.name}
                  {areaName ? (
                    <span className="text-muted-foreground text-2xs block font-normal @lg:hidden">
                      {areaName}
                    </span>
                  ) : null}
                </th>
                <td className="text-muted-foreground text-2xs hidden py-2 pl-3 @lg:table-cell">
                  {areaName}
                </td>
                <td className="text-muted-foreground text-2xs py-2 pl-3 text-right whitespace-nowrap tabular-nums">
                  {withUnit(change.previous, change.unit)}
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only">auf</span>
                  <span className="text-foreground font-medium">
                    {withUnit(change.current, change.unit)}
                  </span>
                </td>
                {/*
                 * DIE ZAHL BLEIBT NEUTRAL, das WORT traegt die Farbe. Vorher
                 * war es umgekehrt, und damit hing der Ton an der Angabe, die
                 * ihn am wenigsten braucht: eine Prozentzahl ist eine Messung,
                 * das Urteil ist die Deutung. So bleibt es ausserdem bei EINER
                 * gefaerbten Stelle je Zeile (siehe Farbpolitik in
                 * analysis-board.tsx), und die Prozentspalte laesst sich
                 * senkrecht lesen, ohne dass drei Toene dazwischenfunken.
                 */}
                <td className="text-foreground text-2xs py-2 pl-3 text-right font-medium tabular-nums">
                  {reading.verdict === "unveraendert"
                    ? "±0 %"
                    : percentFormat.format(reading.ratio)}
                  {/* Schmal steht das Urteil hier mit — es hat dann keine
                   * eigene Spalte, darf aber nicht fehlen: bei einem Marker
                   * sagt das VORZEICHEN nichts ueber gut oder schlecht, minus
                   * 14 Prozent LDL ist die Erholung und plus 14 Prozent hs-CRP
                   * das Problem. */}
                  <span
                    className={cn(
                      "text-3xs ml-1.5 font-normal @lg:hidden",
                      verdict.tone,
                    )}
                  >
                    {verdict.label}
                  </span>
                </td>
                <td
                  className={cn(
                    "text-2xs hidden py-2 pl-3 text-right whitespace-nowrap @lg:table-cell",
                    verdict.tone,
                  )}
                >
                  {verdict.label}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
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

/** Die tragende Linie. Genau eine, und sie gehoert dem Gesamtscore. */
const TOTAL_ID = "gesamt";

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
  /*
   * Der gerade gelesene Testtermin. Ebenfalls fluechtig, aber aus Maus ODER
   * Tastatur — deshalb ein Platz und keine Id: die Spalte ist eine Stelle auf
   * der Achse und gehoert keiner Reihe.
   */
  const [readIndex, setReadIndex] = useState<number | null>(null);

  const current = score.history.at(-1);
  const previous = score.history.at(-2);
  if (!current || !previous) {
    return <EmptyProgression className={className} />;
  }

  const dates = score.history.map((point) => point.date);
  const movements = toCategoryMovements(categories);

  /*
   * ALLE vier Bereiche werden gezeichnet, plus der Gesamtscore. Das Rauschband
   * entscheidet nicht mehr, OB eine Linie da ist, sondern WIE LAUT sie ist —
   * siehe den Block dazu in rules.ts.
   */
  const traces: readonly Trace[] = [
    {
      id: TOTAL_ID,
      label: "Gesamt",
      delta: current.value - previous.value,
      quiet: false,
      lead: true,
      values: score.history.map((point) => point.value),
    },
    ...movements.map((movement) => {
      const history =
        categories.find((entry) => entry.id === movement.id)?.history ?? [];
      return {
        id: movement.id,
        label: movement.shortName,
        delta: movement.delta,
        quiet: movement.insideNoise,
        lead: false,
        values: dates.map(
          (date) => history.find((point) => point.date === date)?.value ?? null,
        ),
      };
    }),
  ];

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

        {/* EINE Abstandsstufe fuer die ganze Kachel: Kopf, Feld, Trennlinie und
         * Liste stehen alle auf space-4. Vorher liefen 5, 2, 6 und 4
         * nebeneinander, und der groesste Abstand sass ausgerechnet zwischen
         * zwei Dingen, die zusammengehoeren. */}
        <div className="mt-4">
          <TrendField
            dates={dates}
            traces={traces}
            fieldLabel={fieldLabel}
            activeId={hoveredId}
            onHover={setHoveredId}
            readIndex={readIndex}
            onRead={setReadIndex}
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
