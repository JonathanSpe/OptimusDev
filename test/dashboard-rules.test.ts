import { describe, expect, test } from "vitest";

import type { Biomarker } from "@/contracts";
import { toChangeReading, toMarkerStanding } from "@/features/dashboard/rules";

/*
 * Die Deutung eines Markers ist die einzige Stelle, an der das Dashboard ein
 * Urteil faellt — und ein Fehler darin faerbt einen Gesundheitswert falsch ein,
 * ohne dass irgendetwas bricht. Deshalb steht sie unter Test.
 */

/** Referenz 10–30, Optimal 15–25, sofern nichts anderes gesagt wird. */
function marker(values: readonly number[], overrides: Partial<Biomarker> = {}) {
  return {
    id: "test-marker",
    name: "Testmarker",
    group: "hormone",
    unit: "ng/ml",
    referenceLow: 10,
    referenceHigh: 30,
    optimalLow: 15,
    optimalHigh: 25,
    history: values.map((value, index) => ({
      date: `2026-0${index + 1}-01`,
      value,
    })),
    ...overrides,
  } as Biomarker;
}

describe("toMarkerStanding", () => {
  test("im Optimalbereich heisst imZiel", () => {
    expect(toMarkerStanding(marker([20]))).toBe("imZiel");
  });

  test("die Grenzen des Optimalbereichs zaehlen als drin", () => {
    expect(toMarkerStanding(marker([15]))).toBe("imZiel");
    expect(toMarkerStanding(marker([25]))).toBe("imZiel");
  });

  test("in der Referenz, aber ausserhalb des Optimums heisst grenzwertig", () => {
    expect(toMarkerStanding(marker([12]))).toBe("grenzwertig");
    expect(toMarkerStanding(marker([28]))).toBe("grenzwertig");
  });

  test("ausserhalb der Referenz heisst auffaellig", () => {
    expect(toMarkerStanding(marker([5]))).toBe("auffaellig");
    expect(toMarkerStanding(marker([35]))).toBe("auffaellig");
  });

  test("ohne Optimalbereich ist der Referenzbereich das Ziel — keine Warnung ohne Grenzwert", () => {
    const ohneOptimum = marker([12], {
      optimalLow: undefined,
      optimalHigh: undefined,
    });
    expect(toMarkerStanding(ohneOptimum)).toBe("imZiel");
  });

  test("ohne Messung gibt es keine Lage", () => {
    expect(toMarkerStanding(marker([]))).toBe("unbekannt");
  });
});

describe("toChangeReading", () => {
  test("naeher an den Zielbereich ist guenstig — auch wenn der Wert FAELLT", () => {
    /* Von oben herunter auf das Ziel zu: die Zahl sinkt, die Lage verbessert
     * sich. Genau hier scheitert jede Deutung, die nur das Vorzeichen liest. */
    expect(toChangeReading(marker([40, 32]))).toBe("guenstig");
  });

  test("naeher an den Zielbereich ist guenstig — auch wenn der Wert STEIGT", () => {
    expect(toChangeReading(marker([4, 8]))).toBe("guenstig");
  });

  test("weiter weg vom Zielbereich ist unguenstig", () => {
    expect(toChangeReading(marker([32, 40]))).toBe("unguenstig");
    expect(toChangeReading(marker([8, 4]))).toBe("unguenstig");
  });

  test("in den Zielbereich hinein ist guenstig", () => {
    expect(toChangeReading(marker([32, 20]))).toBe("guenstig");
  });

  test("Bewegung INNERHALB des Zielbereichs ist keine Verbesserung", () => {
    expect(toChangeReading(marker([16, 24]))).toBe("neutral");
    expect(toChangeReading(marker([24, 16]))).toBe("neutral");
  });

  test("Rauschen unter der Schwelle bleibt ungedeutet", () => {
    /* 0,2 % Bewegung — gerundet steht in der Pille ohnehin 0 %. */
    expect(toChangeReading(marker([40, 40.08]))).toBe("neutral");
  });

  test("eine einzelne Messung hat keine Veraenderung", () => {
    expect(toChangeReading(marker([40]))).toBe("neutral");
    expect(toChangeReading(marker([]))).toBe("neutral");
  });

  test("gedeutet wird gegen den Optimalbereich, wo es einen gibt", () => {
    /* 28 → 26: beide in der Referenz (10–30), aber 26 liegt naeher am
     * Optimum (15–25). Ohne Optimalbereich waeren beide "drin" und die
     * Bewegung neutral — mit ihm ist sie guenstig. */
    expect(toChangeReading(marker([28, 26]))).toBe("guenstig");
    expect(
      toChangeReading(
        marker([28, 26], { optimalLow: undefined, optimalHigh: undefined }),
      ),
    ).toBe("neutral");
  });
});
