"use client";

import { motion } from "motion/react";
import { useId, useState } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { toFocusEntries } from "../rules";
import type { Bundle, PriorityFinding } from "../sample-data";
import { BundleMap } from "./bundle-map";
import { PriorityList } from "./priority-list";

/*
 * DIE BUENDEL-LANDKARTE UND IHRE ANSATZPUNKTE — ein Baustein, zwei Haelften.
 *
 * Links das Feld: alle Buendel nach Score und Konfidenz. Rechts die Rangfolge:
 * dieselben drei Buendel, die im Feld eine Nummer tragen. Sie stehen nicht
 * zufaellig nebeneinander — sie teilen die Auswahl (rules.ts), die Nummern und
 * die Hervorhebung, und deshalb liegt der aktive Zustand HIER und in keiner der
 * beiden Haelften. Zwei Kacheln mit je eigenem Zustand koennten verschiedene
 * Buendel hervorheben, und der Leser haette zwei Rangfolgen statt einer.
 */

export interface BundleFocusProps {
  bundles: readonly Bundle[];
  /** Ausformulierte Befunde nach Buendel-Id. */
  findings: Readonly<Record<string, PriorityFinding>>;
  onOpenBundle?: (id: string) => void;
  className?: string;
}

/** Leerzustand: Buendel entstehen erst mit der ersten Auswertung. */
function EmptyBundleFocus({ className }: { className?: string }) {
  return (
    <section
      aria-label="Bündel-Landkarte"
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Bündel-Landkarte
      </p>
      <p className="text-foreground mt-3 text-sm font-medium">
        Noch keine Bündel
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Sobald dein erster Bluttest ausgewertet ist, steht hier jedes Bündel mit
        seinem Score und seiner Konfidenz — und daneben die Ansatzpunkte.
      </p>
    </section>
  );
}

export function BundleFocus({
  bundles,
  findings,
  onOpenBundle,
  className,
}: BundleFocusProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();
  /*
   * EIN aktives Buendel fuer beide Haelften. Feld und Liste melden dasselbe
   * hoch, egal ob es aus Maus, Fokus oder Tipp kommt — daraus entsteht die
   * Verbindung in beide Richtungen, ohne dass eine Haelfte die andere kennt.
   */
  const [activeId, setActiveId] = useState<string | null>(null);

  if (bundles.length === 0) {
    return <EmptyBundleFocus className={className} />;
  }

  const focus = toFocusEntries(bundles);

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
        Bündel-Landkarte
      </h2>
      {/* Die gepunktete Linie wird HIER erklaert und nicht im Feld: eine
       * Beschriftung mitten in der Karte steht zwischen den Punkten, obwohl sie
       * nichts ueber sie sagt. Erklaert werden muss die Linie trotzdem — eine
       * ungenannte Trennung ist ein Raetsel. */}
      <p className="text-muted-foreground max-w-measure text-2xs mt-1">
        Jedes Bündel nach Score (senkrecht) und Konfidenz (waagerecht). Rechts
        der gepunkteten Linie ist die Datenlage belastbar — eine
        Platzhalter-Stufe zur Datenqualität, keine klinische Grenze.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <BundleMap
          bundles={bundles}
          focus={focus}
          activeId={activeId}
          onActivate={setActiveId}
          onOpenBundle={onOpenBundle}
        />
        {/* Keine Linie zwischen den Haelften auf schmalen Spalten: dort stehen
         * sie untereinander, und ein Strich quer waere eine Trennung, wo eine
         * Fortsetzung gemeint ist. */}
        <div className="lg:border-border lg:border-l lg:pl-8">
          <PriorityList
            entries={focus}
            findings={findings}
            activeId={activeId}
            onActivate={setActiveId}
          />
        </div>
      </div>
    </motion.section>
  );
}
