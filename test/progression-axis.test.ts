import { describe, expect, test } from "vitest";

import {
  toGridTicks,
  toScoreDomain,
} from "@/features/analysis/components/progression-panel";
import { CATEGORY_NOISE_FALLBACK } from "@/features/analysis/rules";
import { SCORE_MAX, SCORE_MIN } from "@/features/analysis/sample-data";

/*
 * DIE WERTACHSE DER ENTWICKLUNGS-KACHEL.
 *
 * Geprueft wird hier genau eine Sache mit Nachdruck: dass die Spanne nie null
 * wird. Die Skala teilt durch sie — bei low === high wird jede Koordinate im
 * Feld zu NaN, und ein NaN im style-Attribut bringt kein Bauteil zum Absturz,
 * es zeichnet nur nichts mehr. Ein Fehler, der still ist, braucht einen Test.
 *
 * Das Rauschband ist ein Platzhalter (siehe CATEGORY_NOISE in rules.ts), der
 * Bodensatz haengt daran. Die Tests rechnen deshalb mit dem Faktor und nicht mit
 * einer abgeschriebenen Zahl.
 */

/** Derselbe Faktor wie NOISE_HEADROOM in der Kachel. */
const HEADROOM = 8;
const MIN_SPAN = CATEGORY_NOISE_FALLBACK * HEADROOM;

/** Rasterschritt der Achse — DOMAIN_SNAP. */
const SNAP = 10;

describe("toScoreDomain", () => {
  test("legt die Daten mittig in eine auf Zehner gerastete Spanne", () => {
    const { low, high } = toScoreDomain([58, 64, 67, 71], MIN_SPAN);

    expect(low % SNAP).toBe(0);
    expect(high % SNAP).toBe(0);
    expect(low).toBeLessThanOrEqual(58);
    expect(high).toBeGreaterThanOrEqual(71);
  });

  test("haelt den Boden aus dem Rauschband ein", () => {
    /* Zwei Punkte Bewegung — ohne Boden waere das die halbe Feldhoehe. */
    const { low, high } = toScoreDomain([66, 68], MIN_SPAN);

    expect(high - low).toBeGreaterThanOrEqual(MIN_SPAN);
  });

  test("ueberlebt lauter identische Werte", () => {
    const { low, high } = toScoreDomain([70, 70, 70, 70], MIN_SPAN);

    expect(high).toBeGreaterThan(low);
    expect(low).toBeLessThanOrEqual(70);
    expect(high).toBeGreaterThanOrEqual(70);
  });

  test("ueberlebt einen einzigen Testtermin", () => {
    const { low, high } = toScoreDomain([71], MIN_SPAN);

    expect(high - low).toBeGreaterThanOrEqual(MIN_SPAN);
  });

  test("zeigt ohne jede Messung die ganze Skala statt NaN", () => {
    const { low, high } = toScoreDomain([null, null, null], MIN_SPAN);

    expect(low).toBe(SCORE_MIN);
    expect(high).toBe(SCORE_MAX);
  });

  test("rechnet nicht erhobene Termine aus der Spanne heraus", () => {
    const withGaps = toScoreDomain([58, null, 67, null], MIN_SPAN);
    const without = toScoreDomain([58, 67], MIN_SPAN);

    expect(withGaps).toEqual(without);
  });

  test("bleibt am unteren Ende der Skala innerhalb 0 bis SCORE_MAX", () => {
    const { low, high } = toScoreDomain([0, 2, 4], MIN_SPAN);

    expect(low).toBe(SCORE_MIN);
    expect(high).toBeLessThanOrEqual(SCORE_MAX);
    /* Was die Klammer unten wegnimmt, holt das obere Ende nach. */
    expect(high - low).toBeGreaterThanOrEqual(MIN_SPAN);
  });

  test("bleibt am oberen Ende der Skala innerhalb 0 bis SCORE_MAX", () => {
    const { low, high } = toScoreDomain([96, 98, SCORE_MAX], MIN_SPAN);

    expect(high).toBe(SCORE_MAX);
    expect(low).toBeGreaterThanOrEqual(SCORE_MIN);
    expect(high - low).toBeGreaterThanOrEqual(MIN_SPAN);
  });

  test("kollabiert auch bei einem Rauschband von null nicht", () => {
    /* Ein Band von 0 ist kein Unfall: kommen die echten Baender aus dem
     * Verlaufs-Framework, ist 0 ein moeglicher Eintrag. Ohne den Rasterboden
     * ergaebe 70 bei Spanne 0 die Domain [70, 70]. */
    const { low, high } = toScoreDomain([70, 70], 0);

    expect(high - low).toBeGreaterThanOrEqual(SNAP);
  });

  test("faellt bei unbrauchbarem Boden auf den Rasterschritt zurueck", () => {
    const { low, high } = toScoreDomain([70, 72], Number.NaN);

    expect(Number.isFinite(low)).toBe(true);
    expect(Number.isFinite(high)).toBe(true);
    expect(high - low).toBeGreaterThanOrEqual(SNAP);
  });

  test("gibt bei absurd breitem Boden die ganze Skala und nicht mehr", () => {
    const { low, high } = toScoreDomain([50], 500);

    expect(low).toBe(SCORE_MIN);
    expect(high).toBe(SCORE_MAX);
  });

  test("liefert ueber die ganze Skala hinweg immer eine echte Spanne", () => {
    for (let value = SCORE_MIN; value <= SCORE_MAX; value += 1) {
      for (const span of [0, 1, MIN_SPAN, 97]) {
        const { low, high } = toScoreDomain([value], span);

        expect(high).toBeGreaterThan(low);
        expect(low).toBeGreaterThanOrEqual(SCORE_MIN);
        expect(high).toBeLessThanOrEqual(SCORE_MAX);
      }
    }
  });
});

describe("toGridTicks", () => {
  test("beschriftet nur Vielfache des Rasterschritts", () => {
    for (const tick of toGridTicks(50, 90)) {
      expect(tick % SNAP).toBe(0);
    }
  });

  test("bleibt innerhalb der Spanne", () => {
    const ticks = toGridTicks(50, 90);

    expect(Math.min(...ticks)).toBeGreaterThanOrEqual(50);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(90);
  });

  test("haelt die Zahl der Linien auch ueber die ganze Skala klein", () => {
    /* MAX_GRID_LINES ist 6; mehr liest sich als Millimeterpapier. */
    expect(toGridTicks(SCORE_MIN, SCORE_MAX).length).toBeLessThanOrEqual(6);
  });

  test("liefert fuer jede erreichbare Domain mindestens zwei Marken", () => {
    for (let low = SCORE_MIN; low < SCORE_MAX; low += SNAP) {
      for (let high = low + SNAP; high <= SCORE_MAX; high += SNAP) {
        expect(toGridTicks(low, high).length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
