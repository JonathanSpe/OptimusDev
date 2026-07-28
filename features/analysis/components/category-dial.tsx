"use client";

import { motion } from "motion/react";
import { useId } from "react";

import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { type CategoryScore } from "../sample-data";
import { CategoryRing, ConfidenceDots, toRingLabel } from "./category-ring";

/*
 * DIE KATEGORIE-RINGE ALS EIGENE KACHEL — vier Instrumente auf einem Brett.
 *
 * ⚠️ Der SNAPSHOT zeigt diese Kachel nicht mehr: dort stehen die Ringe im
 * Bereichsfeld (CategoryFocus), zusammen mit den Befunden ihrer Kategorie —
 * Ringe und Ansatzpunkte waren zwei Kacheln fuer eine Frage. Die Kachel bleibt
 * als eigenstaendige Fassung des Rasters erhalten (Labor, spaeter die
 * Kategorieansicht), und weil sie das Instrument aus derselben Quelle bezieht
 * (CategoryRing), kann sie nicht anders laufen als das Feld.
 *
 * Ring und Datenlage-Punkte samt ihrer Begruendung stehen in category-ring.tsx.
 * Hier steht nur, wie eine ZELLE daraus wird: Ring oben, Name darunter,
 * Datenlage zuletzt.
 */

export interface CategoryDialProps {
  category: CategoryScore;
  /** Position in der Reihe. Steuert Auftritt und Bogenlauf ueber den Stagger. */
  index?: number;
  onOpenDetails?: (id: string) => void;
  className?: string;
}

export function CategoryDial({
  category,
  index = 0,
  onOpenDetails,
  className,
}: CategoryDialProps) {
  const motionPreset = useMotionPreset();

  return (
    <motion.div
      variants={motionPreset.fadeRise}
      custom={index}
      /*
       * EINE Gruppe je Ring mit einer vollstaendigen Beschriftung. Der Name
       * darunter steht trotzdem als echter Text da — er wird dadurch zweimal
       * vorgelesen, aber ein Ring ohne sichtbaren Namen waere fuer alle anderen
       * unbrauchbar.
       */
      role="group"
      aria-label={toRingLabel(category)}
      className={cn(
        /*
         * Die Zelle ist so breit wie ihre Obergrenze und keinen Pixel breiter:
         * das Raster darum (dial-grid) misst sie mit max-content, statt ihr
         * einen Anteil der Karte zuzuteilen.
         */
        "group w-dial-cell relative flex flex-col items-center transition",
        /*
         * ENTSCHEIDUNG: Die Zelle hebt sich im Hover nur um einen Pixel und
         * bekommt keinen Schatten — sie hat keine eigene Flaeche, ein Schatten
         * haengt also an nichts.
         */
        "motion-safe:hover:-translate-y-px motion-reduce:transition-none",
        className,
      )}
    >
      {/*
       * TODO(L2-Kategorieansicht): Hier wird spaeter die Kategorie geoeffnet
       * (Marker der Kategorie, Herleitung des Scores, Empfehlungen). Bis dahin
       * bleibt die Schaltflaeche ohne Ziel; Fokusring und Anhebung zeigen aber
       * schon, dass der Ring ein Ziel hat.
       */}
      <button
        type="button"
        onClick={() => onOpenDetails?.(category.id)}
        aria-label={`Details zu ${category.name} öffnen`}
        className="focus-visible:outline-ring absolute inset-0 z-10 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
      />

      <CategoryRing
        score={category.score}
        previousScore={category.previousScore}
        index={index}
      />

      {/*
       * ZWEI ZEILEN, RESERVIERT. Bei der Zellbreite (size.dialCell) bricht
       * heute jeder der vier Namen zweizeilig — aber "heute" ist kein Halt:
       * ein kuerzerer Name in einer kuenftigen Kategorie stuende einzeilig da
       * und zoege seine Datenlage-Zeile um eine Zeilenhoehe nach oben, aus der
       * gemeinsamen Linie heraus. min-h-8 sind genau zwei Zeilen (2 x leading-4)
       * und BEWUSST nicht mehr: drei reservierte Zeilen waeren Leerraum unter
       * jedem Namen, und der Block loeste sich vom Ring.
       */}
      <p className="text-foreground mt-2 min-h-8 text-center text-xs leading-4 font-medium text-balance">
        {category.name}
      </p>

      <ConfidenceDots confidence={category.confidence} className="mt-1" />
    </motion.div>
  );
}

export interface CategoryDialPanelProps {
  categories: readonly CategoryScore[];
  /**
   * Platz in der Auftrittsreihe der SEITE. Er verzoegert nur den Auftritt der
   * Karte; die Reihe der Ringe darin bleibt ihre eigene.
   */
  index?: number;
  onOpenDetails?: (id: string) => void;
  className?: string;
}

/** Leerzustand: die Kategorien stehen erst nach der ersten Auswertung fest. */
function EmptyCategories({ className }: { className?: string }) {
  return (
    <section
      className={cn("surface-card rounded-2xl p-6", className)}
      aria-label="Kategorien"
    >
      <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Kategorien
      </p>
      <p className="text-foreground mt-3 text-sm font-medium">
        Noch keine Kategorien
      </p>
      <p className="text-muted-foreground max-w-measure mt-1 text-sm">
        Sobald dein erster Bluttest ausgewertet ist, steht hier je Kategorie ein
        Score samt Datenlage.
      </p>
    </section>
  );
}

export function CategoryDialPanel({
  categories,
  index = 0,
  onOpenDetails,
  className,
}: CategoryDialPanelProps) {
  const motionPreset = useMotionPreset();
  const titleId = useId();

  if (categories.length === 0) {
    return <EmptyCategories className={className} />;
  }

  return (
    <motion.section
      variants={motionPreset.fadeRise}
      custom={index}
      initial="hidden"
      animate="visible"
      aria-labelledby={titleId}
      /* Die Karte ist ihr eigener Container — die Zahl der Ringe je Zeile
       * haengt an IHRER Breite, nicht am Fenster. */
      className={cn("surface-card @container rounded-2xl p-6", className)}
    >
      <h2
        id={titleId}
        className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase"
      >
        Kategorien
      </h2>
      {/* EIN Satz, und zwar in Sprache statt in Notation. "Ring = Score ·
       * Strich = letzter Test" stand hier als Legende: sie las sich wie eine
       * Bauanleitung und musste erst uebersetzt werden, bevor sie half. Mehr
       * als diese eine Zeile bekommt die Kachel nicht — braucht sie mehr,
       * erklaert sich das Instrument nicht selbst genug. */}
      <p className="text-muted-foreground max-w-measure mt-1 text-xs">
        Wie du in deinen vier Bereichen stehst; die kleine Marke im Ring zeigt,
        wo du beim letzten Test warst.
      </p>

      {/*
       * Ein Block statt einer Verteilung: die Stufen (eine Spalte, 2x2, eine
       * Reihe) stecken in dial-grid und messen die KARTE, nicht das Fenster.
       * Der Block steht links buendig unter der Ueberschrift — die Luft, die
       * die Karte uebrig hat, bleibt an ihrem rechten Rand.
       */}
      <div className="dial-grid mt-6">
        {categories.map((category, position) => (
          <CategoryDial
            key={category.id}
            category={category}
            /* Die Karte selbst ist Element 0 der Reihe, die Ringe folgen ihr. */
            index={position + 1}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    </motion.section>
  );
}
