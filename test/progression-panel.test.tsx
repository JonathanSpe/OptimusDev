import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, test } from "vitest";

import { ProgressionPanel } from "@/features/analysis/components/progression-panel";
import {
  sampleCategorySeries,
  sampleMarkerChanges,
  sampleScore,
  type ScoreSummary,
} from "@/features/analysis/sample-data";

/*
 * DIE KACHEL "ENTWICKLUNG" — gepruefte Zustaende und Bedienbarkeit.
 *
 * Was hier NICHT geprueft wird, ist das Bild: jsdom rechnet kein Layout, eine
 * Behauptung ueber Linienverlaeufe waere hier frei erfunden. Geprueft wird, was
 * traegt, wenn niemand hinsieht — der Leerzustand, die Tab-Reihenfolge und die
 * Saetze, die ein Screenreader vorliest.
 */

/* jsdom kennt keinen ResizeObserver. Ohne ihn misst die Kachel nie und das Feld
 * bleibt leer; mit fester Breite laeuft derselbe Pfad wie im Browser. */
const FIELD_ROW_WIDTH = 700;

beforeAll(() => {
  class StubResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: { width: FIELD_ROW_WIDTH, height: 224 },
          } as unknown as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver,
      );
    }
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    StubResizeObserver as unknown as typeof ResizeObserver;
});

describe("Leerzustand", () => {
  test("zeigt bei nur einem Test keine Entwicklung, sondern den Grund", () => {
    const einTest: ScoreSummary = {
      ...sampleScore,
      history: [sampleScore.history[0]!],
    };

    render(
      <ProgressionPanel score={einTest} categories={sampleCategorySeries} />,
    );

    expect(screen.getByText("Noch keine Entwicklung")).toBeInTheDocument();
    /* Der Kopf bleibt derselbe — sonst waere die Kachel im Leerzustand eine
     * andere Kachel. */
    expect(
      screen.getByRole("heading", { name: "Entwicklung" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  test("zeigt ohne Marker-Bewegungen trotzdem das Feld", () => {
    render(
      <ProgressionPanel
        score={sampleScore}
        categories={sampleCategorySeries}
        changes={[]}
      />,
    );

    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(
      screen.queryByText("Wichtigste Blutwert-Veränderungen"),
    ).not.toBeInTheDocument();
  });

  test("zeigt ohne Bereiche keine leere Flaeche, sondern den Grund", () => {
    /* Seit die Gesamtlinie weg ist, gibt es ohne Bereiche NICHTS zu zeichnen.
     * Vorher blieb in diesem Fall die tragende Linie allein stehen. */
    render(<ProgressionPanel score={sampleScore} categories={[]} />);

    expect(screen.getByText("Noch keine Entwicklung")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("Das Feld", () => {
  test("zeichnet alle vier Linien gleich", () => {
    render(
      <ProgressionPanel
        score={sampleScore}
        categories={sampleCategorySeries}
      />,
    );

    /*
     * Ton, Staerke und Strichart sind an allen vier identisch. Frueher war eine
     * Reihe im Rauschband blass und gestrichelt; das lag nachgemessen bei
     * 1,60:1 gegen die Karte und damit unter der 3:1-Schwelle fuer Grafik. Wo
     * "im Rauschband" stattdessen steht, prueft der Test darunter.
     */
    const lines = [...screen.getByRole("img").querySelectorAll("path")].filter(
      (path) => path.getAttribute("stroke-width") !== "16",
    );

    expect(lines).toHaveLength(sampleCategorySeries.length);
    const looks = new Set(
      lines.map(
        (path) =>
          `${path.getAttribute("class")}|${path.style.strokeWidth}|${
            path.getAttribute("stroke-dasharray") ?? "keine"
          }`,
      ),
    );

    /*
     * EINE Erscheinung fuer alle vier. Das Strichmuster steht bewusst mit im
     * Vergleich und nicht in einer eigenen Zusage: Motion schreibt fuer
     * pathLength selbst ein stroke-dasharray auf jeden Pfad, "keine" kommt hier
     * also nie vor. Traegt eine Linie ein ANDERES Muster als ihre Nachbarn,
     * waechst diese Menge — und genau das soll sie nicht.
     */
    expect(looks.size).toBe(1);
  });

  test("nennt das Rauschband in der Beschriftung, weil die Linie es nicht mehr tut", () => {
    render(
      <ProgressionPanel
        score={sampleScore}
        categories={sampleCategorySeries}
      />,
    );

    /* Immunsystem bewegt sich zuletzt um 0 Punkte und liegt damit im Band.
     * Seit alle Linien gleich aussehen, ist dieser Satz die EINZIGE Stelle, an
     * der das noch steht — vorgelesen wie gesehen. */
    expect(
      screen.getByRole("button", { name: /^Immunsystem/ }),
    ).toHaveAccessibleName(/im Rauschband/);
  });

  test("setzt auf jede Messung einen Punkt", () => {
    render(
      <ProgressionPanel
        score={sampleScore}
        categories={sampleCategorySeries}
      />,
    );

    /* Eine Linie ohne Punkte laesst offen, wie viele Tests sie verbindet — und
     * seit die Verlaeufe gerundet sind, sieht man die Termine auch nicht mehr
     * am Knick. */
    const measured = sampleCategorySeries.reduce(
      (total, category) => total + category.history.length,
      0,
    );

    /* Nur im FELD zaehlen: der ⓘ-Knopf der Kachel bringt seinen eigenen Kreis
     * mit, und der ist kein Messpunkt. */
    expect(screen.getByRole("img").querySelectorAll("circle")).toHaveLength(
      measured,
    );
  });
});

describe("Bedienbarkeit", () => {
  test("jede Reihe ist ein Halt in der Tab-Reihenfolge", () => {
    render(
      <ProgressionPanel
        score={sampleScore}
        categories={sampleCategorySeries}
        changes={sampleMarkerChanges}
      />,
    );

    const traces = screen
      .getAllByRole("button")
      .filter((button) =>
        /Punkte seit dem letzten Test/.test(button.textContent ?? ""),
      );

    /* Die vier Bereiche — und NUR sie. Die Gesamtlinie ist entfernt, weil der
     * Score auf derselben Seite schon eine eigene Kachel hat; ein fuenfter Halt
     * hier waere der Weg zurueck dorthin. */
    expect(traces).toHaveLength(sampleCategorySeries.length);
    for (const button of traces) {
      expect(button).toHaveAttribute("type", "button");
    }
  });

  test("nennt an jedem Halt einen ganzen Satz statt eines Namens", () => {
    render(
      <ProgressionPanel
        score={sampleScore}
        categories={sampleCategorySeries}
      />,
    );

    for (const category of sampleCategorySeries) {
      /* Das Bereichszeichen daneben ist aria-hidden — der Name muss den Halt
       * also allein benennen. */
      expect(
        screen.getByRole("button", {
          name: new RegExp(`^${category.shortName}`),
        }),
      ).toHaveAccessibleName(
        /Punkte seit dem letzten Test.*(gestiegen|gefallen|unverändert)/,
      );
    }
  });

  test("laesst die Trefferflaechen im Feld aus der Tab-Reihenfolge heraus", () => {
    const { container } = render(
      <ProgressionPanel
        score={sampleScore}
        categories={sampleCategorySeries}
      />,
    );

    /* Die breiten Griffe sind Mausflaechen. Geriete davon etwas in die
     * Tastatur-Reihenfolge, tabbte man durch unsichtbare Pfade. */
    expect(
      container.querySelectorAll(
        'svg [tabindex]:not([tabindex="-1"]), svg button, svg a[href]',
      ),
    ).toHaveLength(0);
  });

  test("beschreibt das ganze Feld in einem Satz", () => {
    render(
      <ProgressionPanel
        score={sampleScore}
        categories={sampleCategorySeries}
      />,
    );

    const field = screen.getByRole("img");
    const label = field.getAttribute("aria-label") ?? "";

    expect(label).toMatch(/^Entwicklung über \d+ Tests\./);
    for (const category of sampleCategorySeries) {
      expect(label).toContain(category.shortName);
    }
    /* Deutscher Satzbau: das letzte Glied haengt an "und", nicht an einem
     * Komma. */
    expect(label).toContain(" und ");
  });
});

describe("Wichtigste Blutwert-Veränderungen", () => {
  test("ergibt vorgelesen einen Satz aus Wert, Einheit und Wert", () => {
    render(
      <ProgressionPanel
        score={sampleScore}
        categories={sampleCategorySeries}
        changes={sampleMarkerChanges}
      />,
    );

    const heading = screen.getByText("Wichtigste Blutwert-Veränderungen");
    const rows = within(heading.parentElement as HTMLElement).getAllByRole(
      "listitem",
    );

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      /* "1,1 mg/l auf 0,7 mg/l" — der Pfeil ist aria-hidden, das Wort "auf"
       * traegt die Beziehung. Ohne es waeren es zwei Zahlen ohne Richtung. */
      expect(row.textContent).toMatch(/[\d,]+\s*\S*\s*auf/);
    }
  });

  test("nennt das Urteil als Wort und nicht nur als Farbe", () => {
    render(
      <ProgressionPanel
        score={sampleScore}
        categories={sampleCategorySeries}
        changes={sampleMarkerChanges}
      />,
    );

    const heading = screen.getByText("Wichtigste Blutwert-Veränderungen");
    const rows = within(heading.parentElement as HTMLElement).getAllByRole(
      "listitem",
    );

    for (const row of rows) {
      expect(row.textContent).toMatch(
        /günstig|ungünstig|ohne Urteil|unverändert/,
      );
    }
  });
});
