"use client";

import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import type { Supplement } from "@/contracts";
import { useMotionPreset } from "@/lib/motion";

import { toDropReason, type PendingAction } from "../rules";

/*
 * ============================================================================
 * EINE POSITION, DIE WEGFAELLT — mit dem Grund, nicht mit einer Zahl.
 * ============================================================================
 * Vorher war es dieselbe Zeile wie alle anderen, nur durchgestrichen: zwei
 * Messwerte und ein Preis, aus denen man selbst schliessen musste, warum das
 * Praeparat herausfaellt. Jetzt steht der Grund als Satz da (toDropReason), und
 * die Zahl daneben ist die einzige, die hier zaehlt — der Betrag, der wegfaellt.
 *
 * ⚠️ KEINE WIRKAUSSAGE, auch nicht in der Verneinung. "kein messbarer Effekt"
 * spricht ueber die Wirkung des Praeparats, nur mit einem "kein" davor. Was
 * dasteht, ist die MESSUNG; warum sie zum Absetzen fuehrt, sagt die
 * Ueberschrift des Abschnitts.
 *
 * ⚠️ AUCH HIER KEIN BETRAG. Der Minusbetrag stand daneben ("−19,90 €") und war
 * das einzige Geld in der linken Spalte — damit las sich der Abgang als
 * Ersparnis und nicht als Ergebnis der Messung. Was eine Aenderung am Abo
 * kostet, rechnet der Warenkorb, und zwar vollstaendig statt Zeile fuer Zeile.
 *
 * DIE HANDLUNG IST HIER EIN KNOPF UND KEIN SCHALTER. In den anderen Abschnitten
 * fragt die Zeile "liegt das im naechsten Abo" — hier ist die Antwort schon
 * gegeben, und der Knopf widerspricht ihr. "Trotzdem behalten" sagt das; ein
 * Schalter, den man von "aus" auf "an" schiebt, verschwiege, dass man damit
 * einer Empfehlung widerspricht. Er ist sekundaer gesetzt: der vorgeschlagene
 * Weg ist der Abgang.
 */

export interface DroppedRowProps {
  prep: Supplement;
  pending: PendingAction | undefined;
  onToggle: (prep: Supplement) => void;
  index?: number;
}

export function DroppedRow({
  prep,
  pending,
  onToggle,
  index = 0,
}: DroppedRowProps) {
  const motionPreset = useMotionPreset();
  /* Vorgemerkt zum Entfernen ist der Normalfall dieses Abschnitts — wer
   * widerspricht, hat keine Vormerkung mehr. */
  const faelltWeg = pending === "entfernen";

  return (
    <motion.li
      variants={motionPreset.fadeRise}
      custom={index}
      initial="hidden"
      animate="visible"
      className="border-border flex flex-col gap-2 border-t px-5 py-3 first:border-t-0 @2xl:flex-row @2xl:items-center @2xl:gap-4"
    >
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{prep.name}</p>
        <p className="text-muted-foreground max-w-measure mt-0.5 text-xs tabular-nums">
          {toDropReason(prep)}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          aria-label={`Trotzdem behalten: ${prep.name}`}
          onClick={() => onToggle(prep)}
        >
          {faelltWeg ? "Trotzdem behalten" : "Doch absetzen"}
        </Button>
      </div>
    </motion.li>
  );
}
