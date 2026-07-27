"use client";

import { motion } from "motion/react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { toEvidenceLevel, type FocusEntry } from "../rules";
import { SCORE_MAX, categoryNameById, type Bundle } from "../sample-data";

/*
 * ============================================================================
 * DIE ANSATZPUNKTE — dieselben Befunde, die im Feld daneben eine Nummer tragen.
 * ============================================================================
 * ⚠️ Sichtbar heisst ein `Bundle` "Befund" und `confidence` "Datenlage" — siehe
 * den Kopf von bundle-focus.tsx. Die Bezeichner hier bleiben englisch.
 *
 * Landkarte und Liste sind EIN Baustein. Das Feld zeigt, WO die drei liegen,
 * die Liste sagt, WELCHE es sind; die Nummer verbindet beides, und die Auswahl
 * kommt aus derselben Regel in rules.ts. Zwei getrennte Kacheln mit zwei
 * Reihenfolgen waeren zwei Behauptungen ueber dieselbe Sache.
 *
 * DAS HIER IST DER ERSTE BLICK, NICHT DIE BEGRUENDUNG. Eine Zeile traegt vier
 * Angaben — Name, Kategorie, Score, Datenlage — und keine fuenfte. Kein
 * ausformulierter Befund, keine Marker, kein Aufklappen: was ein Buendel
 * ausmacht, steht in der Buendelansicht, und die oeffnet man bewusst. Drei
 * ausformulierte Befunde nebeneinander sind keine Rangfolge mehr, sondern eine
 * Liste, und dann faengt der Leser wieder von vorne an zu suchen.
 */

interface PriorityRowProps extends FocusEntry {
  index: number;
  isActive: boolean;
  onActivate: (id: string | null) => void;
}

function toRowLabel(bundle: Bundle, rank: number): string {
  return `Ansatzpunkt ${rank}: ${bundle.name}, ${categoryNameById(
    bundle.categoryId,
  )}, Score ${bundle.score} von ${SCORE_MAX}, Datenlage ${toEvidenceLevel(
    bundle.confidence,
  )}. Hebt den Befund in der Landkarte hervor.`;
}

function PriorityRow({
  bundle,
  rank,
  index,
  isActive,
  onActivate,
}: PriorityRowProps) {
  const motionPreset = useMotionPreset();

  return (
    <motion.li variants={motionPreset.fadeRise} custom={index}>
      {/*
       * Die Zeile ist eine Schaltflaeche, obwohl sie heute nur hervorhebt.
       * Der Grund ist die Tastatur: ohne Schaltflaeche gaebe es keinen Fokus,
       * und ohne Fokus keine Hervorhebung fuer alle, die nicht mit der Maus
       * arbeiten. Ein fokussierbares div waere derselbe Knopf ohne Semantik.
       *
       * TODO(L3-Buendelansicht): oeffnet spaeter das Buendel.
       */}
      <button
        type="button"
        aria-label={toRowLabel(bundle, rank)}
        onMouseEnter={() => onActivate(bundle.id)}
        onMouseLeave={() => onActivate(null)}
        onFocus={() => onActivate(bundle.id)}
        onBlur={() => onActivate(null)}
        onClick={() => onActivate(bundle.id)}
        className={cn(
          "focus-visible:outline-ring -mx-3 flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          /* Derselbe Ring wie am Punkt im Feld: die Hervorhebung ist eine
           * Kante, kein Farbwechsel — Text, den man liest, darf nicht
           * umspringen, nur weil die Maus einen Punkt daneben streift. */
          isActive ? "ring-border bg-muted" : "ring-transparent",
        )}
      >
        {/* Dieselbe Nummer, dieselbe Scheibe wie am Punkt im Feld. */}
        <span
          aria-hidden="true"
          className="bg-brand text-on-brand text-2xs mt-0.5 grid size-5 shrink-0 place-items-center rounded-full font-semibold tabular-nums"
        >
          {rank}
        </span>
        <span aria-hidden="true" className="min-w-0">
          <span className="text-foreground block text-sm font-semibold tracking-tight">
            {bundle.name}
          </span>
          <span className="text-muted-foreground text-2xs mt-0.5 block">
            {categoryNameById(bundle.categoryId)} ·{" "}
            <span className="tabular-nums">Score {bundle.score}</span> ·
            Datenlage {toEvidenceLevel(bundle.confidence)}
          </span>
        </span>
      </button>
    </motion.li>
  );
}

export interface PriorityListProps {
  /** Die Ansatzpunkte in ihrer Rangfolge — dieselbe Liste wie im Feld. */
  entries: readonly FocusEntry[];
  activeId: string | null;
  onActivate: (id: string | null) => void;
  className?: string;
}

export function PriorityList({
  entries,
  activeId,
  onActivate,
  className,
}: PriorityListProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <h3 className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Ansatzpunkte
      </h3>

      {entries.length === 0 ? (
        /* Leerzustand mit Grund. "Keine Ansatzpunkte" allein liest sich wie
         * "alles gut" — gemeint ist aber "wir wissen zu wenig". */
        <p className="text-muted-foreground max-w-measure mt-4 text-sm">
          Bei keinem Befund ist die Datenlage heute gut genug. Solange das so
          ist, empfiehlt dir diese Analyse nichts — ein Ansatzpunkt ohne
          belastbare Messung wäre geraten.
        </p>
      ) : (
        <ol className="mt-4 space-y-1">
          {entries.map((entry, position) => (
            <PriorityRow
              key={entry.bundle.id}
              bundle={entry.bundle}
              rank={entry.rank}
              /* Die Kachel ist Element 0 der Reihe, die Raenge folgen ihr. */
              index={position + 1}
              isActive={activeId === entry.bundle.id}
              onActivate={onActivate}
            />
          ))}
        </ol>
      )}

      {/*
       * ENTSCHEIDUNG: Die Fusszeile "Die vollständige Begründung … erscheint
       * erst beim Öffnen eines Bündels" ist WEG. Die Kachel erklaert sich in
       * genau einer Zeile, und die steht oben unter ihrer Ueberschrift; dies
       * hier war die dritte Erklaerung an derselben Kachel. Sie versprach
       * ausserdem eine Ansicht, die es noch nicht gibt (TODO(L3) an der Zeile)
       * — ein Hinweis auf ein Ziel, das nicht aufgeht, ist keine Hilfe.
       */}
    </div>
  );
}
