"use client";

import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  toChangeOrder,
  toChangeReading,
  type ChangeDirection,
  type ChangeReading,
  type ChangeVerdict,
} from "../rules";
import type { MarkerChange } from "../sample-data";

/*
 * DIE AUFSCHLUESSELUNG DER VERAENDERUNGEN — je Marker eine Zeile: wo der Wert
 * beim letzten Test stand (hohler Punkt), wo er jetzt steht (voller Punkt) und
 * wie weit das auseinanderliegt.
 *
 * RICHTUNG IST NICHT QUALITAET. Das Dashboard nennt die Veraenderung als Fakt
 * und faerbt sie deshalb nie; hier wird sie bewertet — aber ausschliesslich
 * ueber die am Marker hinterlegte guenstige Richtung (rules.ts). Derselbe Pfeil
 * nach oben ist bei Ferritin die Erholung und bei LDL das Problem, und wo keine
 * Richtung hinterlegt ist, bleibt die Zeile grau und ohne Wort dazu. Das
 * betrifft hier vier von dreizehn Markern: die Enthaltung ist der Normalfall,
 * nicht die Ausnahme.
 *
 * ENTSCHEIDUNG: Die Achse zeigt die PROZENTUALE VERAENDERUNG, nicht den Wert.
 * Dreizehn Marker in dreizehn Einheiten haben keine gemeinsame Werteskala —
 * ng/ml und mg/dl nebeneinander zu stellen waere ein Bild ohne Bedeutung. Die
 * Veraenderung dagegen ist einheitenlos und damit ueber alle Zeilen hinweg
 * vergleichbar: die Null in der Mitte ist der letzte Test, und weil die Liste
 * nach dem Betrag der Bewegung sortiert ist, werden die Strecken nach unten hin
 * kuerzer. Der Preis ist, dass der hohle Punkt immer auf der Null sitzt — was
 * er auch soll, denn er IST der Bezugspunkt.
 *
 * KEINE BEWEGUNG IST EIN BEFUND. Unter der Anzeigeschwelle zeichnet die Zeile
 * keine winzige Strecke, die wie Rauschen aussieht, sondern legt den vollen
 * Punkt in den hohlen und schreibt "unveraendert" daneben.
 */

const numberFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

/*
 * Dieselbe Formatierung wie die Delta-Pille auf dem Dashboard — dieselbe
 * Bewegung darf nicht an zwei Stellen verschieden gerundet dastehen.
 */
const percentFormat = new Intl.NumberFormat("de-DE", {
  style: "percent",
  signDisplay: "exceptZero",
  maximumFractionDigits: 0,
});

/** Dimensionslose Marker bekommen keine Einheit angehaengt. */
function withUnit(value: string, unit: string): string {
  return unit ? `${value} ${unit}` : value;
}

/** "2026-05-26" wird zu "26.05.2026" — ohne Date-Objekt, also ohne Zeitzone. */
function toLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}

/* ------------------------------------------------------------------------- */
/* Achse                                                                       */
/* ------------------------------------------------------------------------- */

/** Schrittweite, auf die das Achsenende aufgerundet wird. */
const AXIS_STEP = 0.1;
/** Rasterlinien in Prozent der Spurbreite. 50 ist die Null, also der letzte Test. */
const AXIS_LINES = [25, 50, 75] as const;
/** Beschriftete Stellen der Achse. Die aeusseren beiden sind die Enden der Spur. */
const AXIS_LABELS = [0, 25, 50, 75, 100] as const;

/**
 * Das Achsenende: die groesste Bewegung, aufgerundet auf glatte zehn Prozent.
 * Damit nutzt die staerkste Zeile die volle Haelfte aus und alle anderen stehen
 * im Verhaeltnis dazu — eine feste Skala waere entweder zu eng oder leer.
 */
function toAxisMax(changes: readonly MarkerChange[]): number {
  const largest = Math.max(
    AXIS_STEP,
    ...changes.map((change) => Math.abs(toChangeReading(change).ratio)),
  );
  return Math.ceil(largest / AXIS_STEP) * AXIS_STEP;
}

/** Position auf der Spur, in Prozent. 50 ist die Null. */
function toPosition(ratio: number, axisMax: number): number {
  const clamped = Math.max(-axisMax, Math.min(axisMax, ratio));
  return 50 + (clamped / axisMax) * 50;
}

function AxisHeader({ axisMax }: { axisMax: number }) {
  return (
    <div className="relative h-4">
      {AXIS_LABELS.map((position) => (
        <span
          key={position}
          style={{ left: `${position}%` }}
          className={cn(
            "text-faint text-3xs absolute top-0 tabular-nums",
            position === 0
              ? ""
              : position === 100
                ? "-translate-x-full"
                : "-translate-x-1/2",
          )}
        >
          {percentFormat.format(((position - 50) / 50) * axisMax)}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Zeile                                                                       */
/* ------------------------------------------------------------------------- */

interface VerdictLook {
  /** Wort neben Pfeil und Prozentwert. Die Farbe steht nie allein. */
  label: string;
  /** Textfarbe fuer Wort und Symbol. */
  tone: string;
  /** Farbe von Strecke und vollem Punkt. */
  mark: string;
}

/*
 * Statusfarbe NUR bei bekannter Richtung, und immer zusammen mit Pfeil und
 * Wort. "Ungünstig" ist Bernstein und nicht Rot: die Zeile sagt, dass sich
 * etwas in die falsche Richtung bewegt hat — nicht, dass ein Wert ausserhalb
 * seines Referenzbereichs liegt. Das ist ein anderes Urteil und steht am
 * Marker selbst.
 */
const VERDICT_LOOK: Readonly<Record<ChangeVerdict, VerdictLook>> = {
  guenstig: {
    label: "günstige Richtung",
    tone: "text-success",
    mark: "bg-success",
  },
  unguenstig: {
    label: "ungünstige Richtung",
    tone: "text-warning",
    mark: "bg-warning",
  },
  unbewertet: {
    label: "nicht bewertet",
    tone: "text-muted-foreground",
    mark: "bg-map-mark",
  },
  unveraendert: {
    label: "unverändert",
    tone: "text-muted-foreground",
    mark: "bg-map-mark",
  },
};

/** Der Pfeil zeigt die BEWEGUNG. Ob sie gut ist, sagt erst das Wort daneben. */
const DIRECTION_ICON: Readonly<Record<ChangeDirection, LucideIcon>> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};

interface ChangeTrackProps {
  reading: ChangeReading;
  axisMax: number;
  index: number;
  /** Farbklasse fuer Strecke und vollen Punkt. */
  mark: string;
}

function ChangeTrack({ reading, axisMax, index, mark }: ChangeTrackProps) {
  const motionPreset = useMotionPreset();
  const zero = toPosition(0, axisMax);
  const target = toPosition(reading.ratio, axisMax);
  const isFlat = reading.verdict === "unveraendert";

  /*
   * Punkt und Strecke laufen auf DERSELBEN Feder los, mit derselben
   * Verzoegerung: die Strecke waechst hinter dem Punkt her, statt neben ihm.
   */
  const transition = {
    ...motionPreset.layout,
    delay: motionPreset.stagger(index),
  };

  return (
    <div aria-hidden="true" className="relative h-7">
      {/*
       * Das Bezugssystem steht ab dem ersten Frame: die Spur, das Raster und
       * die Nulllinie. Eine Achse, die sich erst aufbaut, laesst den Punkt im
       * Nichts landen.
       */}
      <span className="bg-map-grid absolute inset-x-0 top-1/2 h-px -translate-y-1/2" />
      {AXIS_LINES.map((position) => (
        <span
          key={position}
          style={{ left: `${position}%` }}
          className={cn(
            "absolute inset-y-1 w-px -translate-x-1/2",
            position === zero ? "bg-map-divider" : "bg-map-grid",
          )}
        />
      ))}

      {isFlat ? null : (
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={transition}
          style={{
            left: `${Math.min(zero, target)}%`,
            width: `${Math.abs(target - zero)}%`,
            transformOrigin: reading.direction === "up" ? "left" : "right",
          }}
          className={cn(
            "absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full",
            mark,
          )}
        />
      )}

      {/*
       * Der hohle Punkt sitzt auf der Nulllinie und gehoert damit zum
       * Bezugssystem — er steht still. Bewegen darf sich nur, was sich auch in
       * der Messung bewegt hat. Bei einer Zeile ohne Bewegung wird er groesser
       * und legt sich als Ring um den vollen Punkt: der aktuelle Wert liegt
       * genau auf dem alten.
       */}
      <span
        style={{ left: `${zero}%` }}
        className={cn(
          "border-map-mark bg-card absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border",
          isFlat ? "size-4" : "size-2.5",
        )}
      />

      <motion.span
        initial={{ left: `${zero}%` }}
        animate={{ left: `${target}%` }}
        transition={transition}
        className={cn(
          "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
          mark,
        )}
      />
    </div>
  );
}

/*
 * Kopfzeile und Zeilen teilen sich EIN Raster — sonst stehen die Achsenzahlen
 * neben der Spur, die sie beschriften.
 */
const ROW_GRID =
  "grid gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(9rem,1.1fr)_minmax(0,2.6fr)_minmax(8.5rem,auto)] sm:items-center";

export interface ChangeRowProps {
  change: MarkerChange;
  /** Achsenende aller Zeilen. Es kommt von aussen, damit alle dieselbe Skala haben. */
  axisMax: number;
  /** Platz in der Auftrittsreihe der Liste. */
  index?: number;
  className?: string;
}

export function ChangeRow({
  change,
  axisMax,
  index = 0,
  className,
}: ChangeRowProps) {
  const reading = toChangeReading(change);
  const look = VERDICT_LOOK[reading.verdict];
  const Symbol = DIRECTION_ICON[reading.direction];

  return (
    <li
      className={cn(
        "border-border border-t py-3 first:border-t-0 first:pt-0",
        ROW_GRID,
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-foreground text-sm font-medium">{change.name}</p>
        <p className="text-muted-foreground text-2xs mt-0.5">
          {change.groupName}
        </p>
      </div>

      <div className="min-w-0">
        {/* Der Vorwert steht nur als Punkt im Bild — vorgelesen wird er hier. */}
        <span className="sr-only">
          Vorher {withUnit(numberFormat.format(change.previous), change.unit)}{" "}
          am {toLongDate(change.previousDate)}.
        </span>
        <ChangeTrack
          reading={reading}
          axisMax={axisMax}
          index={index}
          mark={look.mark}
        />
      </div>

      <div className="min-w-0 sm:justify-self-end sm:text-right">
        <p className="text-foreground text-sm tabular-nums">
          {withUnit(numberFormat.format(change.current), change.unit)}
        </p>
        <p
          className={cn(
            "text-2xs mt-0.5 inline-flex items-center gap-1",
            look.tone,
          )}
        >
          <Symbol aria-hidden="true" className="size-3 shrink-0" />
          {/*
           * Bei "unveraendert" steht KEIN Prozentwert daneben: gerundet waere
           * er null, und eine Null neben dem Wort waere die Bewegung, die es
           * gerade nicht gab.
           */}
          {reading.verdict === "unveraendert" ? null : (
            <span className="tabular-nums">
              {percentFormat.format(reading.ratio)}
            </span>
          )}
          {look.label}
        </p>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------------- */
/* Liste                                                                       */
/* ------------------------------------------------------------------------- */

export interface ChangePanelProps {
  changes: readonly MarkerChange[];
  className?: string;
}

/** Leerzustand: Veraenderungen gibt es erst ab dem zweiten Test. */
function EmptyChanges({ className }: { className?: string }) {
  return (
    <section
      aria-label="Veränderungen"
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Veränderungen
      </p>
      <p className="text-foreground mt-3 text-sm font-medium">
        Noch keine Veränderungen
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Veränderungen entstehen erst mit dem zweiten Test: Ein einzelner Wert
        ist ein Messwert, kein Verlauf.
      </p>
    </section>
  );
}

export function ChangePanel({ changes, className }: ChangePanelProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();

  if (changes.length === 0) {
    return <EmptyChanges className={className} />;
  }

  const ordered = toChangeOrder(changes);
  const axisMax = toAxisMax(ordered);

  return (
    <motion.section
      variants={motionPreset.fadeRise}
      initial="hidden"
      animate="visible"
      aria-labelledby={titleId}
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <h2
        id={titleId}
        className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase"
      >
        Veränderungen
      </h2>
      <p className="text-muted-foreground max-w-measure text-2xs mt-1">
        Jeder Marker mit zwei Messungen, die größte Bewegung zuerst. Ring =
        letzter Test · Punkt = jetzt. Ob eine Richtung günstig ist, steht am
        Marker — wo sie nicht hinterlegt ist, bleibt die Bewegung ohne Urteil.
      </p>

      <div className="mt-6">
        {/* Spaltenkoepfe fuers Auge: vorgelesen traegt jede Zeile ihre
         * Bezeichnungen selbst. */}
        <div aria-hidden="true" className={cn("pb-2", ROW_GRID)}>
          <p className="text-muted-foreground text-2xs">Marker</p>
          <AxisHeader axisMax={axisMax} />
          <p className="text-muted-foreground text-2xs sm:text-right">
            Aktueller Wert
          </p>
        </div>

        <ul>
          {ordered.map((change, position) => (
            <ChangeRow
              key={change.id}
              change={change}
              axisMax={axisMax}
              /* Die Karte ist Element 0; die Zeilen folgen ihr. Der Stagger ist
               * auf sechs Elemente gedeckelt — die Liste steht in 240 ms. */
              index={position + 1}
            />
          ))}
        </ul>
      </div>

      <p className="text-muted-foreground max-w-measure text-2xs mt-4">
        Marker ohne zweite Messung stehen nicht in der Liste: ohne Vergleich
        gibt es keine Veränderung. Berechnete Indizes ebenso wenig — sie bewegen
        sich mit den Werten, aus denen sie entstehen.
      </p>
    </motion.section>
  );
}
