"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  toMarkerReading,
  toPriorityBundle,
  type MarkerReading,
  type MarkerVerdict,
} from "../rules";
import {
  CONFIDENCE_MAX,
  SCORE_MAX,
  categoryNameById,
  type Bundle,
  type FindingMarker,
  type PriorityFinding,
} from "../sample-data";

/*
 * DIE PRIORITAETSKARTE — der eine Befund, an dem sich Arbeit lohnt.
 *
 * Die Landkarte zeigt zehn Buendel, diese Karte nennt eines. Beide fragen
 * dasselbe (niedrig UND belastbar gemessen) und holen die Antwort aus derselben
 * Regel in rules.ts; die Karte nimmt davon das erste Buendel.
 *
 * Die Kachel haelt zwei Versprechen, und beide stehen im Code, nicht nur im
 * Text:
 *
 *   1. KEINE AUSSAGE OHNE BELEG. Unter dem Satz stehen die Marker, auf denen er
 *      steht. Gibt es keine, zeigt die Karte den Leerzustand statt des Satzes,
 *      und die offene Frage erscheint nur, wenn ihr Marker in der Liste steht.
 *      Ein Rat ohne Befund ist eine Meinung, und Meinungen haben in einer
 *      Auswertung nichts verloren.
 *
 *   2. DUENNE DATEN BLEIBEN SICHTBAR. Ein Marker mit zu wenigen Messungen wird
 *      nicht weggelassen und nicht bewertet — er steht mit seinem Wert da und
 *      sagt, dass er zu duenn ist. Weglassen waere geschoenter, Bewerten waere
 *      geraten.
 *
 * Die Konfidenz steuert die STAERKE des Satzes, nicht seine Sichtbarkeit: ein
 * unsicherer Befund wird vorsichtiger formuliert, aber er wird gezeigt.
 */

const numberFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

/** "2026-01-27" wird zu "27.01.2026" — ohne Date-Objekt, also ohne Zeitzone. */
function toLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}

/*
 * Wie sicher der Satz auftreten darf. Die Formulierung ist der einzige Ort, an
 * dem die Konfidenz die Sprache aendert — sie entscheidet nie, OB der Befund
 * erscheint. Ein Befund, den man wegen duenner Daten verschweigt, kommt
 * garantiert als Ueberraschung zurueck.
 */
const CLAIM_STRENGTH: Readonly<Record<number, string>> = {
  5: "Gut belegt",
  4: "Weitgehend belegt",
  3: "Erster Hinweis",
  2: "Noch unsicher",
  1: "Kaum belegt",
};

function toClaimStrength(confidence: number): string {
  return CLAIM_STRENGTH[confidence] ?? "Kaum belegt";
}

interface VerdictLook {
  label: string;
  /** Textfarbe fuer Wort UND Symbol. */
  tone: string;
  icon: LucideIcon;
}

/*
 * Statusfarbe nur dort, wo ein Urteil dahinter steht — und nie allein: jede
 * Zeile traegt Wort UND Symbol, die Farbe kommt obendrauf. "Zu duenne
 * Datenlage" ist kein Urteil, deshalb bleibt sie grau; ausserhalb des
 * Referenzbereichs ist das staerkere Urteil als ausserhalb des Optimums und
 * bekommt den staerkeren Ton.
 */
const VERDICT_LOOK: Readonly<Record<MarkerVerdict, VerdictLook>> = {
  duenneDaten: {
    label: "zu dünne Datenlage",
    tone: "text-muted-foreground",
    icon: CircleDashed,
  },
  unterReferenz: {
    label: "unter Referenz",
    tone: "text-critical",
    icon: ArrowDown,
  },
  ueberReferenz: {
    label: "über Referenz",
    tone: "text-critical",
    icon: ArrowUp,
  },
  unterOptimum: {
    label: "unter dem Optimum",
    tone: "text-warning",
    icon: ArrowDown,
  },
  ueberOptimum: {
    label: "über dem Optimum",
    tone: "text-warning",
    icon: ArrowUp,
  },
  imOptimum: { label: "im Optimum", tone: "text-success", icon: Check },
  imReferenzbereich: {
    label: "im Referenzbereich",
    tone: "text-success",
    icon: Check,
  },
};

/**
 * Die Zeile unter dem Wert: woran das Urteil haengt. Bei duennen Daten steht
 * dort die DATENLAGE selbst — Zahl und Alter der Messungen — statt eines
 * Bereichs, den niemand mit diesem Wert vergleichen darf.
 */
function toEvidenceLine(marker: FindingMarker, reading: MarkerReading): string {
  const range = (low: number, high: number) =>
    `${numberFormat.format(low)}–${numberFormat.format(high)}${
      marker.unit ? ` ${marker.unit}` : ""
    }`;

  if (reading.verdict === "duenneDaten") {
    if (reading.latestDate === null) {
      return "noch nie gemessen";
    }
    return reading.measurements === 1
      ? `eine Messung, vom ${toLongDate(reading.latestDate)}`
      : `${numberFormat.format(reading.measurements)} Messungen, zuletzt am ${toLongDate(reading.latestDate)}`;
  }

  if (
    reading.verdict === "unterReferenz" ||
    reading.verdict === "ueberReferenz" ||
    reading.verdict === "imReferenzbereich" ||
    marker.optimalLow === undefined ||
    marker.optimalHigh === undefined
  ) {
    return `Referenz ${range(marker.referenceLow, marker.referenceHigh)}`;
  }

  return `Optimum ${range(marker.optimalLow, marker.optimalHigh)}`;
}

interface MarkerRowProps {
  marker: FindingMarker;
  /** Platz in der Auftrittsreihe der Kachel. */
  index: number;
}

function MarkerRow({ marker, index }: MarkerRowProps) {
  const motionPreset = useMotionPreset();
  const reading = toMarkerReading(marker);
  const look = VERDICT_LOOK[reading.verdict];
  const Symbol = look.icon;
  const isThin = reading.verdict === "duenneDaten";

  return (
    <motion.li variants={motionPreset.fadeRise} custom={index}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-foreground text-sm font-medium">
          {marker.name}
        </span>
        {/*
         * Der Wert eines duennen Markers steht leiser da: er ist gemessen, aber
         * er traegt nichts. Weglassen wuerde die Karte glatter machen und die
         * Luecke verstecken, die sie gerade benennt.
         */}
        <span
          className={cn(
            "text-sm tabular-nums",
            isThin ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {reading.value === null
            ? "–"
            : `${numberFormat.format(reading.value)}${marker.unit ? ` ${marker.unit}` : ""}`}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-2xs">
          {toEvidenceLine(marker, reading)}
        </span>
        <span
          className={cn(
            "text-2xs inline-flex shrink-0 items-center gap-1",
            look.tone,
          )}
        >
          <Symbol aria-hidden="true" className="size-3" />
          {look.label}
        </span>
      </div>
    </motion.li>
  );
}

export interface PriorityCardProps {
  /**
   * ALLE Buendel. Welches davon der Ansatzpunkt ist, entscheidet die Karte
   * nicht selbst, sondern die gemeinsame Regel — sonst koennte sie ein anderes
   * nennen als die Landkarte hervorhebt.
   */
  bundles: readonly Bundle[];
  /** Ausformulierte Befunde nach Buendel-Id. */
  findings: Readonly<Record<string, PriorityFinding>>;
  className?: string;
}

/**
 * Leerzustand: kein belastbar gemessenes Buendel — oder keines mit Befund und
 * Belegen. Beides fuehrt zur selben Aussage, weil beides dasselbe bedeutet: es
 * gibt nichts, was wir hier verantworten koennen.
 */
function EmptyPriority({ className }: { className?: string }) {
  return (
    <section
      aria-label="Ansatzpunkt"
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Ansatzpunkt
      </p>
      <p className="text-foreground mt-3 text-sm font-medium">
        Noch kein Ansatzpunkt
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Sobald ein Bündel niedrig steht und belastbar gemessen ist, steht es
        hier — mit den Markern, auf denen der Befund beruht. Solange die
        Datenlage das nicht hergibt, empfiehlt dir diese Karte nichts.
      </p>
    </section>
  );
}

export function PriorityCard({
  bundles,
  findings,
  className,
}: PriorityCardProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();

  const bundle = toPriorityBundle(bundles);
  const finding = bundle ? findings[bundle.id] : undefined;

  /*
   * Ohne Beleg kein Satz. Das ist keine Vorsichtsmassnahme fuer den Notfall,
   * sondern die Regel selbst: eine Aussage, deren Marker fehlen, darf gar nicht
   * erst erscheinen.
   */
  if (!bundle || !finding || finding.markers.length === 0) {
    return <EmptyPriority className={className} />;
  }

  /*
   * Dieselbe Regel fuer die offene Frage: sie haengt an einem Marker, und wenn
   * der nicht in der Liste steht, ist sie ein Rat ohne Befund.
   */
  const openQuestion = finding.markers.some(
    (marker) => marker.name === finding.openQuestion.marker,
  )
    ? finding.openQuestion
    : null;

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
        Ansatzpunkt
      </h2>
      {/* Warum ausgerechnet dieses Buendel — die Karte begruendet ihre eigene
       * Auswahl, sonst ist sie eine Behauptung ueber eine Behauptung. */}
      <p className="text-muted-foreground max-w-measure text-2xs mt-1">
        Von den belastbar gemessenen Bündeln steht dieses am niedrigsten.
      </p>

      <h3 className="text-foreground mt-4 text-lg font-semibold tracking-tight">
        {bundle.name}
      </h3>
      <p className="text-muted-foreground text-2xs mt-1">
        {categoryNameById(bundle.categoryId)} ·{" "}
        <span className="tabular-nums">
          Score {bundle.score} von {SCORE_MAX} · Konfidenz {bundle.confidence}{" "}
          von {CONFIDENCE_MAX}
        </span>
      </p>

      <p className="text-foreground max-w-measure mt-4 text-sm">
        <span className="font-medium">
          {toClaimStrength(bundle.confidence)}:
        </span>{" "}
        {finding.claim}
      </p>

      <h4 className="text-muted-foreground text-2xs mt-5 font-semibold tracking-wide uppercase">
        Worauf das beruht
      </h4>
      <ul className="mt-2 space-y-3">
        {finding.markers.map((marker, position) => (
          <MarkerRow
            key={marker.name}
            marker={marker}
            /* Die Kachel ist Element 0 der Reihe, die Belege folgen ihr. */
            index={position + 1}
          />
        ))}
      </ul>

      {openQuestion ? (
        <div className="border-border mt-5 border-t pt-3">
          <p className="text-muted-foreground max-w-measure text-xs">
            <span className="text-foreground font-medium">
              Was die Konfidenz hebt:
            </span>{" "}
            {openQuestion.marker}. {openQuestion.question}
          </p>
        </div>
      ) : null}
    </motion.section>
  );
}
