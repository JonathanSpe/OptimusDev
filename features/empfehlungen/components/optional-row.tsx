"use client";

import { motion } from "motion/react";
import { useId } from "react";

import { Switch } from "@/components/ui/switch";
import type { Supplement } from "@/contracts";
import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { toEvidence, type PendingAction } from "../rules";
import { ReasonLink, ReasonPanel } from "./reason-panel";

/*
 * ============================================================================
 * EINE OPTIONALE ERGAENZUNG — dasselbe Raster, weniger Gewicht.
 * ============================================================================
 * DASSELBE RASTER WIE IM KERNSTACK: Praeparat, Begruendung, "Begründung". Vorher
 * hatte diese Zeile eine eigene Ordnung, und zwei Listen mit verschiedenen
 * Spalten uebereinander lasen sich als zwei verschiedene Dinge, die zufaellig
 * untereinander stehen. Was den Unterschied traegt, ist die HOEHE und das
 * fehlende Foto — nicht eine andere Anordnung.
 *
 * ⚠️ "Optional" heisst in diesem Produkt ausdruecklich, dass unsere Auswertung
 * NICHTS dazu sagen kann: es gibt keinen messbaren Zielmarker. In der
 * Begruendungsspalte steht deshalb keine Schiene, sondern die HERKUNFT.
 *
 * ⚠️ SIE SIND OPT-IN. Der Vorschlag traegt sie nicht (siehe
 * toRecommendedChanges): der Schalter steht aus, bis jemand ihn einschaltet.
 *
 * ⚠️ HIER BLEIBT DER SCHALTER SICHTBAR, anders als im Kernstack. Er ist der
 * einzige Weg, eine optionale Ergaenzung ueberhaupt aufzunehmen — hinter einem
 * Modus versteckt, waere ein Opt-in kein Angebot mehr, sondern ein Geheimnis.
 * Im Kernstack ist die Lage umgekehrt: dort stehen die Schalter fast alle an und
 * tragen keine Information.
 *
 * ⚠️ KEINE WIRKAUSSAGE. Die Zeile nennt Namen, Dosis und die Herkunft. Nie ein
 * Thema: "aus deinem Fragebogen: Schlaf" waere die Aussage, das Praeparat wirke
 * auf den Schlaf.
 */

export interface OptionalRowProps {
  prep: Supplement;
  pending: PendingAction | undefined;
  inNextSubscription: boolean;
  onToggle: (prep: Supplement) => void;
  open: boolean;
  onOpenChange: (id: string) => void;
  index?: number;
}

export function OptionalRow({
  prep,
  pending,
  inNextSubscription,
  onToggle,
  open,
  onOpenChange,
  index = 0,
}: OptionalRowProps) {
  const motionPreset = useMotionPreset();
  const evidence = toEvidence(prep);
  const panelId = useId();

  return (
    <motion.li
      variants={motionPreset.fadeRise}
      custom={index}
      initial="hidden"
      animate="visible"
      className="border-border border-t px-5 py-2 first:border-t-0"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => onOpenChange(prep.id)}
          className="group/row focus-visible:outline-ring flex min-w-0 flex-1 flex-col gap-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 @2xl:flex-row @2xl:items-center @2xl:gap-4"
        >
          <span className="flex min-w-0 flex-1 items-baseline gap-x-2">
            {/*
             * KEIN PRODUKTFOTO. Bei halber Zeilenhoehe waere es eine 20px-
             * Pille, und acht davon sehen gleich aus: Platz ohne Nutzen.
             */}
            <span
              className={cn(
                "text-foreground text-sm font-medium underline-offset-4 group-hover/row:underline",
                pending === "entfernen" && "line-through",
              )}
            >
              {prep.name}
            </span>
            <span className="text-muted-foreground text-xs">{prep.dose}</span>
          </span>

          <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
            <span aria-hidden="true">{evidence.text}</span>
            <span className="sr-only">{evidence.spoken}</span>
          </span>

          <ReasonLink open={open} />
        </button>

        <Switch
          checked={inNextSubscription}
          onCheckedChange={() => onToggle(prep)}
          aria-label={`Im Abo: ${prep.name}`}
          className="shrink-0"
        />
      </div>

      {open ? (
        <ReasonPanel prep={prep} interpretation={null} id={panelId} />
      ) : null}
    </motion.li>
  );
}
