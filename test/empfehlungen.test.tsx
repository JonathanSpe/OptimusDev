import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { RailPlacementProvider } from "@/components/common/rail-placement";
import type { Supplement } from "@/contracts";
import { mockSupplements } from "@/data/mock";
import {
  RailCartSlot,
  RecommendationBoard,
  toEuroDelta,
  toEvidence,
  toRecommendationStrength,
  toRecommendedChanges,
  toSubscriptionChange,
} from "@/features/empfehlungen";

/*
 * Diese Datei sichert die Zusagen, die man beim naechsten Umbau der Seite
 * verliert, ohne dass etwas kaputt aussieht.
 */

/** Dieselben Daten, aber niemand hat ein Abo — der Erstbesuch. */
const ohneAbo: readonly Supplement[] = mockSupplements.map((prep) => ({
  ...prep,
  inSubscription: false,
  intake: null,
}));

function ueberschriften(): string[] {
  return screen
    .getAllByRole("heading", { level: 2 })
    .map((h) => h.textContent?.replace(/\d+$/, "").trim() ?? "");
}

/** Der erste Abschnitt heisst nach dem Ergebnis, nicht nach dem Kriterium. */
const STACK = "Dein individueller Nahrungsergänzungs-Stack";

describe("Empfehlungen — die Gliederung", () => {
  test("gliedert nach Empfehlungsstaerke und nicht nach dem Abo", () => {
    /*
     * DIE WICHTIGSTE ZUSICHERUNG DER SEITE. Ein Abschnitt "Weiter nehmen"
     * waere die Verschmelzung beider Achsen, und man merkt den Fehler erst am
     * Erstbesuch: die Seite saehe dann bei leerem Abo voellig anders aus.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(ueberschriften()).toEqual([
      STACK,
      "Optional",
      "Nicht mehr empfohlen",
    ]);
  });

  test("behaelt die Gliederung beim Erstbesuch mit leerem Abo", () => {
    /*
     * Identische Reihenfolge, identische Ueberschriften — nur "Nicht mehr
     * empfohlen" faellt weg, und zwar zwangslaeufig: man kann nichts absetzen,
     * was nicht laeuft.
     */
    render(<RecommendationBoard supplements={ohneAbo} />);

    expect(ueberschriften()).toEqual([STACK, "Optional"]);
  });

  test("laesst dieselbe Abo-Marke in jedem Abschnitt zu", () => {
    /*
     * Ashwagandha laeuft und steht unter "Optional" — waere die
     * Abo-Zugehoerigkeit die Gliederung, koennte es dort nicht stehen.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    const optional = screen
      .getAllByRole("region")
      .find((r) => r.textContent?.startsWith("Optional"));
    expect(optional).toBeDefined();
    expect(within(optional!).getByText("im Abo")).toBeInTheDocument();
  });
});

describe("Empfehlungen — die Regel", () => {
  test("setzt 'nicht mehr empfohlen' nur bei laufender Einnahme", () => {
    for (const prep of ohneAbo) {
      expect(toRecommendationStrength(prep)).not.toBe("nichtMehrEmpfohlen");
    }
  });

  test("nennt bei 'zu frueh' den Termin statt eines erfundenen Deltas", () => {
    /*
     * Magnesium laeuft 28 Tage, das Wirkfenster beginnt an Tag 42. Die Zeile
     * darf keine Bewegung behaupten, die niemand gemessen hat.
     */
    const magnesium = mockSupplements.find((p) => p.id === "magnesium");
    const evidence = toEvidence(magnesium!);

    expect(evidence.text).toBe(
      "läuft seit 28 Tagen — beurteilbar ab 04.08.2026",
    );
    expect(evidence.text).not.toContain("→");
    expect(evidence.measured).toBe(false);
  });

  test("begruendet mit Messwerten, wo es welche gibt", () => {
    const vitD = mockSupplements.find((p) => p.id === "vit-d3");
    expect(toEvidence(vitD!).text).toBe("25-OH-Vitamin-D 17 → 44 ng/ml");
  });

  test("faellt ohne Zielmarker auf 'optional' und nennt die Herkunft", () => {
    /*
     * Ohne Messwert erklaert die Zeile, WOHER die Empfehlung kommt. Ein "kein
     * messbarer Zielmarker" stand hier vorher: das nannte ein Feld des Modells
     * und erklaerte nichts. Was weiterhin nicht dastehen darf, ist ein THEMA
     * ("Schlaf") — das waere die Wirkaussage.
     */
    const ashwagandha = mockSupplements.find((p) => p.id === "ashwagandha");
    expect(toRecommendationStrength(ashwagandha!)).toBe("optional");
    expect(toEvidence(ashwagandha!).text).toBe(
      "aus deinem Fragebogen, nicht aus einem Blutwert",
    );
  });

  test("nennt bei einer noch nicht genommenen Empfehlung den Ansatzpunkt", () => {
    /*
     * Frueher stand hier bloss der Markername ("Zink (Serum)") — ein Wort ohne
     * Aussage. Die Spalte traegt die Begruendung der Zeile, also muss sie auch
     * eine sein.
     */
    const zink = mockSupplements.find((p) => p.id === "zink");
    expect(toEvidence(zink!).text).toBe(
      "Ansatzpunkt aus deinem Test: Zink (Serum)",
    );
  });
});

describe("Empfehlungen — die Bilanz", () => {
  test("rechnet die Aenderung und nicht die Gesamtsumme", () => {
    const change = toSubscriptionChange(
      mockSupplements,
      new Map([
        ["zink", "hinzufuegen" as const],
        ["vit-d3", "entfernen" as const],
      ]),
    );

    expect(change.beforeCents).toBe(6910);
    expect(change.afterCents).toBe(6310);
    expect(change.deltaCents).toBe(-600);
    expect(change.added.map((p) => p.id)).toEqual(["zink"]);
    expect(change.removed.map((p) => p.id)).toEqual(["vit-d3"]);
  });

  test("gibt einer Differenz immer ein Vorzeichen", () => {
    /*
     * "6,00 €" liest sich wie ein Preis, "−6,00 €" wie eine Veraenderung.
     * Das Leerzeichen vor dem Euro ist ein GESCHUETZTES (U+00A0) — so setzt
     * Intl es, und ein normales hier wuerde den Vergleich unsichtbar brechen.
     */
    expect(toEuroDelta(-600)).toBe("−6,00\u00A0€");
    expect(toEuroDelta(890)).toBe("+8,90\u00A0€");
    expect(toEuroDelta(0)).toBe("±0,00\u00A0€");
  });
});

describe("Empfehlungen — der Vorschlag", () => {
  /*
   * Der Korb steht beim Aufschlagen auf dem Vorschlag aus der Auswertung. Das
   * ist bequem und zugleich die heikelste Stelle der Seite: ein vorbefuellter
   * Korb, der sich nicht als Vorschlag zu erkennen gibt oder sich nicht
   * zeilenweise umdrehen laesst, waere ein untergeschobener Korb.
   */
  test("merkt an, was empfohlen oder optional ist, und traegt Gestopptes aus", () => {
    const vorschlag = toRecommendedChanges(mockSupplements);

    /* Nicht mehr empfohlen und laufend → raus. */
    expect(vorschlag.get("omega-3")).toBe("entfernen");
    /* Empfohlen bzw. optional und nicht im Abo → rein. */
    expect(vorschlag.get("zink")).toBe("hinzufuegen");
    expect(vorschlag.get("b12")).toBe("hinzufuegen");
    expect(vorschlag.get("kreatin")).toBe("hinzufuegen");
    /* Was laeuft und weiter empfohlen ist, braucht keine Vormerkung. */
    expect(vorschlag.has("vit-d3")).toBe(false);
    expect(vorschlag.has("ashwagandha")).toBe(false);
  });

  test("merkt nichts vor, was ohnehin schon stimmt", () => {
    /*
     * Die Probe gegen Nullbewegungen: bei einem Abo, das dem Vorschlag bereits
     * entspricht, darf nichts vorgemerkt sein — sonst zeigte die Seite eine
     * Aenderung an, die keine ist.
     */
    const schonRichtig: readonly Supplement[] = mockSupplements
      .filter((prep) => toRecommendationStrength(prep) !== "nichtMehrEmpfohlen")
      .map((prep) => ({ ...prep, inSubscription: true }));

    expect(toRecommendedChanges(schonRichtig).size).toBe(0);
  });

  test("sagt in der Fussleiste, dass etwas vorgemerkt ist", () => {
    /* Ohne Zutun des Nutzers — genau deshalb muss es dastehen. */
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(screen.getByText(/Änderung am Abo/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Änderungen bestätigen" }),
    ).toBeInTheDocument();
  });

  test("laesst jede vorgeschlagene Zeile mit einem Klick zurueckdrehen", async () => {
    /*
     * Die zweite Bedingung dafuer, dass ein vorbefuellter Korb sauber bleibt.
     * Zink ist vorgemerkt, ohne dass jemand es angefasst hat — ein Klick muss
     * es wieder austragen, und die Zeile muss danach wieder anzubieten sein.
     */
    const user = userEvent.setup();
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(screen.getByText("Zinkbisglycinat")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Entfernen: Zinkbisglycinat" }),
    );

    expect(
      screen.getByRole("button", { name: "Hinzufügen: Zinkbisglycinat" }),
    ).toBeInTheDocument();
  });
});

describe("Empfehlungen — die Handlungen", () => {
  test("blendet die Fussleiste aus, sobald nichts mehr offen ist", async () => {
    /*
     * Die Leiste haengt an "es gibt etwas zu bestaetigen" und nicht an "der
     * Nutzer hat etwas getan". Nach der Bestaetigung ist beides erledigt.
     */
    const user = userEvent.setup();
    render(<RecommendationBoard supplements={mockSupplements} />);

    await user.click(
      screen.getByRole("button", { name: "Änderungen bestätigen" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Absetzen und bestätigen" }),
    );

    /* Die Leiste blendet AUS statt zu verschwinden — abwarten, sonst prueft
     * der Test gegen ein Element, das gerade noch animiert. */
    await waitFor(() =>
      expect(screen.queryByText(/Änderung am Abo/i)).not.toBeInTheDocument(),
    );
  });

  test("haelt eine entfernte Position sichtbar und rueckholbar", async () => {
    const user = userEvent.setup();
    render(<RecommendationBoard supplements={mockSupplements} />);

    await user.click(
      screen.getByRole("button", { name: "Entfernen: Vitamin D3" }),
    );

    /* Sie bleibt in der Liste stehen — nur ihr Stand hat sich geaendert. */
    expect(screen.getByText("Vitamin D3")).toBeInTheDocument();
    expect(screen.getAllByText("wird entfernt").length).toBeGreaterThan(0);

    /*
     * Zurueck geht es mit derselben einen Handlung. Es gibt kein "Rückgängig"
     * mehr: seit der Korb vorbefuellt ist, stuende das an Zeilen, an denen
     * niemand etwas getan hat.
     */
    await user.click(
      screen.getByRole("button", { name: "Hinzufügen: Vitamin D3" }),
    );

    expect(
      screen.getByRole("button", { name: "Entfernen: Vitamin D3" }),
    ).toBeInTheDocument();
  });

  test("verlangt fuer eine Kuendigung eine zweite Stufe, die sie benennt", async () => {
    /*
     * Absetzen ist eine Kuendigung. Sie darf nicht mit demselben Klick
     * passieren wie eine Bestellung, und die Rueckfrage muss sagen, WAS
     * abgesetzt wird — "2 Positionen" ist keine Information.
     *
     * Der Vorschlag selbst enthaelt schon eine Kuendigung (Omega-3 ist nicht
     * mehr empfohlen). Umso wichtiger, dass sie zweimal bestaetigt wird: sonst
     * setzte ein einziger Klick auf einen vorbefuellten Korb eine laufende
     * Einnahme ab.
     */
    const user = userEvent.setup();
    render(<RecommendationBoard supplements={mockSupplements} />);

    await user.click(
      screen.getByRole("button", { name: "Änderungen bestätigen" }),
    );

    expect(screen.getByText(/Ein Präparat wird abgesetzt/)).toBeInTheDocument();
    expect(screen.getByText(/Omega-3 \(EPA\/DHA\) —/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Absetzen und bestätigen" }),
    ).toBeInTheDocument();
  });

  test("laesst eine reine Bestellung ohne zweite Stufe durch", async () => {
    const user = userEvent.setup();
    render(<RecommendationBoard supplements={mockSupplements} />);

    /* Den einzigen Abgang des Vorschlags zurueckdrehen — dann bleiben nur
     * Zugaenge, und die sind eine Bestellung. */
    await user.click(
      screen.getByRole("button", { name: "Hinzufügen: Omega-3 (EPA/DHA)" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Änderungen bestätigen" }),
    );

    expect(screen.queryByText(/wird abgesetzt/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(/Änderung am Abo/i)).not.toBeInTheDocument(),
    );
  });

  test("fuehrt von jedem Praeparat zur Detailansicht", () => {
    /*
     * Noch OHNE Ziel — die Route gibt es nicht. Geprueft wird deshalb nur, dass
     * der Zugang als Bedienelement dasteht und nicht als toter Text: wer ihn
     * spaeter verdrahtet, findet ihn hier. Bild und Name zusammen sind das
     * Element, nicht die ganze Zeile — in der Zeile sitzen schon zwei Knoepfe.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    const zugang = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.startsWith("Vitamin D3"));

    expect(zugang).toBeDefined();
    expect(zugang).toHaveAccessibleName(/Details anzeigen/);
  });
});

describe("Empfehlungen — der Warenkorb in der Leiste", () => {
  /*
   * Ab xl wandert der Korb per Portal in die Kontext-Leiste. jsdom beantwortet
   * keine Media Query, und test/setup.ts laesst sie deshalb ueberall auf
   * "schmal" fallen — fuer diese Gruppe wird sie auf "breit" gestellt.
   */
  function mitBreitemSchirm(): () => void {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    return () => {
      window.matchMedia = original;
    };
  }

  let breit: () => void;
  beforeEach(() => {
    breit = mitBreitemSchirm();
  });
  afterEach(() => breit());

  /** Die Leiste und die Seite, so wie das (app)-Layout sie nebeneinanderstellt. */
  function renderMitLeiste(supplements: readonly Supplement[]) {
    return render(
      <>
        <RailCartSlot />
        <RecommendationBoard supplements={supplements} />
      </>,
    );
  }

  function korb(): HTMLElement {
    const heading = screen.getByRole("heading", { name: "Warenkorb" });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    return section!;
  }

  test("steht beim Aufschlagen auf dem Vorschlag und sagt das", () => {
    renderMitLeiste(mockSupplements);

    /* Laufend und weiter empfohlen · vorgeschlagen · vorgeschlagener Abgang. */
    expect(within(korb()).getByText("Vitamin D3")).toBeInTheDocument();
    expect(within(korb()).getByText("Zinkbisglycinat")).toBeInTheDocument();
    expect(within(korb()).getByText("Omega-3 (EPA/DHA)")).toBeInTheDocument();

    expect(
      within(korb()).getByText(/^Vorschlag nach deinem Test/),
    ).toBeInTheDocument();
    expect(within(korb()).getAllByText("kommt dazu").length).toBe(3);
    expect(within(korb()).getByText("wird entfernt")).toBeInTheDocument();
  });

  test("laesst eine abgehende Position im Korb stehen", async () => {
    /*
     * Sie verschwinden zu lassen waere die naheliegende Lesart von "naechste
     * Fassung" und die schlechtere: dann bliebe von einem Klick nur eine
     * kleinere Summe, und aus dem Korb waere die Position nicht zurueckzuholen.
     */
    const user = userEvent.setup();
    renderMitLeiste(mockSupplements);

    await user.click(
      screen.getByRole("button", { name: "Entfernen: Vitamin D3" }),
    );

    expect(within(korb()).getByText("Vitamin D3")).toBeInTheDocument();
    expect(within(korb()).getAllByText("wird entfernt")).toHaveLength(2);
  });

  test("bestaetigt an genau EINER Stelle — nie in Leiste und Fussleiste", () => {
    /*
     * Der Korb hat zwei Plaetze, aber immer nur einen davon. Zwei
     * Bestaetigen-Schaltflaechen im selben Dokument waeren eine zu viel, und
     * welche von beiden gerade zaehlt, waere nicht zu sehen.
     */
    renderMitLeiste(mockSupplements);

    expect(
      screen.getAllByRole("button", { name: "Änderungen bestätigen" }),
    ).toHaveLength(1);
    expect(screen.queryByText(/Änderung am Abo/i)).not.toBeInTheDocument();
  });

  test("verlangt die zweite Stufe auch im Korb", async () => {
    const user = userEvent.setup();
    renderMitLeiste(mockSupplements);

    await user.click(
      screen.getByRole("button", { name: "Änderungen bestätigen" }),
    );

    expect(
      within(korb()).getByText(/Ein Präparat wird abgesetzt/),
    ).toBeInTheDocument();
    expect(
      within(korb()).getByText(/Omega-3 \(EPA\/DHA\) —/),
    ).toBeInTheDocument();
  });

  test("fuehrt zur Abo-Verwaltung", () => {
    /*
     * Noch ohne Ziel — Liefertakt, Zahlung und Pausieren gibt es nicht. Wie
     * beim Zugang zum Praeparat wird nur geprueft, dass der Weg als
     * Bedienelement dasteht.
     */
    renderMitLeiste(mockSupplements);

    expect(
      within(korb()).getByRole("button", { name: "Abo verwalten" }),
    ).toBeInTheDocument();
  });

  test("behaelt die Gliederung beim Erstbesuch mit leerem Abo", () => {
    /*
     * Derselbe Erstbesuch wie oben, nur mit Leiste. Der Korb ist auch dann
     * nicht leer — er traegt den Vorschlag —, und die Abschnitte der Seite
     * bleiben davon unberuehrt.
     */
    renderMitLeiste(ohneAbo);

    /* Ohne die Korb-Kachel, deren Platz in der Leiste hier nicht zur Debatte
     * steht — geprueft wird die Gliederung der SEITE. */
    expect(ueberschriften().filter((t) => t !== "Warenkorb")).toEqual([
      STACK,
      "Optional",
    ]);
    expect(within(korb()).getByText("Vitamin D3")).toBeInTheDocument();
    expect(within(korb()).queryByText("wird entfernt")).not.toBeInTheDocument();
  });
});

describe("Empfehlungen — der Warenkorb auf schmalen Schirmen", () => {
  /*
   * Hier gilt der schmale Standard aus test/setup.ts, also die Lage unter xl:
   * die Kontext-Spalte steht per display:none im Dokument, erreichbar ist die
   * Leiste nur ueber die Schublade.
   */
  function rendern(placement: "column" | "drawer") {
    render(
      <>
        <RailPlacementProvider placement={placement}>
          <RailCartSlot />
        </RailPlacementProvider>
        <RecommendationBoard supplements={mockSupplements} />
      </>,
    );
  }

  test("nimmt die ausgeblendete Spalte nicht als Platz", () => {
    /*
     * Ein Korb in der ausgeblendeten Spalte waere unsichtbar — und schlimmer:
     * die Seite hielte ihn fuer untergebracht und liesse die Fussleiste weg.
     * Dann gaebe es unter xl gar keinen Weg zur Bestaetigung.
     */
    rendern("column");

    expect(screen.queryByRole("heading", { name: "Warenkorb" })).toBeNull();
    expect(screen.getByText(/Änderung am Abo/i)).toBeInTheDocument();
  });

  test("steht in der geoeffneten Schublade, und dann nicht am Fuss", () => {
    /* Die Schublade gibt es nur geoeffnet — dort ist vorhanden gleich
     * sichtbar, und der Korb gehoert hinein. */
    rendern("drawer");

    expect(
      screen.getByRole("heading", { name: "Warenkorb" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Änderung am Abo/i)).not.toBeInTheDocument();
  });
});

describe("Empfehlungen — der rechtliche Hinweis", () => {
  test("sagt, dass Ergänzung nichts ersetzt und die Empfehlung ohne Gewähr gilt", () => {
    render(<RecommendationBoard supplements={mockSupplements} />);

    const hinweis = screen.getByText(/kein Ersatz für eine ausgewogene/);
    expect(hinweis).toBeInTheDocument();
    expect(hinweis).toHaveTextContent(/ohne Gewähr/);
    expect(hinweis).toHaveTextContent(/ärztliche Diagnose oder Behandlung/);
  });

  test("nimmt den Hinweis nicht zum Anlass für eine Wirkaussage", () => {
    /*
     * "Nahrungsergänzung kann helfen" waere die naheliegende Formulierung und
     * genau die unspezifische Gesundheitsaussage, die diese Seite nirgends
     * macht. Ein Hinweis, der eine Erwartung aufbaut, ist keiner.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    const hinweis = screen.getByText(/kein Ersatz für eine ausgewogene/);
    expect(hinweis.textContent?.toLowerCase()).not.toMatch(/helfen|helfe|hilf/);
  });
});

describe("Empfehlungen — was NICHT dastehen darf", () => {
  test("macht keine Wirkaussage", () => {
    /*
     * Die Seite begruendet sich mit Messwerten. Ein Satz darueber, dass etwas
     * wirkt oder wogegen es hilft, waere eine Gesundheitsaussage, und die
     * braucht eine Freigabe, die es nicht gibt.
     */
    const { container } = render(
      <RecommendationBoard supplements={mockSupplements} />,
    );
    const text = container.textContent ?? "";

    for (const phrase of [
      "wirkt",
      "hilft",
      "unterstützt",
      "verbessert",
      "gegen ",
      "beugt",
    ]) {
      expect(text.toLowerCase()).not.toContain(phrase);
    }
  });

  test("faerbt die Empfehlungsstaerke nicht ein", () => {
    /*
     * Gruen, Bernstein und Rot beantworten im Produkt "wo steht dieser
     * Messwert". Eine eingefaerbte Empfehlungsstaerke saehe aus wie ein Befund
     * — "Optional" in Bernstein liest sich als Warnung und bedeutet das
     * Gegenteil.
     */
    const { container } = render(
      <RecommendationBoard supplements={mockSupplements} />,
    );

    const statusfarbe =
      /(text|bg|border|ring)-(success|warning|critical|destructive)/;

    for (const heading of screen.getAllByRole("heading", { level: 2 })) {
      expect(heading.className).not.toMatch(statusfarbe);
    }
    for (const mark of container.querySelectorAll("li span")) {
      expect(mark.className).not.toMatch(statusfarbe);
    }
  });
});
