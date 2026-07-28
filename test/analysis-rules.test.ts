import { describe, expect, test } from "vitest";

import {
  CONFIDENCE_SOLID,
  SCORE_BAND_CRITICAL,
  SCORE_BAND_GOOD,
  isVerdictShown,
  toScoreVerdict,
} from "@/features/analysis/rules";

/*
 * Die Schwelle auf dem Score ist die einzige Stelle, an der die Analyse aus
 * einer Zahl ein Urteil macht — und sie faerbt vier Flaechen gleichzeitig ein.
 * Ein Fehler an ihrem Rand nennt einen Wert "gut", der es nicht ist, ohne dass
 * irgendetwas bricht. Deshalb steht besonders das VERHALTEN AN DEN GRENZEN
 * unter Test: dass 75 noch gut ist und 60 nicht mehr kritisch, ist eine
 * Entscheidung und kein Zufall der Vergleichsoperatoren.
 *
 * ⚠️ Die Zahlen selbst sind Platzhalter (siehe rules.ts). Getestet wird die
 * Mechanik der Staffel, nicht ihre klinische Richtigkeit — die kann ein Test
 * nicht herstellen.
 */

describe("toScoreVerdict", () => {
  test("genau auf der oberen Grenze ist noch gut", () => {
    expect(toScoreVerdict(SCORE_BAND_GOOD)).toBe("gut");
  });

  test("einen Punkt darunter ist grenzwertig", () => {
    expect(toScoreVerdict(SCORE_BAND_GOOD - 1)).toBe("grenzwertig");
  });

  test("genau auf der unteren Grenze ist noch grenzwertig", () => {
    expect(toScoreVerdict(SCORE_BAND_CRITICAL)).toBe("grenzwertig");
  });

  test("einen Punkt darunter ist kritisch", () => {
    expect(toScoreVerdict(SCORE_BAND_CRITICAL - 1)).toBe("kritisch");
  });

  test("die Enden der Skala tragen die aeusseren Stufen", () => {
    expect(toScoreVerdict(0)).toBe("kritisch");
    expect(toScoreVerdict(100)).toBe("gut");
  });

  /* Die Baender muessen sich in dieser Reihenfolge folgen — waere die untere
   * Grenze groesser als die obere, gaebe es "grenzwertig" nicht mehr, und die
   * Funktion faerbte lautlos nur noch zweifarbig. */
  test("die Baender liegen in der richtigen Reihenfolge", () => {
    expect(SCORE_BAND_CRITICAL).toBeLessThan(SCORE_BAND_GOOD);
  });
});

describe("isVerdictShown", () => {
  test("gute Datenlage darf ein Urteil tragen", () => {
    expect(isVerdictShown(CONFIDENCE_SOLID)).toBe(true);
  });

  test("mittlere Datenlage darf ein Urteil tragen", () => {
    expect(isVerdictShown(CONFIDENCE_SOLID - 1)).toBe(true);
  });

  /* Die eigentliche Zusage dieser Datei: ein unsicher gemessener Wert bekommt
   * KEINE Farbe, egal wie gut oder schlecht er dasteht. */
  test("geringe Datenlage traegt nie ein Urteil", () => {
    expect(isVerdictShown(CONFIDENCE_SOLID - 2)).toBe(false);
    expect(isVerdictShown(0)).toBe(false);
  });
});
