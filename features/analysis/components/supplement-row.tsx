"use client";

import {
  Check,
  CircleHelp,
  Clock,
  Minus,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  isAdjustedActionHint,
  toSupplementStatus,
  type SupplementStatus,
} from "../rules";
import type { Supplement } from "../sample-data";

/*
 * DIE PRAEPARATE-ZEILE — eine Einnahme, ihr Zielmarker, das Wirkfenster und
 * was sich gemessen hat.
 *
 * Der Status kommt aus toSupplementStatus in rules.ts, nicht aus den
 * Rohdaten. Zwei Folgen davon stehen hier sichtbar:
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

const deltaFormat = new Intl.NumberFormat("de-DE", {
  signDisplay: "exceptZero",
  maximumFractionDigits: 2,
});

const numberFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

/** "2026-01-27" → "27.01.2026", ohne Date-Objekt, also ohne Zeitzone. */
function toLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}

interface StatusLook {
  label: string;
  tone: string;
  icon: LucideIcon;
}

const STATUS_LOOK: Readonly<Record<SupplementStatus, StatusLook>> = {
  wirkt: { label: "wirkt", tone: "text-success", icon: Check },
  wirktSchwach: {
    label: "wirkt schwach",
    tone: "text-warning",
    icon: Minus,
  },
  keineReaktion: {
    label: "keine Reaktion",
    tone: "text-warning",
    icon: X,
  },
  zuFrueh: {
    label: "zu früh",
    tone: "text-muted-foreground",
    icon: Clock,
  },
  nichtBeurteilbar: {
    label: "nicht beurteilbar",
    tone: "text-muted-foreground",
    icon: CircleHelp,
  },
};

/*
 * Fallback, falls ein actionHint bei "keine Reaktion" dieselbe Einnahme
 * fortschriebe. Der Text ist bewusst allgemein — der konkrete Rat gehoert an
 * das Praeparat; hier steht nur die Regel, die den Fehler abfaengt.
 */
const ADJUSTED_FALLBACK =
  "Dosis, Präparat oder Einnahme anpassen — dieselbe Dosis wiederholen hilft hier nicht.";

function toObservedLabel(prep: Supplement, status: SupplementStatus): string {
  if (status === "zuFrueh" || status === "nichtBeurteilbar") {
    return "—";
  }
  if (prep.observedDelta === null) {
    return "—";
  }
  if (prep.observedDelta === 0) {
    return "unverändert";
  }
  const unit = prep.targetUnit ? ` ${prep.targetUnit}` : "";
  return `${deltaFormat.format(prep.observedDelta)}${unit}`;
}

function toActionHint(prep: Supplement, status: SupplementStatus): string {
  if (!isAdjustedActionHint(status, prep.actionHint)) {
    return ADJUSTED_FALLBACK;
  }
  return prep.actionHint;
}

/**
 * Die Zeitleiste: Spur, Wirkfenster, Heute-Marke. Die Achse reicht mindestens
 * bis zum Ende des Fensters und bis "heute" — sonst klebte die Marke am Rand,
 * sobald die Einnahme laenger laeuft als das Fenster dauert.
 */
function EffectTimeline({ prep }: { prep: Supplement }) {
  const spanEnd = Math.max(prep.effectWindowDays.to, prep.daysOn, 1);
  const windowStart = (prep.effectWindowDays.from / spanEnd) * 100;
  const windowWidth =
    ((prep.effectWindowDays.to - prep.effectWindowDays.from) / spanEnd) * 100;
  const now = Math.min(100, (prep.daysOn / spanEnd) * 100);

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
      <p className="text-muted-foreground text-2xs mt-1 tabular-nums">
        Tag {numberFormat.format(prep.daysOn)} · Fenster Tag{" "}
        {numberFormat.format(prep.effectWindowDays.from)}–
        {numberFormat.format(prep.effectWindowDays.to)}
      </p>
    </div>
  );
}

export interface SupplementRowProps {
  prep: Supplement;
  /** Platz in der Auftrittsreihe der Liste. */
  index?: number;
  className?: string;
}

export function SupplementRow({
  prep,
  index = 0,
  className,
}: SupplementRowProps) {
  const motionPreset = useMotionPreset();
  const status = toSupplementStatus(prep);
  const look = STATUS_LOOK[status];
  const Symbol = look.icon;
  const observed = toObservedLabel(prep, status);
  const hint = toActionHint(prep, status);
  const markerLabel = prep.targetMarker ?? "kein messbarer Marker";

  return (
    <motion.article
      variants={motionPreset.fadeRise}
      custom={index}
      aria-label={[
        prep.name,
        prep.dose,
        `Zielmarker ${markerLabel}`,
        `seit ${toLongDate(prep.startedOn)}`,
        `Tag ${prep.daysOn}`,
        `Beobachtet ${observed}`,
        look.label,
        hint,
      ].join(", ")}
      className={cn(
        "border-border border-t py-4 first:border-t-0 first:pt-0",
        className,
      )}
    >
      {/*
       * ENTSCHEIDUNG: Eine Zeile, die auf schmalen Karten untereinander kippt
       * und ab der Bento-Breite als Raster steht. Die Handlung (hint) liegt
       * immer unter dem Raster — sie ist der Satz zur Zeile, nicht eine
       * sechste Spalte, die man gegen die anderen Spalten abwaegen muesste.
       */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,0.9fr)] sm:items-start sm:gap-4">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-medium">{prep.name}</p>
          <p className="text-muted-foreground text-2xs mt-0.5">{prep.dose}</p>
        </div>

        <div className="min-w-0">
          <p className="text-muted-foreground text-2xs">Zielmarker</p>
          <p
            className={cn(
              "mt-0.5 text-sm",
              prep.targetMarker ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {markerLabel}
          </p>
        </div>

        <EffectTimeline prep={prep} />

        <div className="min-w-0">
          <p className="text-muted-foreground text-2xs">Beobachtet</p>
          <p
            className={cn(
              "mt-0.5 text-sm tabular-nums",
              observed === "—" || observed === "unverändert"
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            {observed}
          </p>
        </div>

        <div className="min-w-0 sm:justify-self-end">
          <p
            className={cn(
              "inline-flex items-center gap-1 text-sm font-medium",
              look.tone,
            )}
          >
            <Symbol aria-hidden="true" className="size-3.5 shrink-0" />
            {look.label}
          </p>
        </div>
      </div>

      <p className="text-muted-foreground max-w-measure mt-3 text-xs">
        <span className="text-foreground font-medium">Nächster Schritt:</span>{" "}
        {hint}
      </p>
    </motion.article>
  );
}

export interface SupplementPanelProps {
  supplements: readonly Supplement[];
  className?: string;
}

function EmptySupplements({ className }: { className?: string }) {
  return (
    <section
      aria-label="Präparate"
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Präparate
      </p>
      <p className="text-foreground mt-3 text-sm font-medium">
        Noch keine Präparate
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Sobald du ein Präparat einnimmst und es einen Zielmarker gibt, steht
        hier, ob sich am Marker etwas zeigt — und was der nächste Schritt ist.
      </p>
    </section>
  );
}

export function SupplementPanel({
  supplements,
  className,
}: SupplementPanelProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();

  if (supplements.length === 0) {
    return <EmptySupplements className={className} />;
  }

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
        Präparate
      </h2>
      <p className="text-muted-foreground max-w-measure text-2xs mt-1">
        Je Präparat der Zielmarker, das erwartete Wirkfenster und was sich
        gemessen hat. Band = Wirkfenster · Punkt = heute. Eine ausgebliebene
        Wirkung nach dem Fenster ist ein eigener Befund — nicht dasselbe wie
        „noch zu früh“.
      </p>

      <div className="mt-5">
        {supplements.map((prep, position) => (
          <SupplementRow
            key={prep.id}
            prep={prep}
            /* Die Karte ist Element 0; die Zeilen folgen ihr. Stagger ist auf
             * sechs Elemente gedeckelt — fuenf Zeilen plus Karte passen. */
            index={position + 1}
          />
        ))}
      </div>
    </motion.section>
  );
}
