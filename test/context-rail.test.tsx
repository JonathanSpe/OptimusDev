import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ContextRail } from "@/components/common/context-rail";
import { sampleNextTest } from "@/features/context";

/*
 * Diese Datei sichert zwei Dinge, die man beim naechsten Umbau der Leiste
 * versehentlich zurueckdreht, ohne dass etwas kaputt aussieht.
 */

describe("Kontext-Leiste", () => {
  test("gibt jeder Kachel eine Ueberschrift derselben Stufe", () => {
    /*
     * Die Profilkachel war frueher der Sonderfall: ihr Versal-Label stand UNTER
     * dem Namen statt als Ueberschrift darueber. Sie muss in derselben Reihe
     * stehen wie die anderen vier, sonst ist die Rangfolge der Leiste wieder
     * schief — und ohne h2 taucht sie in keiner Ueberschriftenliste auf.
     */
    render(<ContextRail />);

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);

    expect(headings).toEqual([
      "Dein Profil",
      "Nächster Test",
      "Offene Fragen",
      "Verknüpfte Apps",
      "Dein Kontext",
    ]);
  });

  test("nennt den geplanten Termin beim Namen, nicht nur in Rot", () => {
    /*
     * Der geplante Punkt der Zeitleiste ist die einzige Stelle der Leiste, an
     * der Marken-Rot eine Rolle traegt. Rot allein darf sie nie tragen: der
     * Zustand steht als Wort daneben, und in Graustufen unterscheidet den Punkt
     * zusaetzlich sein Ring. Faellt der Text weg, ist die Angabe fuer jeden
     * unsichtbar, der die Farbe nicht sieht.
     */
    render(<ContextRail />);

    const geplant = sampleNextTest.timeline.filter(
      (entry) => entry.state === "geplant",
    );
    expect(geplant).toHaveLength(1);

    for (const entry of sampleNextTest.timeline) {
      const eintrag = screen.getByText(entry.label).closest("li");
      expect(eintrag).not.toBeNull();
      expect(
        within(eintrag as HTMLElement).getByText(
          `${entry.date} ${entry.state}`,
        ),
      ).toBeInTheDocument();
    }
  });
});
