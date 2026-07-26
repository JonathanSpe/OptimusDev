"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  toMarkerReading,
  type FocusEntry,
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
 * DIE ANSATZPUNKTE — dieselben drei Buendel, die im Feld daneben eine Nummer
 * tragen, hier als Rangfolge ausgeschrieben.
 *
 * Landkarte und Liste sind EIN Baustein. Die Karte zeigt, WO die drei liegen,
 * die Liste sagt, WAS an ihnen dran ist; die Nummer verbindet beides, und die
 * Auswahl kommt aus derselben Regel in rules.ts. Zwei getrennte Kacheln mit
 * zwei Reihenfolgen waeren zwei Behauptungen ueber dieselbe Sache.
 *
 * Rang 1 traegt die ganze Anatomie: Satz, Belege, offene Frage. Rang 2 und 3
 * bleiben Zeilen. Das ist kein Platzsparen — drei ausformulierte Befunde
 * nebeneinander sind keine Rangfolge mehr, sondern eine Liste, und dann faengt
 * der Leser wieder von vorne an zu suchen.
 *
 * Zwei Versprechen stehen im Code, nicht nur im Text:
 *
 *   1. KEINE AUSSAGE OHNE BELEG. Unter dem Satz stehen die Marker, auf denen er
 *      steht. Gibt es keine, erscheint der Satz gar nicht erst — auch nicht
 *      gekuerzt in einer Rangzeile. Die offene Frage erscheint nur, wenn ihr
 *      Marker in der Liste steht. Ein Rat ohne Befund ist eine Meinung, und
 *      Meinungen haben in einer Auswertung nichts verloren.
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

function MarkerRow({ marker }: { marker: FindingMarker }) {
  const reading = toMarkerReading(marker);
  const look = VERDICT_LOOK[reading.verdict];
  const Symbol = look.icon;
  const isThin = reading.verdict === "duenneDaten";

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-foreground text-sm font-medium">
          {marker.name}
        </span>
        {/*
         * Der Wert eines duennen Markers steht leiser da: er ist gemessen, aber
         * er traegt nichts. Weglassen wuerde die Liste glatter machen und die
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
    </li>
  );
}

/** Nummer und Name — zugleich der Griff, der die Marke im Feld hervorhebt. */
function EntryHeading({
  bundle,
  rank,
  isLead,
  onActivate,
}: {
  bundle: Bundle;
  rank: number;
  isLead: boolean;
  onActivate: (id: string | null) => void;
}) {
  return (
    <button
      type="button"
      onFocus={() => onActivate(bundle.id)}
      onBlur={() => onActivate(null)}
      onClick={() => onActivate(bundle.id)}
      aria-label={`Ansatzpunkt ${rank}: ${bundle.name} in der Landkarte hervorheben`}
      className="focus-visible:outline-ring flex items-center gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {/* Dieselbe Nummer, dieselbe Scheibe wie am Punkt im Feld. */}
      <span
        aria-hidden="true"
        className="bg-foreground text-background text-2xs grid size-5 shrink-0 place-items-center rounded-full font-semibold tabular-nums"
      >
        {rank}
      </span>
      <span
        className={cn(
          "text-foreground tracking-tight",
          isLead ? "text-base font-semibold" : "text-sm font-medium",
        )}
      >
        {bundle.name}
      </span>
    </button>
  );
}

function EntryMeta({ bundle }: { bundle: Bundle }) {
  return (
    <p className="text-muted-foreground text-2xs mt-1 ml-7">
      {categoryNameById(bundle.categoryId)} ·{" "}
      <span className="tabular-nums">
        Score {bundle.score} von {SCORE_MAX} · Konfidenz {bundle.confidence} von{" "}
        {CONFIDENCE_MAX}
      </span>
    </p>
  );
}

interface PriorityEntryProps extends FocusEntry {
  finding: PriorityFinding | undefined;
  index: number;
  isActive: boolean;
  onActivate: (id: string | null) => void;
}

function PriorityEntry({
  bundle,
  rank,
  finding,
  index,
  isActive,
  onActivate,
}: PriorityEntryProps) {
  const motionPreset = useMotionPreset();
  const isLead = rank === 1;

  /* Ohne Beleg kein Satz — das gilt auch fuer Rang 1. */
  const claim = finding && finding.markers.length > 0 ? finding : undefined;

  /*
   * Dieselbe Regel fuer die offene Frage: sie haengt an einem Marker, und wenn
   * der nicht in der Liste steht, ist sie ein Rat ohne Befund.
   */
  const openQuestion =
    claim &&
    claim.markers.some((marker) => marker.name === claim.openQuestion.marker)
      ? claim.openQuestion
      : null;

  return (
    <motion.li
      variants={motionPreset.fadeRise}
      custom={index}
      onMouseEnter={() => onActivate(bundle.id)}
      onMouseLeave={() => onActivate(null)}
    >
      {/*
       * Der hervorgehobene Zustand ist ein Ring, kein Farbwechsel — dieselbe
       * Sprache wie am Punkt im Feld, der einen Ring in Flaechenfarbe bekommt.
       *
       * ENTSCHEIDUNG: Im Feld treten die uebrigen Marken zurueck, in der Liste
       * NICHT. Text, den man gerade liest, darf nicht ausgrauen, nur weil die
       * Maus einen Punkt daneben streift.
       */}
      <div
        className={cn(
          "-mx-3 rounded-xl px-3 py-2 ring-1 transition-colors",
          isActive ? "ring-border" : "ring-transparent",
        )}
      >
        <EntryHeading
          bundle={bundle}
          rank={rank}
          isLead={isLead}
          onActivate={onActivate}
        />
        <EntryMeta bundle={bundle} />

        {isLead ? (
          <div className="mt-3 ml-7">
            {claim ? (
              <>
                <p className="text-foreground max-w-measure text-sm">
                  <span className="font-medium">
                    {toClaimStrength(bundle.confidence)}:
                  </span>{" "}
                  {claim.claim}
                </p>

                <h5 className="text-muted-foreground text-2xs mt-4 font-semibold tracking-wide uppercase">
                  Worauf das beruht
                </h5>
                <ul className="mt-2 space-y-3">
                  {claim.markers.map((marker) => (
                    <MarkerRow key={marker.name} marker={marker} />
                  ))}
                </ul>

                {openQuestion ? (
                  <div className="border-border mt-4 border-t pt-3">
                    <p className="text-muted-foreground max-w-measure text-xs">
                      <span className="text-foreground font-medium">
                        Was die Konfidenz hebt:
                      </span>{" "}
                      {openQuestion.marker}. {openQuestion.question}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground max-w-measure text-sm">
                Zu diesem Bündel liegt noch kein ausformulierter Befund vor.
                Solange die Marker dazu fehlen, steht hier kein Satz — nur die
                Einordnung.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </motion.li>
  );
}

export interface PriorityListProps {
  /** Die Ansatzpunkte in ihrer Rangfolge — dieselbe Liste wie im Feld. */
  entries: readonly FocusEntry[];
  /** Ausformulierte Befunde nach Buendel-Id. */
  findings: Readonly<Record<string, PriorityFinding>>;
  activeId: string | null;
  onActivate: (id: string | null) => void;
  className?: string;
}

export function PriorityList({
  entries,
  findings,
  activeId,
  onActivate,
  className,
}: PriorityListProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <h3 className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Ansatzpunkte
      </h3>
      {/* Die Auswahlregel steht einmal in rules.ts und einmal hier in Worten —
       * eine Rangfolge, die ihre eigene Regel nicht nennt, ist eine
       * Behauptung. */}
      <p className="text-muted-foreground max-w-measure text-2xs mt-1">
        Von den belastbar gemessenen Bündeln — rechts der Linie — die
        niedrigsten, höchstens drei. Qualifizieren weniger, stehen hier weniger.
      </p>

      {entries.length === 0 ? (
        <p className="text-muted-foreground max-w-measure mt-4 text-sm">
          Rechts der Linie steht heute kein Bündel. Solange die Datenlage das
          nicht hergibt, empfiehlt dir diese Analyse nichts — ein Ansatzpunkt
          ohne belastbare Messung wäre geraten.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {entries.map((entry, position) => (
            <PriorityEntry
              key={entry.bundle.id}
              bundle={entry.bundle}
              rank={entry.rank}
              finding={findings[entry.bundle.id]}
              /* Die Kachel ist Element 0 der Reihe, die Raenge folgen ihr. */
              index={position + 1}
              isActive={activeId === entry.bundle.id}
              onActivate={onActivate}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
