"use client";

import {
  createGeneratorEasing,
  generateLinearEasing,
  spring,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { useMemo } from "react";

/*
 * ============================================================================
 * DIE BEWEGUNGS-SCHICHT — eine Datei, alle Werte.
 * ============================================================================
 * Komponenten schreiben KEINE Dauern, Federn oder Verzoegerungen hin. Sie holen
 * sich hier eine fertige Vorgabe. Der Grund ist derselbe wie bei den Farben:
 * drei Kacheln, die um 180, 200 und 240 ms einblenden, sehen nicht wie ein
 * Produkt aus, sondern wie drei Komponenten.
 *
 * DIE REGELN (auch in AGENTS.md):
 *   - Auftritte laufen EINMAL. Kein erneutes Einblenden beim Scrollen, keine
 *     Endlosschleife, keine Deko, die sich dauernd bewegt.
 *   - Zahlen animieren ihren WERT, nicht ihre Deckkraft. Eine Zahl, die
 *     einblendet, ist ein Ladezustand; eine Zahl, die hochzaehlt, ist ein
 *     Ergebnis.
 *   - Bei prefers-reduced-motion fallen ALLE Dauern auf 0. Das Ergebnis ist
 *     sofort da und vollstaendig — kein Inhalt haengt an einer Animation.
 *
 * Die Dauern in CSS (hover, Fokus) kommen weiterhin aus dem Token
 * --transition-fast; es traegt denselben Wert wie DURATION.hover. Alles, was
 * JavaScript animiert, holt seine Zahlen hier.
 */

/** Sekunden — motion rechnet in Sekunden, nicht in Millisekunden. */
export const DURATION = {
  /** Hover, Fokus, Farbwechsel. Deckt sich mit dem Token --transition-fast. */
  hover: 0.15,
  /** Ein- und Ausblenden von Inhalt. */
  fade: 0.22,
  /** Groessen, Positionen, Pfade — alles, was Weg zuruecklegt. */
  layout: 0.32,
} as const;

/**
 * Auftritte: schnell los, weich aus. Bewegung, die hereinkommt, soll nicht
 * bremsen wollen — sie kommt an.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * Der Scan laeuft LINEAR, als einzige Bewegung im Produkt.
 *
 * ENTSCHEIDUNG: Ein Scan legt Inhalt frei, waehrend er darueber laeuft — die
 * Zeit, zu der eine Marke auftaucht, ist die Zeit, zu der das Band bei ihr
 * ankommt. Beide Kurven muessen deshalb dieselbe sein, und bei EASE_OUT waere
 * das eine Umkehrfunktion im Bauteil statt einer Zahl hier. Ausserdem
 * auslaufender Scan luegt ueber seine eigene Position. Die Marken selbst treten
 * danach ganz normal mit EASE_OUT auf.
 */
export const EASE_SCAN = "linear" as const;

/**
 * EINE Feder fuer Layout und Zahlen. Leicht ueberschwingend, damit ein Wert
 * lebendig einrastet; das Ueberschwingen bleibt unter einem Prozent, sonst
 * wirkt eine Messzahl unseriös.
 */
export const SPRING = {
  type: "spring",
  stiffness: 220,
  damping: 30,
  mass: 1,
} as const satisfies Transition;

/** Versatz je Element in Sekunden. */
const STAGGER_STEP = 0.04;
/**
 * Ab dem siebten Element wartet niemand mehr freiwillig: 6 × 40 ms sind 240 ms,
 * und laenger darf eine Liste nicht brauchen, um vollstaendig dazustehen.
 */
const STAGGER_MAX_ITEMS = 6;

/*
 * Dieselbe Feder als WAAPI-Easing: @number-flow/react animiert ueber die
 * Web Animations API und nimmt nur Zeichenketten. Die Kurve wird deshalb aus
 * derselben Federdefinition abgetastet — eine Physik, zwei Ausgabeformen.
 */
const springEasing = createGeneratorEasing(SPRING, 100, spring);
const SPRING_CSS_EASING = generateLinearEasing(
  springEasing.ease,
  springEasing.duration * 1000,
);

/** Zeitvorgabe fuer @number-flow/react (Web Animations API, Millisekunden). */
export interface NumberTiming {
  duration: number;
  easing: string;
}

export interface MotionPreset {
  /** true, wenn das System reduzierte Bewegung verlangt. */
  reduced: boolean;
  /** Auftritt: von unten einblenden. Laeuft einmal. */
  fadeRise: Variants;
  /** Pfad von links nach rechts zeichnen. Nimmt wie fadeRise einen Reihenplatz. */
  drawPath: Variants;
  /**
   * Die Traverse eines Scan-Bandes ueber ein Feld, von links nach rechts. Sie
   * laeuft EINMAL; die Strecke gehoert der Komponente, die Zeit dieser Datei.
   */
  scan: Transition;
  /**
   * Auftritt eines Elements, das der Scan im Vorbeilaufen freilegt. `custom`
   * ist seine LAGE auf der Traverse (0 = linker Rand, 1 = rechter Rand) und
   * NICHT ein Reihenplatz — deshalb gilt hier auch kein Stagger-Deckel: der
   * Deckel begrenzt eine Liste, hier begrenzt die Traverse sich selbst.
   */
  scanIn: Variants;
  /** Uebergang fuer Layout- und Positionswechsel. */
  layout: Transition;
  /**
   * Zustandswechsel durch Hover, Fokus oder Auswahl — dieselbe Zeit, die die
   * CSS-Utilities ueber --transition-fast verwenden. Sie steht hier, damit auch
   * ein von JavaScript animierter Hover-Zustand keine eigene Zahl erfindet.
   */
  hover: Transition;
  /** Verzoegerung des n-ten Elements einer Reihe, gedeckelt. */
  stagger: (index: number) => number;
  /** Timing fuer hochzaehlende Zahlen. */
  number: NumberTiming;
}

function buildPreset(reduced: boolean): MotionPreset {
  /*
   * Bei reduzierter Bewegung bleibt die STRUKTUR der Varianten erhalten und nur
   * die Zeit faellt weg. So braucht keine Komponente einen zweiten Zweig — sie
   * rendert dieselben Varianten, sie sind nur sofort fertig.
   */
  const duration = (seconds: number): number => (reduced ? 0 : seconds);

  return {
    reduced,
    fadeRise: {
      hidden: { opacity: 0, y: reduced ? 0 : 12 },
      visible: (index: number = 0) => ({
        opacity: 1,
        y: 0,
        transition: {
          duration: duration(DURATION.fade),
          ease: EASE_OUT,
          delay: reduced ? 0 : staggerDelay(index),
        },
      }),
    },
    drawPath: {
      hidden: { pathLength: 0, opacity: 0 },
      /*
       * Derselbe Reihenplatz wie bei fadeRise: mehrere Linien in einem Feld
       * sollen nacheinander loslaufen, und die Verzoegerung dafuer gehoert
       * hierher und nicht in die Komponente. Ohne Angabe bleibt es beim
       * bisherigen Verhalten — Platz 0, kein Versatz.
       */
      visible: (index: number = 0) => ({
        pathLength: 1,
        opacity: 1,
        transition: {
          pathLength: {
            duration: duration(DURATION.layout),
            ease: EASE_OUT,
            delay: reduced ? 0 : staggerDelay(index),
          },
          opacity: {
            duration: duration(DURATION.hover),
            delay: reduced ? 0 : staggerDelay(index),
          },
        },
      }),
    },
    scan: { duration: duration(DURATION.layout), ease: EASE_SCAN },
    scanIn: {
      /*
       * Verborgen heisst hier KLEIN, nicht verschoben: eine Marke, die von
       * unten einfliegt, waere kurz an der falschen Stelle, und eine Position
       * im Feld ist die ganze Aussage dieser Marke.
       */
      hidden: { opacity: 0, scale: reduced ? 1 : 0.4 },
      visible: (fraction: number = 0) => ({
        opacity: 1,
        scale: 1,
        transition: {
          duration: duration(DURATION.fade),
          ease: EASE_OUT,
          delay: reduced ? 0 : scanDelay(fraction),
        },
      }),
    },
    layout: reduced ? { duration: 0 } : SPRING,
    hover: { duration: duration(DURATION.hover), ease: EASE_OUT },
    stagger: (index: number) => (reduced ? 0 : staggerDelay(index)),
    number: {
      duration: reduced ? 0 : springEasing.duration * 1000,
      easing: reduced ? "linear" : SPRING_CSS_EASING,
    },
  };
}

function staggerDelay(index: number): number {
  return Math.min(Math.max(index, 0), STAGGER_MAX_ITEMS - 1) * STAGGER_STEP;
}

/** Wann das Scan-Band an der Stelle `fraction` der Traverse ankommt. */
function scanDelay(fraction: number): number {
  return Math.min(Math.max(fraction, 0), 1) * DURATION.layout;
}

const STILL = buildPreset(true);
const MOVING = buildPreset(false);

/**
 * Die Bewegungsvorgabe dieser Sitzung. Sie beruecksichtigt
 * prefers-reduced-motion: dann sind alle Dauern 0 und nichts verschiebt sich.
 */
export function useMotionPreset(): MotionPreset {
  const reduced = useReducedMotion();
  return useMemo(() => (reduced ? STILL : MOVING), [reduced]);
}
