"use client";

import {
  Check,
  ChevronDown,
  CircleHelp,
  Clock,
  Minus,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useId, useState } from "react";

import { PanelExplainer } from "@/components/common/panel-explainer";
import type { Supplement, SupplementIntake } from "@/contracts";
import { useMotionPreset } from "@/lib/motion";
import { toSupplementImage } from "@/lib/supplement-images";
import { cn } from "@/lib/utils";

import {
  isAdjustedActionHint,
  toObservedChange,
  toSupplementStatus,
  type SupplementStatus,
} from "../rules";

/*
 * ============================================================================
 * DIE PRAEPARATE — vier Spalten, eine Frage: wirkt, was du nimmst?
 * ============================================================================
 * ERSTER BLICK   eine Zeile je Praeparat, vier feste Spalten: Kapsel, Name,
 *                beobachtete Veraenderung, Status. Alle Zeilen liegen exakt
 *                aufeinander — auch die ohne Prozentwert behalten deren
 *                Zeilenhoehe, sonst wandert die Spalte von Zeile zu Zeile.
 *                Ueber der Liste steht EINE Zeile, die die Staende zaehlt.
 *   KLICK        Wirkfenster und naechster Schritt. Beides sind Angaben zum
 *                Handeln und keine Befunde — im ersten Blick waeren sie zwei
 *                weitere Spalten, die man gegen die anderen abwaegen muesste.
 *
 * Der Status kommt aus toSupplementStatus in rules.ts, nicht aus den Rohdaten.
 * Zwei Folgen davon stehen hier sichtbar:
 *
 *   1. Vor dem Wirkfenster steht "zu früh", nie "keine Reaktion". Eine
 *      fehlende Wirkung vor dem Fenster ist keine fehlende Wirkung.
 *   2. "Keine Reaktion" ist ein eigener Befund. Der actionHint muss dann ein
 *      angepasster Rat sein — isAdjustedActionHint faengt den Fall ab, in dem
 *      jemand denselben Rat noch einmal hinschriebe.
 *
 * Statusfarbe nur dort, wo ein Urteil dahinter steht, und immer mit Icon und
 * Wort. "Zu früh" und "nicht beurteilbar" bleiben deshalb grau.
 */

/* ------------------------------------------------------------------------- */
/* Die Einnahme                                                                */
/* ------------------------------------------------------------------------- */

/*
 * ⚠️ HIER STAND CAPSULE_BY_ID — eine Tabelle Praeparat-Id → Foto. Sie ist weg:
 * welches Bild ein Praeparat traegt, sagen jetzt die Daten (Feld imageKey im
 * Vertrag), und aufgeloest wird der Schluessel in lib/supplement-images.ts.
 * Die Begruendung steht dort.
 *
 * DIESE KACHEL ZEIGT NUR LAUFENDE PRAEPARATE. Seit der Vertrag auch solche
 * kennt, die niemand nimmt (intake === null), muss diese Datei den Fall
 * abfangen: "Wirkt, was du nimmst?" kann ueber ein Praeparat, das man nicht
 * nimmt, nichts sagen. SupplementPanel filtert sie deshalb heraus, und die
 * Zeile selbst kommt ohne intake gar nicht erst vor.
 */

/**
 * Ein Praeparat, das tatsaechlich genommen wird. Der Typ macht die Vorbedingung
 * dieser Kachel zu einer Zusage des Compilers, statt sie in jeder Zelle mit
 * einem `?.` zu umgehen — die Zeile braucht Einnahmebeginn und Tageszahl, und
 * ein `prep.intake?.daysOn ?? 0` waere eine erfundene Null.
 */
type TakenSupplement = Supplement & { intake: SupplementIntake };

function isTaken(prep: Supplement): prep is TakenSupplement {
  return prep.intake !== null;
}

/* ------------------------------------------------------------------------- */
/* Formate                                                                     */
/* ------------------------------------------------------------------------- */

const markerFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

const numberFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

/* Dieselbe Rundung wie ueberall sonst in der Analyse. */
const percentFormat = new Intl.NumberFormat("de-DE", {
  style: "percent",
  signDisplay: "exceptZero",
  maximumFractionDigits: 0,
});

/**
 * "±0 %" statt "0 %": eine Null OHNE Vorzeichen liest sich wie ein fehlender
 * Wert, eine Null MIT Vorzeichen behauptet eine Richtung, die es nicht gab.
 */
function toPercentText(ratio: number): string {
  return ratio === 0 ? "±0 %" : percentFormat.format(ratio);
}

/** "2026-01-27" → "27.01.2026", ohne Date-Objekt, also ohne Zeitzone. */
function toLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}

/** Dieselbe Angabe kurz, fuer die Kontextzeile unter dem Namen. */
function toShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return month && day ? `${day}.${month}.` : isoDate;
}

/* ------------------------------------------------------------------------- */
/* Status                                                                      */
/* ------------------------------------------------------------------------- */

interface StatusLook {
  /** Wort in der Pille. */
  label: string;
  /** Dieselbe Lage gezaehlt, fuer die Zeile ueber der Liste. */
  count: (count: number) => string;
  /** Textfarbe von Icon und Wort. */
  tone: string;
  /** Zarte Flaeche der Pille. */
  pill: string;
  icon: LucideIcon;
}

/*
 * "Wirkt schwach" und "keine Reaktion" sind ZWEI Befunde und bekommen deshalb
 * zwei Farben: das eine ist zu wenig Bewegung, das andere gar keine — nach dem
 * Wirkfenster. Mit demselben Bernstein fuer beide waere der Unterschied nur
 * noch im Wort, und genau dieser Unterschied entscheidet, ob jemand wartet oder
 * etwas aendert.
 */
const STATUS_LOOK: Readonly<Record<SupplementStatus, StatusLook>> = {
  wirkt: {
    label: "wirkt",
    count: (count) => (count === 1 ? "1 wirkt" : `${count} wirken`),
    tone: "text-success",
    pill: "bg-success-subtle",
    icon: Check,
  },
  wirktSchwach: {
    label: "wirkt schwach",
    count: (count) =>
      count === 1 ? "1 wirkt schwach" : `${count} wirken schwach`,
    tone: "text-warning",
    pill: "bg-warning-subtle",
    icon: Minus,
  },
  keineReaktion: {
    label: "keine Reaktion",
    count: (count) => `${count} ohne Reaktion`,
    tone: "text-critical",
    pill: "bg-critical-subtle",
    icon: X,
  },
  zuFrueh: {
    label: "zu früh",
    count: (count) => `${count} zu früh für ein Urteil`,
    tone: "text-muted-foreground",
    pill: "bg-muted",
    icon: Clock,
  },
  nichtBeurteilbar: {
    label: "nicht beurteilbar",
    count: (count) => `${count} nicht beurteilbar`,
    tone: "text-muted-foreground",
    pill: "bg-muted",
    icon: CircleHelp,
  },
};

/* Die Reihenfolge der Zusammenfassung: vom Befund zum Nicht-Befund. */
const SUMMARY_ORDER = [
  "wirkt",
  "wirktSchwach",
  "keineReaktion",
  "zuFrueh",
  "nichtBeurteilbar",
] as const satisfies readonly SupplementStatus[];

/*
 * Fallback, falls ein actionHint bei "keine Reaktion" dieselbe Einnahme
 * fortschriebe. Der Text ist bewusst allgemein — der konkrete Rat gehoert an
 * das Praeparat; hier steht nur die Regel, die den Fehler abfaengt.
 */
const ADJUSTED_FALLBACK =
  "Dosis, Präparat oder Einnahme anpassen — dieselbe Dosis wiederholen hilft hier nicht.";

function toActionHint(prep: Supplement, status: SupplementStatus): string {
  if (!isAdjustedActionHint(status, prep.actionHint)) {
    return ADJUSTED_FALLBACK;
  }
  return prep.actionHint;
}

/* ------------------------------------------------------------------------- */
/* Die beobachtete Veraenderung                                                */
/* ------------------------------------------------------------------------- */

interface ObservedReading {
  /** Die beiden Messwerte, oder der Grund, warum es sie nicht gibt. */
  value: string;
  /** Die Zeile darunter. null heisst: es gibt keinen Prozentwert. */
  percent: string | null;
  /** Vorgelesene Fassung — "auf" statt Pfeil. */
  spoken: string;
}

/**
 * ENTSCHEIDUNG: Gemessene Werte stehen hier auch dann, wenn der Status noch
 * "zu früh" lautet. Die Spalte heisst "Beobachtet" und zeigt, was gemessen
 * wurde; ob daraus schon eine Wirkung folgt, sagt die Statusspalte. Werte zu
 * verstecken, die es gibt, waere eine zweite, stille Bewertung.
 */
function toObservedReading(prep: Supplement): ObservedReading {
  const change = toObservedChange(prep);
  if (change === null) {
    const reason =
      prep.targetMarker === null ? "nicht messbar" : "noch nicht gemessen";
    return { value: reason, percent: null, spoken: reason };
  }

  const unit = prep.targetUnit ? ` ${prep.targetUnit}` : "";
  const from = markerFormat.format(change.baseline);
  const to = markerFormat.format(change.current);
  const percent = change.ratio === null ? null : toPercentText(change.ratio);

  return {
    value: `${from} → ${to}${unit}`,
    percent,
    spoken: `${from} auf ${to}${unit}${percent === null ? "" : `, ${percent}`}`,
  };
}

/* ------------------------------------------------------------------------- */
/* Die Zeitleiste (aufgeklappt)                                                */
/* ------------------------------------------------------------------------- */

/**
 * Spur, Wirkfenster, Heute-Marke. Die Achse reicht mindestens bis zum Ende des
 * Fensters und bis "heute" — sonst klebte die Marke am Rand, sobald die
 * Einnahme laenger laeuft als das Fenster dauert.
 */
function EffectTimeline({ prep }: { prep: TakenSupplement }) {
  const { daysOn, startedOn } = prep.intake;
  const spanEnd = Math.max(prep.effectWindowDays.to, daysOn, 1);
  const windowStart = (prep.effectWindowDays.from / spanEnd) * 100;
  const windowWidth =
    ((prep.effectWindowDays.to - prep.effectWindowDays.from) / spanEnd) * 100;
  const now = Math.min(100, (daysOn / spanEnd) * 100);

  return (
    <div className="min-w-0">
      <div
        aria-hidden="true"
        className="bg-timeline-track relative h-2 w-full overflow-hidden rounded-full"
      >
        <span
          className="bg-timeline-window absolute inset-y-0"
          style={{ left: `${windowStart}%`, width: `${windowWidth}%` }}
        />
        <span
          className="bg-timeline-now absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${now}%` }}
        />
      </div>
      {/* ENTSCHEIDUNG: "Band = Wirkfenster · Punkt = heute" ist WEG. Das war
       * Notation, keine Sprache — und die Zeile darunter sagt dieselben drei
       * Angaben ohnehin in Worten und Zahlen. */}
      <p className="text-muted-foreground text-2xs mt-1.5 tabular-nums">
        Seit {toLongDate(startedOn)} · Tag {numberFormat.format(daysOn)} ·
        Wirkfenster Tag {numberFormat.format(prep.effectWindowDays.from)}–
        {numberFormat.format(prep.effectWindowDays.to)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Die Zeile                                                                   */
/* ------------------------------------------------------------------------- */

export interface SupplementRowProps {
  /** Nur laufende Praeparate — siehe TakenSupplement. */
  prep: Supplement & { intake: SupplementIntake };
  /** Platz in der Auftrittsreihe der Liste. */
  index?: number;
  className?: string;
}

/**
 * Eine Zeile der Praeparate-Tabelle — zwei `tr`, die zweite nur aufgeklappt.
 * Sie gehoert in das `tbody` von SupplementPanel: die Spaltenbreiten kommen
 * aus dessen Kopfzeile, und genau daher liegen alle Zeilen exakt aufeinander.
 */
export function SupplementRow({
  prep,
  index = 0,
  className,
}: SupplementRowProps) {
  const motionPreset = useMotionPreset();
  const detailId = useId();
  const [isOpen, setIsOpen] = useState(false);

  const status = toSupplementStatus(prep);
  const look = STATUS_LOOK[status];
  const Symbol = look.icon;
  const observed = toObservedReading(prep);
  const hint = toActionHint(prep, status);
  const capsule = toSupplementImage(prep.imageKey);

  const target =
    prep.targetMarker === null
      ? "kein direkter Marker"
      : `Ziel: ${prep.targetMarker}`;

  return (
    <>
      <motion.tr
        variants={motionPreset.fadeRise}
        custom={index}
        className={cn("border-border border-t", className)}
      >
        <td className="w-capsule py-3 align-middle">
          {/*
           * Freigestellt und ohne Kachel: die Kapsel liegt direkt auf der
           * Karte, nur ihr eigener Schatten hebt sie ab. Ein Rahmen darum
           * waere eine zweite Kante neben der Zeile und machte aus dem Foto
           * ein Symbol.
           *
           * Die Breite traegt der Rahmen um das Bild und nicht das Bild
           * selbst: das Vorgabe-Stylesheet gibt jedem Bild max-width:100%, und
           * in einer Tabellenzelle waeren diese 100 % die Spaltenbreite, die
           * sich erst aus dem Bild ergeben soll. Aus dem Ringschluss geht das
           * Bild mit Breite null hervor — und die Spalte verschwindet. Ein
           * Element mit fester Breite dazwischen loest ihn auf.
           */}
          <span className="w-capsule block">
            <Image
              src={capsule}
              alt=""
              className="capsule-shadow h-auto w-full"
            />
          </span>
        </td>

        <td className="py-3 pl-4 align-top">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={isOpen ? detailId : undefined}
            onClick={() => setIsOpen((open) => !open)}
            className="focus-visible:outline-ring flex max-w-full items-center gap-1.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="text-foreground text-sm font-medium">
              {prep.name}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "text-faint size-3.5 shrink-0 transition-transform",
                isOpen && "rotate-180",
              )}
            />
            <span className="sr-only">— Wirkfenster und nächster Schritt</span>
          </button>
          <p className="text-muted-foreground text-2xs mt-0.5">
            {prep.dose} · seit {toShortDate(prep.intake.startedOn)} · {target}
          </p>

          {/*
           * SCHMALE KACHEL: die beobachtete Veraenderung zieht in die
           * Namenszeile. Eine vierte Spalte braucht rund 32rem Kachelbreite;
           * darunter draengte sie den Namen in den Umbruch und die Werte an
           * die Kante. Sie traegt hier ihre Beschriftung SELBST — die
           * Spaltenueberschrift steht in dieser Breite nicht mehr da, und ein
           * Wertepaar ohne Wort waere ein Raetsel.
           */}
          <p className="text-foreground text-2xs mt-1 tabular-nums @2xl:hidden">
            <span className="text-muted-foreground">Beobachtet: </span>
            <span aria-hidden="true">
              {observed.value}
              {observed.percent === null ? null : ` · ${observed.percent}`}
            </span>
            <span className="sr-only">{observed.spoken}</span>
          </p>
        </td>

        <td className="hidden py-3 pl-4 text-right align-top @2xl:table-cell">
          <p className="text-foreground text-sm whitespace-nowrap tabular-nums">
            <span aria-hidden="true">{observed.value}</span>
            <span className="sr-only">{observed.spoken}</span>
          </p>
          {/*
           * Die Prozentzeile steht IMMER, auch leer: ohne sie waere die Zeile
           * ohne Prozentwert kuerzer, und die Spalte wanderte von Zeile zu
           * Zeile. Der Wert bleibt grau — das Urteil traegt die Pille daneben,
           * und dieselbe Aussage zweimal einzufaerben macht sie nicht wahrer.
           */}
          <p
            aria-hidden={observed.percent === null}
            className="text-muted-foreground text-2xs tabular-nums"
          >
            {observed.percent ?? "\u00A0"}
          </p>
        </td>

        <td className="py-3 pl-4 text-right align-middle">
          <span
            className={cn(
              "text-3xs inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold tracking-wide whitespace-nowrap uppercase",
              look.pill,
              look.tone,
            )}
          >
            <Symbol aria-hidden="true" className="size-3 shrink-0" />
            {look.label}
          </span>
        </td>
      </motion.tr>

      {/*
       * Die aufgeklappte Flaeche ist eine eigene Zeile: innerhalb einer Zelle
       * wuerde sie deren Spalte dehnen und damit das Raster aller anderen
       * Zeilen verschieben.
       */}
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.tr
            id={detailId}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={motionPreset.layout}
          >
            {/* Die leere erste Zelle ruecht die Flaeche unter den Namen ein —
             * genau um die Bildspalte, ohne dass hier ein Mass steht, das
             * neben dem Token stuende. */}
            <td />
            <td colSpan={3} className="p-0 pl-4">
              <motion.div
                variants={{
                  hidden: { height: 0 },
                  visible: { height: "auto" },
                }}
                transition={motionPreset.layout}
                className="overflow-hidden"
              >
                {/* Dieselbe Schwelle wie die Spalte oben: was in einer Zeile
                 * nicht nebeneinander passt, passt es hier auch nicht. */}
                <div className="grid gap-4 pt-1 pb-4 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] @2xl:gap-6">
                  <EffectTimeline prep={prep} />
                  <p className="text-muted-foreground max-w-measure text-xs">
                    <span className="text-foreground font-medium">
                      Nächster Schritt:
                    </span>{" "}
                    {hint}
                  </p>
                </div>
              </motion.div>
            </td>
          </motion.tr>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* Die Kachel                                                                  */
/* ------------------------------------------------------------------------- */

export interface SupplementPanelProps {
  /**
   * Alle bekannten Praeparate. Die Kachel nimmt sich daraus die LAUFENDEN —
   * der Aufrufer muss nicht wissen, dass sie ueber andere nichts sagen kann.
   */
  supplements: readonly Supplement[];
  /**
   * Platz in der Auftrittsreihe der SEITE. Er verzoegert nur den Auftritt der
   * Kachel; die Zeilen darin behalten ihre eigene Reihe.
   */
  index?: number;
  className?: string;
}

/*
 * DIE ERKLAERUNG DER KACHEL — hinter dem ⓘ am Kopf, einmal im Code.
 *
 * ENTSCHEIDUNG: Sie ersetzt die frueheren zwei Erklaerungen (die Fusszeile
 * ueber den Unterschied zwischen "keine Reaktion" und "zu früh" und die
 * Notationszeile an der Zeitleiste). Der Unterschied selbst bleibt sichtbar —
 * er steht in den beiden Statuswoertern und im aufgeklappten Wirkfenster, also
 * dort, wo er auftritt, statt als Absatz unter der Liste.
 *
 * Die Zeile, die die STAENDE ZAEHLT, bleibt dagegen sichtbar auf der Kachel:
 * sie ist ein Befund aus den Daten und keine Selbstbeschreibung. Hinter das ⓘ
 * gehoert nur, was die Kachel ueber sich selbst sagt.
 */
const SUPPLEMENT_EXPLAINER =
  "Für jedes Präparat siehst du, ob sich sein Zielmarker seit Einnahmebeginn bewegt hat. Vor dem erwarteten Wirkfenster steht „zu früh“ und nie „keine Reaktion“ — eine fehlende Wirkung vor dem Fenster ist keine.";

/**
 * Der Kopf der Kachel: Titel links, ⓘ rechts. Als eigenes Bauteil, damit der
 * Leerzustand denselben Kopf traegt wie die gefuellte Kachel.
 */
function SupplementHeading({ id }: { id?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 id={id} className="text-foreground panel-title">
        Wirkt, was du nimmst?
      </h2>
      <PanelExplainer
        label="Wie die Wirkung beurteilt wird"
        className="-mt-1 -mr-1"
      >
        {SUPPLEMENT_EXPLAINER}
      </PanelExplainer>
    </div>
  );
}

/** Leerzustand: ohne Einnahme gibt es nichts zu beurteilen. */
function EmptySupplements({ className }: { className?: string }) {
  return (
    <section
      aria-label="Präparate"
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <SupplementHeading />
      <p className="text-foreground mt-4 text-sm font-medium">
        Noch keine Präparate
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Sobald du ein Präparat einnimmst und es einen Zielmarker gibt, steht
        hier, ob sich am Marker etwas zeigt — und was der nächste Schritt ist.
      </p>
    </section>
  );
}

/**
 * Zaehlt die Staende. Genannt wird nur, was vorkommt: eine Zaehlung, die
 * "0 ohne Reaktion" mitschreibt, macht aus einem guten Befund eine Liste von
 * Nullen.
 */
function toStatusCounts(
  supplements: readonly TakenSupplement[],
): ReadonlyMap<SupplementStatus, number> {
  const counts = new Map<SupplementStatus, number>();
  for (const prep of supplements) {
    const status = toSupplementStatus(prep);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return counts;
}

interface StatusTallyProps {
  counts: ReadonlyMap<SupplementStatus, number>;
  total: number;
}

/**
 * DIE ZAEHLUNG ALS BALKEN — vorher ein Satz, jetzt ein Bild.
 *
 * "1 wirkt · 1 wirkt schwach · 1 ohne Reaktion · 1 zu früh · 1 nicht
 * beurteilbar" war eine Aufzaehlung in drei Farben ueber zwei Zeilen, und sie
 * stand als lautestes Element der Seite ueber einer Liste, die dasselbe noch
 * einmal Zeile fuer Zeile sagt. Als Balken beantwortet dieselbe Zaehlung die
 * Frage, die man an eine Zusammenfassung stellt — "wie steht es insgesamt" —
 * ohne sie zu buchstabieren: die BREITE ist der Anteil.
 *
 * Sie wird dadurch nicht farbiger, sondern leiser: die Toene sitzen jetzt in
 * einer 24px hohen Leiste statt in fettem Fliesstext, und Rot ist damit Akzent
 * und keine Schrift.
 *
 * JEDES SEGMENT TRAEGT ZEICHEN UND ZAHL. Farbe allein waere hier besonders
 * heikel, weil ein Balken keine Beschriftung mitbringt — ✓ 1 sagt dasselbe wie
 * die Pille in der Zeile darunter, und in Graustufen bleibt die Leiste damit
 * lesbar. Die Luecken zwischen den Segmenten sind aus demselben Grund da: zwei
 * gleich helle Toene nebeneinander waeren sonst ein Feld.
 *
 * Genannt wird nur, was vorkommt (siehe toStatusCounts) — ein Segment der
 * Breite 0 waere eine Fuge ohne Bedeutung.
 */
function StatusTally({ counts, total }: StatusTallyProps) {
  const shown = SUMMARY_ORDER.filter((status) => counts.has(status));

  return (
    <div
      /*
       * EIN Bild mit EINER Beschreibung. Fuenf einzeln vorgelesene Segmente
       * waeren fuenf Zahlen ohne Bezug; der Satz nennt sie in derselben
       * Reihenfolge, in der die Leiste sie zeigt.
       */
      role="img"
      aria-label={`${total} Präparate: ${shown
        .map((status) => STATUS_LOOK[status].count(counts.get(status) ?? 0))
        .join(", ")}.`}
      className="mt-3 flex h-6 w-full gap-0.5 overflow-hidden rounded-full"
    >
      {shown.map((status) => {
        const look = STATUS_LOOK[status];
        const Symbol = look.icon;
        const count = counts.get(status) ?? 0;

        return (
          <span
            key={status}
            /* Der Anteil ist eine gerechnete Groesse und keine gestaltete —
             * deshalb steht er als flex-grow und nicht als Klasse. */
            style={{ flexGrow: count }}
            className={cn(
              "text-2xs flex min-w-0 items-center justify-center gap-1 font-medium tabular-nums",
              look.pill,
              look.tone,
            )}
          >
            <Symbol aria-hidden="true" className="size-3 shrink-0" />
            {count}
          </span>
        );
      })}
    </div>
  );
}

export function SupplementPanel({
  supplements,
  index = 0,
  className,
}: SupplementPanelProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();

  /* Ein empfohlenes, aber nicht eingenommenes Praeparat gehoert auf
   * /empfehlungen und nicht in eine Wirkungsbilanz. */
  const taken = supplements.filter(isTaken);

  if (taken.length === 0) {
    return <EmptySupplements className={className} />;
  }

  const counts = toStatusCounts(taken);

  return (
    <motion.section
      variants={motionPreset.fadeRise}
      custom={index}
      initial="hidden"
      animate="visible"
      aria-labelledby={titleId}
      /* Die Kachel ist ihr eigener Container: ob die Zeile vier Spalten traegt
       * oder drei, entscheidet IHRE Breite. Im Bento steht sie in fuenf von
       * zwoelf Spalten — auf einem breiten Schirm ist sie also SCHMAL. */
      className={cn("surface-card @container rounded-2xl p-6", className)}
    >
      <SupplementHeading id={titleId} />

      {/* Eine Leiste, die die Liste zusammenfasst, bevor man sie liest. Sie ist
       * ein BEFUND aus den Daten (gezaehlte Staende), keine zweite Erklaerung
       * der Kachel. */}
      <StatusTally counts={counts} total={taken.length} />

      {/*
       * Eine echte Tabelle, kein Raster aus divs: die vier Spalten teilen sich
       * ueber alle Zeilen dieselbe Breite, und die Kopfzeile ist damit auch
       * fuer Screenreader die Ueberschrift der Spalte und nicht nur ein Wort
       * darueber.
       */}
      <table className="mt-5 w-full text-left">
        <caption className="sr-only">
          Je Präparat der Zielmarker, die am Zielmarker beobachtete Veränderung
          seit Einnahmebeginn und ob daraus schon eine Wirkung folgt.
        </caption>
        <thead>
          <tr className="text-muted-foreground text-3xs tracking-wide uppercase">
            <th scope="col" className="w-capsule pb-2 font-semibold">
              <span className="sr-only">Kapsel</span>
            </th>
            {/* w-full: diese Spalte nimmt den Platz, den die anderen drei
             * nicht brauchen — sonst verteilt die Tabelle ihn auf alle vier. */}
            <th scope="col" className="w-full pb-2 pl-4 font-semibold">
              Präparat
            </th>
            {/* Faellt mit ihrer Spalte weg: in der schmalen Kachel steht die
             * Angabe beschriftet in der Namenszeile. */}
            <th
              scope="col"
              className="hidden pb-2 pl-4 text-right font-semibold whitespace-nowrap @2xl:table-cell"
            >
              Beobachtet
            </th>
            <th
              scope="col"
              className="pb-2 pl-4 text-right font-semibold whitespace-nowrap"
            >
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {taken.map((prep, position) => (
            <SupplementRow
              key={prep.id}
              prep={prep}
              /* Die Kachel ist Element 0; die Zeilen folgen ihr. Stagger ist
               * auf sechs Elemente gedeckelt — fuenf Zeilen plus Kachel
               * passen. */
              index={position + 1}
            />
          ))}
        </tbody>
      </table>
    </motion.section>
  );
}
