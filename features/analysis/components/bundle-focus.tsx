"use client";

import { motion } from "motion/react";
import { useId, useState } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { toEvidenceLevel, toFocusEntries, type FocusEntry } from "../rules";
import { SCORE_MAX, categoryNameById, type Bundle } from "../sample-data";
import { BundleMap } from "./bundle-map";
import { PriorityList } from "./priority-list";

/*
 * ============================================================================
 * DIE BEFUND-LANDKARTE — EINE Kachel, zwei Haelften.
 * ============================================================================
 * ⚠️ UI-WORT UND FACHBEGRIFF SIND ENTKOPPELT. Im Code, im Vertrag und in den
 * Daten heisst die Einheit weiter `Bundle` — sichtbar heisst sie "Befund"
 * (Mehrzahl "Befunde"), und "Bündel" kommt in keinem sichtbaren Text und in
 * keinem aria-label mehr vor. Dieselbe Trennung gilt fuer `confidence`, das
 * sichtbar "Datenlage" heisst. Die Felder umzubenennen waere eine
 * Vertragsaenderung fuer eine Textentscheidung.
 *
 * Links die Flaeche: alle Befunde nach Datenlage und Score. Rechts die
 * Ansatzpunkte: dieselben Befunde, die in der Flaeche eine Nummer tragen. Sie
 * stehen nicht zufaellig nebeneinander — sie teilen die Auswahl (rules.ts), die
 * Nummern und die Hervorhebung, und deshalb liegt der aktive Zustand HIER und
 * in keiner der beiden Haelften. Zwei Kacheln mit je eigenem Zustand koennten
 * verschiedene Befunde hervorheben, und der Leser haette zwei Rangfolgen statt
 * einer.
 *
 * Unter der Kachel, aber AUSSERHALB von ihr, steht dieselbe Datenlage als
 * Tabelle. Sie gehoert nicht in die Kachel: ein Umschalter dort machte aus der
 * Landkarte eine Ansichtsoption und lud dazu ein, aus einer Flaeche, die
 * bewusst keine Zahlen zeigt, doch wieder Zahlen abzulesen. Draussen ist sie
 * das, was sie sein soll — der vollstaendige, lineare Weg zu denselben Werten.
 */

export interface BundleFocusProps {
  bundles: readonly Bundle[];
  /**
   * Platz in der Auftrittsreihe der SEITE. Er verzoegert nur den Auftritt der
   * Kachel; der Scan im Feld laeuft weiter nach seiner eigenen Traverse.
   */
  index?: number;
  className?: string;
}

/*
 * DIE EINE ERKLAERZEILE DER KACHEL — und sie steht genau einmal im Code,
 * damit der Leerzustand nicht anders erklaert als die gefuellte Kachel.
 *
 * EIN Satz sagt beides: wie die Flaeche zu lesen ist (oben, rechts) und dass
 * sie relativ vergleicht. Der Nachsatz ersetzt den frueheren Extra-Absatz
 * "Die Score-Richtung ist ein Ausschnitt …" — die Ehrlichkeit bleibt, der
 * zweite Absatz geht. Zwei Erklaerungen an einer Kachel heissen, dass die
 * erste nicht gereicht hat.
 */
const MAP_EXPLAINER =
  "Oben stehen die starken Befunde, rechts die mit guter Datenlage — verglichen werden sie nur untereinander.";

/** Leerzustand: Befunde entstehen erst mit der ersten Auswertung. */
function EmptyBundleFocus({ className }: { className?: string }) {
  return (
    <section
      aria-label="Befund-Landkarte"
      className={cn("surface-card rounded-2xl p-6", className)}
    >
      <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Befund-Landkarte
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-xs">
        {MAP_EXPLAINER}
      </p>
      <p className="text-foreground mt-4 text-sm font-medium">
        Noch keine Befunde
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Sobald dein erster Bluttest ausgewertet ist, liegt hier jeder Befund
        nach Score und Datenlage — und daneben die Ansatzpunkte.
      </p>
    </section>
  );
}

export interface BundleTableProps {
  bundles: readonly Bundle[];
  focus: readonly FocusEntry[];
  className?: string;
}

/**
 * Dieselben Daten in Zeilen. Sie ist die vollstaendige Fassung der Flaeche und
 * steht deshalb unter der Kachel und nicht in ihr — zugeklappt, aber immer
 * erreichbar.
 */
export function BundleTable({ bundles, focus, className }: BundleTableProps) {
  const rankById = new Map(focus.map((entry) => [entry.bundle.id, entry.rank]));

  return (
    <details className={cn("max-w-measure", className)}>
      <summary className="text-muted-foreground focus-visible:outline-ring text-2xs w-fit cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
        Alle Befunde als Tabelle
      </summary>
      <table className="mt-3 w-full text-left">
        <caption className="text-muted-foreground text-2xs sr-only">
          Alle Befunde mit Kategorie, Score, Datenlage und Rang unter den
          Ansatzpunkten — dieselben Werte wie in der Landkarte.
        </caption>
        <thead>
          <tr className="border-border border-b">
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 font-medium"
            >
              Befund
            </th>
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 text-right font-medium"
            >
              Score
            </th>
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 text-right font-medium"
            >
              Datenlage
            </th>
            <th
              scope="col"
              className="text-muted-foreground text-2xs pb-2 text-right font-medium"
            >
              Ansatzpunkt
            </th>
          </tr>
        </thead>
        <tbody>
          {bundles.map((bundle) => (
            <tr key={bundle.id} className="border-border/60 border-b">
              <th
                scope="row"
                className="text-foreground py-2 pr-3 text-xs font-normal"
              >
                {bundle.name}
                <span className="text-muted-foreground text-2xs block">
                  {categoryNameById(bundle.categoryId)}
                </span>
              </th>
              <td className="text-foreground py-2 text-right text-xs tabular-nums">
                {bundle.score} von {SCORE_MAX}
              </td>
              {/* Auch hier das Wort und nicht die Stufe: die Tabelle ist die
               * vollstaendige Fassung derselben Aussage, nicht eine zweite
               * Skala daneben. */}
              <td className="text-foreground py-2 text-right text-xs">
                {toEvidenceLevel(bundle.confidence)}
              </td>
              <td className="text-foreground py-2 text-right text-xs tabular-nums">
                {rankById.get(bundle.id) ?? "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function BundleFocus({
  bundles,
  index = 0,
  className,
}: BundleFocusProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();
  /*
   * EIN aktives Buendel fuer beide Haelften. Feld und Liste melden dasselbe
   * hoch, egal ob es aus Maus oder Fokus kommt — daraus entsteht die
   * Verbindung in beide Richtungen, ohne dass eine Haelfte die andere kennt.
   */
  const [activeId, setActiveId] = useState<string | null>(null);

  if (bundles.length === 0) {
    return <EmptyBundleFocus className={className} />;
  }

  const focus = toFocusEntries(bundles);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <motion.section
        variants={motionPreset.fadeRise}
        custom={index}
        initial="hidden"
        animate="visible"
        aria-labelledby={titleId}
        /* Die Kachel ist ihr eigener Container: ob Feld und Rangfolge
         * nebeneinander stehen, entscheidet IHRE Breite. */
        className="surface-card @container rounded-2xl p-6"
      >
        {/* Die Flaeche bekommt die groessere Spalte. Sie braucht nicht nur
         * Platz fuer die Punkte, sondern auch fuer die drei Namen NEBEN den
         * Punkten: wird sie schmaler, weichen die Beschriftungen nach links
         * aus, und das Feld liest sich von rechts nach links. Unter 56rem
         * Kachelbreite bliebe dem Feld weniger als 30rem — dann steht die
         * Rangfolge lieber UNTER der Flaeche, und die Flaeche bekommt die
         * ganze Kachel. */}
        <div className="grid gap-8 @4xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="flex flex-col">
            <h2
              id={titleId}
              className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase"
            >
              Befund-Landkarte
            </h2>
            {/*
             * Die eine Erklaerzeile. Sie sagt NICHTS ueber das Kreuz in der
             * Flaeche: es ist ein Anker fuers Auge, und jeder Satz darueber
             * machte eine Schwelle daraus.
             */}
            <p className="text-muted-foreground max-w-measure mt-1 text-xs">
              {MAP_EXPLAINER}
            </p>
            <BundleMap
              bundles={bundles}
              focus={focus}
              activeId={activeId}
              onActivate={setActiveId}
              className="mt-6"
            />
          </div>

          {/* Keine Linie zwischen den Haelften auf schmalen Spalten: dort
           * stehen sie untereinander, und ein Strich quer waere eine Trennung,
           * wo eine Fortsetzung gemeint ist. */}
          <div className="@4xl:border-border @4xl:border-l @4xl:pl-8">
            <PriorityList
              entries={focus}
              activeId={activeId}
              onActivate={setActiveId}
            />
          </div>
        </div>
      </motion.section>

      <BundleTable bundles={bundles} focus={focus} />
    </div>
  );
}
