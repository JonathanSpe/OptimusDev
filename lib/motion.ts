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
  /** Pfad von links nach rechts zeichnen. */
  drawPath: Variants;
  /** Uebergang fuer Layout- und Positionswechsel. */
  layout: Transition;
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
      visible: {
        pathLength: 1,
        opacity: 1,
        transition: {
          pathLength: { duration: duration(DURATION.layout), ease: EASE_OUT },
          opacity: { duration: duration(DURATION.hover) },
        },
      },
    },
    layout: reduced ? { duration: 0 } : SPRING,
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
