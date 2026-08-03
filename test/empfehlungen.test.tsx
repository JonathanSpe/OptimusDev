import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { RailPlacementProvider } from "@/components/common/rail-placement";
import type { Supplement } from "@/contracts";
import { mockSupplements } from "@/data/mock";
import {
  RailCartSlot,
  RecommendationBoard,
  toBarValue,
  toBiomarkerReading,
  toDropReason,
  toEuroDelta,
  toEvaluationSummary,
  toEvidence,
  toInterpretation,
  toReasonDetails,
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
    .map((h) => h.textContent?.trim() ?? "");
}

function abschnitt(titel: string): HTMLElement {
  const region = screen
    .getAllByRole("region")
    .find((r) => r.textContent?.startsWith(titel));
  expect(region).toBeDefined();
  return region!;
}

/** Die Liste in ihrer Standardansicht zeigt keine Schalter — erst dieser Klick. */
async function anpassen(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Zeile für Zeile anpassen" }),
  );
}

/*
 * Die drei Abschnitte tragen ihre BEGRUENDUNG in der Ueberschrift — deshalb
 * braucht keine Zeile darin ein Status-Abzeichen. Die Achse dahinter ist
 * unveraendert die Empfehlungsstaerke.
 */
const KERN = "Basierend auf deinen Blutwerten";
const OPTIONAL = "Optionale Ergänzungen";
const WEG = "Fällt weg";

describe("Empfehlungen — die Gliederung", () => {
  test("gliedert nach Empfehlungsstaerke und nicht nach dem Abo", () => {
    /*
     * DIE WICHTIGSTE ZUSICHERUNG DER SEITE. Ein Abschnitt "Weiter nehmen"
     * waere die Verschmelzung beider Achsen, und man merkt den Fehler erst am
     * Erstbesuch: die Seite saehe dann bei leerem Abo voellig anders aus.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(ueberschriften()).toEqual([KERN, OPTIONAL, WEG]);
  });

  test("gibt auch dem letzten Abschnitt seine Ueberschrift", () => {
    /*
     * ⚠️ DER FEHLER, DEN DAS VERHINDERT: die klebende Zusammenfassungsleiste am
     * Fuss der Liste (lg:sticky, z-10) lag ueber der Ueberschrift von "Fällt
     * weg" — im Dokument stand sie darunter, auf dem Schirm davor. Omega-3 hing
     * damit ohne Ueberschrift unter einem Preisblock. Die Leiste ist ausgebaut;
     * dieser Test haelt fest, dass die Ueberschrift zum Abschnitt gehoert.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    const weg = abschnitt(WEG);
    expect(
      within(weg).getByRole("heading", { level: 2, name: WEG }),
    ).toBeInTheDocument();
    expect(within(weg).getByText("Omega-3 (EPA/DHA)")).toBeInTheDocument();
  });

  test("behaelt die Gliederung beim Erstbesuch mit leerem Abo", () => {
    /*
     * Identische Reihenfolge, identische Ueberschriften — nur "Fällt weg"
     * faellt weg, und zwar zwangslaeufig: man kann nichts absetzen, was nicht
     * laeuft.
     */
    render(<RecommendationBoard supplements={ohneAbo} />);

    expect(ueberschriften()).toEqual([KERN, OPTIONAL]);
  });

  test("zaehlt neben der Ueberschrift nicht mit", () => {
    /*
     * Die Ziffer zaehlte, was direkt darunter steht, und teilte sich die Zeile
     * mit der Aussage des Abschnitts.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    for (const titel of ueberschriften()) {
      expect(titel).not.toMatch(/\d/);
    }
  });

  test("laesst dieselbe Abo-Zugehoerigkeit in jedem Abschnitt zu", async () => {
    /*
     * Ashwagandha laeuft und steht unter "Optionale Ergänzungen" — waere die
     * Abo-Zugehoerigkeit die Gliederung, koennte es dort nicht stehen. Die Marke
     * "im Abo" an der Zeile ist weg (sie beschrieb den Normalfall), der Stand
     * steht in der Stellung des Schalters.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    const optional = abschnitt(OPTIONAL);
    expect(within(optional).getByText("Ashwagandha")).toBeInTheDocument();
    expect(
      within(optional).getByRole("switch", { name: "Im Abo: Ashwagandha" }),
    ).toBeChecked();
  });

  test("nennt die Herkunft der optionalen Ergaenzungen unter der Ueberschrift", () => {
    /*
     * Der Satz gilt fuer alle Zeilen des Abschnitts und steht deshalb EINMAL
     * darunter und nicht in jeder Zeile. Er nennt die QUELLE und kein Thema —
     * "aus deinen Angaben zu Schlaf" waere die Wirkaussage.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(
      screen.getByText(
        /Nicht aus einem Blutwert abgeleitet, sondern aus deinen Angaben im Fragebogen/,
      ),
    ).toBeInTheDocument();
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
     * Ohne Messwert erklaert die Zeile, WOHER die Empfehlung kommt. Was
     * weiterhin nicht dastehen darf, ist ein THEMA ("Schlaf") — das waere die
     * Wirkaussage.
     */
    const ashwagandha = mockSupplements.find((p) => p.id === "ashwagandha");
    expect(toRecommendationStrength(ashwagandha!)).toBe("optional");
    expect(toEvidence(ashwagandha!).text).toBe(
      "aus deinem Fragebogen, nicht aus einem Blutwert",
    );
  });

  test("nennt bei einer noch nicht genommenen Empfehlung den Ansatzpunkt", () => {
    const zink = mockSupplements.find((p) => p.id === "zink");
    expect(toEvidence(zink!).text).toBe(
      "Ansatzpunkt aus deinem Test: Zink (Serum)",
    );
  });
});

describe("Empfehlungen — die Schiene am Zielmarker", () => {
  /*
   * Die Schiene ist die Begruendung der Zeile, als Lage statt als Satz. Sie
   * darf nichts behaupten, was nicht gemessen ist — deshalb hat jeder Fall
   * seinen eigenen Zustand, und deshalb gibt es FUENF und nicht vier.
   */
  function lage(id: string) {
    const prep = mockSupplements.find((p) => p.id === id);
    return toBiomarkerReading(prep!);
  }

  test("nennt den Zielbereich erreicht, wenn der Wert darin liegt", () => {
    /* Vitamin D 44 bei Ziel 40–60. */
    expect(lage("vit-d3")?.state).toBe("improved");
  });

  test("unterscheidet 'bewegt' von 'Ziel erreicht'", () => {
    /*
     * DER FALL, DER DEN FUENFTEN ZUSTAND RECHTFERTIGT. Ferritin 41 → 68 bei
     * Ziel 70–150: der Wert hat sich deutlich bewegt und liegt trotzdem
     * darunter. "improved" waere die Behauptung, das Ziel sei erreicht;
     * "flat" die Behauptung, es habe sich nichts bewegt. Beide waeren falsch.
     *
     * Es ist ausserdem die Probe darauf, dass der ZIELBEREICH und nicht der
     * Referenzbereich zaehlt: im Referenzbereich (30–300) liegt 68 laengst.
     */
    const eisen = lage("eisen");
    expect(eisen?.state).toBe("moving");
    expect(eisen?.range).toEqual({ min: 70, max: 150 });
  });

  test("sagt in Worten dasselbe, was der Punkt zeigt", () => {
    /*
     * ⚠️ DER WIDERSPRUCH, DEN DAS VERHINDERT. Ferritin 68 bei Ziel ab 70: der
     * Satz sagte "noch unter dem Zielbereich", und der Punkt sah aus, als laege
     * er darin — zwei Einheiten Achse sind schmaler als der Punkt selbst. Beide
     * Darstellungen haengen jetzt an derselben Rechnung: "improved" heisst genau
     * "im Zielbereich", der gefuellte Punkt steht dafuer, und der Satz sagt es.
     */
    const eisen = lage("eisen")!;
    expect(eisen.state).not.toBe("improved");
    expect(toInterpretation(eisen)).toMatch(/noch unter dem Zielbereich/);

    const vitD = lage("vit-d3")!;
    expect(vitD.state).toBe("improved");
    expect(toInterpretation(vitD)).toMatch(/liegt damit im Zielbereich/);
  });

  test("nennt einen unveraenderten Wert unveraendert", () => {
    /* Triglyceride 148 → 148. Der Punkt liegt auf dem Startstrich. */
    expect(lage("omega-3")?.state).toBe("flat");
  });

  test("wartet ab, solange es kein Wertepaar gibt", () => {
    /* Magnesium laeuft 28 Tage, beurteilbar ab Tag 42. */
    const magnesium = lage("magnesium");
    expect(magnesium?.state).toBe("pending");
    expect(magnesium?.current).toBeNull();
    expect(magnesium?.assessableFrom).toBe("04.08.2026");
  });

  test("schreibt statt eines Gedankenstrichs, was fehlt", () => {
    /*
     * "—" sieht aus wie ein fehlender Wert, also wie ein Fehler. Es gibt aber
     * zwei verschiedene, normale Gruende, warum hier keine Zahl steht.
     */
    expect(toBarValue(lage("magnesium")!)).toBe("Wird gemessen");
    expect(toBarValue(lage("zink")!)).toBe("Erstmessung ausstehend");
    expect(toBarValue(lage("vit-d3")!)).toBe("44 ng/ml");
  });

  test("zeichnet ohne Einnahme keinen Startwert", () => {
    /*
     * Zink ist ein Ansatzpunkt aus dem Test: es ist nichts gestartet, also gibt
     * es keinen Startwert-Strich und keinen Punkt. Eine 0 an ihrer Stelle waere
     * ein gezeichneter Messwert, den niemand gemessen hat.
     */
    const zink = lage("zink");
    expect(zink?.state).toBe("starting");
    expect(zink?.baseline).toBeNull();
    expect(zink?.current).toBeNull();
  });

  test("zeichnet keine Schiene, wo es keinen Zielmarker gibt", () => {
    /*
     * Der Randfall aus dem Entwurf: eine leere Schiene ist eine Grafik ohne
     * Daten. Die Zeile faellt dann auf den Satz aus toEvidence zurueck.
     */
    expect(lage("ashwagandha")).toBeNull();
    expect(lage("kreatin")).toBeNull();
  });

  test("stellt den vollstaendigen Wert auch als Text bereit", () => {
    /*
     * Die Grafik ist aria-hidden. Waere sie die einzige Quelle, waere der
     * wichtigste Teil der Zeile fuer Screenreader nicht vorhanden.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(
      screen.getByText(
        /25-OH-Vitamin-D: von 17 auf 44 ng\/ml\. Zielbereich 40 bis 60 ng\/ml\./,
      ),
    ).toBeInTheDocument();
  });
});

describe("Empfehlungen — die Begruendung in der Zeile", () => {
  /*
   * Die Seite sah aus wie eine Empfehlung ohne Begruendung: Messwerte und ein
   * grauer Chevron, der eine Detailansicht versprach, die es nicht gibt.
   */
  function zeile(name: string): HTMLElement {
    const button = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.startsWith(name));
    expect(button).toBeDefined();
    return button!;
  }

  test("klappt die erste Zeile beim Aufschlagen auf", () => {
    /*
     * Eine Liste, in der jede Begruendung zugeklappt ist, sieht aus wie eine
     * Liste ohne Begruendung — und genau das war der Anlass.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(zeile("Vitamin D3")).toHaveAttribute("aria-expanded", "true");
    expect(zeile("Eisenbisglycinat")).toHaveAttribute("aria-expanded", "false");
  });

  test("klappt eine Zeile auf und wieder zu, ohne zu navigieren", async () => {
    const user = userEvent.setup();
    render(<RecommendationBoard supplements={mockSupplements} />);

    await user.click(zeile("Eisenbisglycinat"));
    expect(zeile("Eisenbisglycinat")).toHaveAttribute("aria-expanded", "true");

    /* Die zuerst offene Zeile bleibt offen: es sind Begruendungen, die man
     * vergleicht. Ein Akkordeon machte das unmoeglich. */
    expect(zeile("Vitamin D3")).toHaveAttribute("aria-expanded", "true");

    await user.click(zeile("Eisenbisglycinat"));
    expect(zeile("Eisenbisglycinat")).toHaveAttribute("aria-expanded", "false");
  });

  test("zeigt im Aufgeklappten Messwert, Verlauf, Dosis und Quelle", async () => {
    const user = userEvent.setup();
    render(<RecommendationBoard supplements={mockSupplements} />);

    await user.click(zeile("Eisenbisglycinat"));

    /* In DIESER Zeile, nicht irgendwo auf der Seite: die erste Zeile steht
     * schon offen, und beide Tafeln tragen dieselben Feldnamen. */
    const eisen = zeile("Eisenbisglycinat").closest("li")!;

    expect(within(eisen).getByText("Messwert")).toBeInTheDocument();
    expect(
      within(eisen).getByText(/68 ng\/ml · Zielbereich 70–150 ng\/ml/),
    ).toBeInTheDocument();
    expect(within(eisen).getByText("Verlauf")).toBeInTheDocument();
    expect(within(eisen).getByText("Quelle")).toBeInTheDocument();
    expect(
      within(eisen).getByText(/Blutwert aus deinem Test vom 21\.07\.2026/),
    ).toBeInTheDocument();
  });

  test("laesst fehlende Felder weg, statt sie leer zu rendern", () => {
    /*
     * ⚠️ Magnesium hat noch keinen zweiten Messwert: es gibt keinen Verlauf, und
     * eine Zeile "Verlauf: —" waere keine Auskunft, sondern der Hinweis, dass wir
     * eine Zeile ohne Daten gebaut haben.
     */
    const magnesium = mockSupplements.find((p) => p.id === "magnesium");
    const felder = toReasonDetails(magnesium!).map((d) => d.label);

    expect(felder).not.toContain("Verlauf");
    expect(felder).toContain("Messwert");
    expect(felder).toContain("Nächste Beurteilung");

    /* Ohne Zielmarker faellt auch der Messwert weg — Kreatin hat keinen. */
    const kreatin = mockSupplements.find((p) => p.id === "kreatin");
    const ohneMarker = toReasonDetails(kreatin!).map((d) => d.label);
    expect(ohneMarker).not.toContain("Messwert");
    expect(ohneMarker).toContain("Quelle");
  });

  test("traegt den Zugang zur Begruendung an jeder Zeile", () => {
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(zeile("Vitamin D3")).toHaveAccessibleName(/Begründung/);
    expect(zeile("Kreatin-Monohydrat")).toHaveAccessibleName(/Begründung/);
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

describe("Empfehlungen — der Kopf der Seite", () => {
  test("nennt das Ergebnis des Tests und keinen Preis", () => {
    /*
     * Vitamin D 17 → 44 (Abstand 23 → 0) und Ferritin 41 → 68 (29 → 2) von drei
     * verglichenen Werten; Triglyceride liegen flach (58 → 58). Magnesium hat
     * noch keinen zweiten Wert und zaehlt deshalb nicht mit — "3 von 4" waere die
     * Behauptung, wir haetten dort gemessen.
     */
    const summary = toEvaluationSummary(mockSupplements);

    expect(summary.compared).toBe(3);
    expect(summary.closer).toBe(2);
    expect(summary.inTarget).toEqual(["25-OH-Vitamin-D"]);
    expect(summary.newStarts).toBe(2);
  });

  test("zaehlt nur, was dem Zielbereich naeher gekommen ist", () => {
    /*
     * ⚠️ DIE SCHLAGZEILE IST WOERTLICH ZU NEHMEN, und deshalb rechnet sie den
     * ABSTAND und nicht die Richtung: ein Wert, der ueber sein Ziel
     * hinausgeschossen ist, hat sich in die erwuenschte Richtung bewegt und liegt
     * trotzdem WEITER weg als vorher. Vitamin D 44 → 95 bei Ziel 40–60.
     */
    const ueberschossen: readonly Supplement[] = mockSupplements.map((prep) =>
      prep.id === "vit-d3" && prep.intake !== null
        ? { ...prep, intake: { ...prep.intake, baseline: 44, current: 95 } }
        : prep,
    );

    const summary = toEvaluationSummary(ueberschossen);
    expect(summary.compared).toBe(3);
    expect(summary.closer).toBe(1);
    expect(summary.inTarget).toEqual([]);
  });

  test("faellt ohne Vortest auf die Ansatzpunkte zurueck", () => {
    /* Erstbesuch: kein Wertepaar an irgendeinem Marker, also keine Bewegung. */
    const summary = toEvaluationSummary(ohneAbo);

    expect(summary.hasPreviousTest).toBe(false);
    expect(summary.compared).toBe(0);

    render(<RecommendationBoard supplements={ohneAbo} />);
    expect(
      screen.getByText(/Ansatzpunkte in deinen Werten gefunden/),
    ).toBeInTheDocument();
  });

  test("haengt nicht am Warenkorb", async () => {
    /*
     * Die Zahlen des Kopfes sind das Ergebnis einer MESSUNG. Ein Schalter in der
     * Liste aendert keinen Blutwert — vorher stand hier eine Anzahl und ein
     * Preis, und beide sprangen bei jedem Klick.
     */
    const user = userEvent.setup();
    render(<RecommendationBoard supplements={mockSupplements} />);

    const kopf = screen.getByRole("region", { name: "Ergebnis deines Tests" });
    const vorher = kopf.textContent;

    await user.click(
      screen.getByRole("switch", { name: "Im Abo: Kreatin-Monohydrat" }),
    );

    expect(kopf.textContent).toBe(vorher);
  });

  test("zeigt einen Leerzustand mit Verweis auf den naechsten Test", () => {
    /*
     * Der Randfall: keine Werte, keine Ansatzpunkte. Dann darf hier keine 0
     * stehen — eine 0 waere ein Befund ohne Grundlage.
     */
    render(<RecommendationBoard supplements={[]} />);

    expect(
      screen.getByText(/Beim nächsten Test schauen wir erneut/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sobald ein Wert einen Ansatzpunkt zeigt/),
    ).toBeInTheDocument();
  });
});

describe("Empfehlungen — der Vorschlag", () => {
  /*
   * Der Korb steht beim Aufschlagen auf dem Vorschlag aus der Auswertung. Das
   * ist bequem und zugleich die heikelste Stelle der Seite: ein vorbefuellter
   * Korb, der sich nicht als Vorschlag zu erkennen gibt oder sich nicht
   * zeilenweise umdrehen laesst, waere ein untergeschobener Korb.
   */
  test("merkt das Messbare an und traegt Gestopptes aus", () => {
    const vorschlag = toRecommendedChanges(mockSupplements);

    /* Nicht mehr empfohlen und laufend → raus. */
    expect(vorschlag.get("omega-3")).toBe("entfernen");
    /* Empfohlen und nicht im Abo → rein. */
    expect(vorschlag.get("zink")).toBe("hinzufuegen");
    expect(vorschlag.get("b12")).toBe("hinzufuegen");
    /* Was laeuft und weiter empfohlen ist, braucht keine Vormerkung. */
    expect(vorschlag.has("vit-d3")).toBe(false);
  });

  test("schlaegt keine optionale Ergaenzung vor", () => {
    /*
     * "Optional" heisst in diesem Produkt, dass die Auswertung NICHTS dazu
     * sagen kann. Etwas vorzuschlagen, worueber wir nichts wissen, waere ein
     * Vorschlag des Geschaefts im Gewand eines Befunds. Sie sind deshalb
     * opt-in.
     */
    const vorschlag = toRecommendedChanges(mockSupplements);

    expect(vorschlag.has("kreatin")).toBe(false);
    /* Und Opt-in gilt nicht GEGEN den Bestand: was laeuft, laeuft weiter. */
    expect(vorschlag.has("ashwagandha")).toBe(false);
  });

  test("haelt den Schalter einer optionalen Ergaenzung offen sichtbar", () => {
    /*
     * ⚠️ HIER GILT DER MODUS NICHT. Der Schalter ist der einzige Weg, eine
     * optionale Ergaenzung ueberhaupt aufzunehmen — hinter einem Modus versteckt,
     * waere ein Opt-in kein Angebot mehr, sondern ein Geheimnis.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    const kreatin = screen.getByRole("switch", {
      name: "Im Abo: Kreatin-Monohydrat",
    });
    expect(kreatin).not.toBeChecked();
    expect(screen.getByRole("heading", { name: OPTIONAL })).toBeInTheDocument();
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

  test("laesst jede vorgeschlagene Zeile im Anpassen-Modus zurueckdrehen", async () => {
    /*
     * Die zweite Bedingung dafuer, dass ein vorbefuellter Korb sauber bleibt:
     * Zink ist vorgemerkt, ohne dass jemand es angefasst hat, und muss
     * auszutragen sein.
     *
     * ⚠️ SEIT DIE SCHALTER IM MODUS STEHEN, IST ES EIN KLICK MEHR. Ausgeglichen
     * wird das dadurch, dass der Umschalter neben der ersten Ueberschrift steht
     * — sichtbar, ohne zu scrollen. Wer ihn versteckt, nimmt den Ausgleich weg.
     */
    const user = userEvent.setup();
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(
      screen.queryByRole("switch", { name: "Im Abo: Zinkbisglycinat" }),
    ).toBeNull();

    await anpassen(user);

    const zink = screen.getByRole("switch", {
      name: "Im Abo: Zinkbisglycinat",
    });
    expect(zink).toBeChecked();

    await user.click(zink);

    expect(
      screen.getByRole("switch", { name: "Im Abo: Zinkbisglycinat" }),
    ).not.toBeChecked();
  });
});

describe("Empfehlungen — die Leseansicht", () => {
  test("zeigt in der Standardansicht keine Schalter des Kernstacks", () => {
    /*
     * Sie standen an jeder Zeile und waren fast alle an: acht gleiche Schalter
     * in derselben Stellung tragen keine Information. Sichtbar bleiben die der
     * optionalen Ergaenzungen — dort ist der Schalter das Angebot.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    const kern = abschnitt(KERN);
    expect(within(kern).queryAllByRole("switch")).toHaveLength(0);

    const optional = abschnitt(OPTIONAL);
    expect(within(optional).getAllByRole("switch")).toHaveLength(2);
  });

  test("blendet die Schalter des Kernstacks auf Wunsch ein", async () => {
    const user = userEvent.setup();
    render(<RecommendationBoard supplements={mockSupplements} />);

    await anpassen(user);

    const kern = abschnitt(KERN);
    expect(within(kern).getAllByRole("switch").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Fertig" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("haelt eine entfernte Position sichtbar und rueckholbar", async () => {
    const user = userEvent.setup();
    render(<RecommendationBoard supplements={mockSupplements} />);

    await anpassen(user);
    await user.click(
      screen.getByRole("switch", { name: "Im Abo: Vitamin D3" }),
    );

    /* Sie bleibt in der Liste stehen — nur ihr Stand hat sich geaendert. */
    expect(screen.getByText("Vitamin D3")).toBeInTheDocument();
    expect(screen.getAllByText("wird entfernt").length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("switch", { name: "Im Abo: Vitamin D3" }),
    );

    expect(
      screen.getByRole("switch", { name: "Im Abo: Vitamin D3" }),
    ).toBeChecked();
    expect(screen.queryByText("wird entfernt")).not.toBeInTheDocument();
  });

  test("markiert genau die Zeilen, die dazukommen", () => {
    /*
     * Die Marke sagt es mit einem WORT. Sie war zusaetzlich eine markenrote
     * Flaeche ueber die ganze Zeile — direkt neben der markenroten Bestaetigung
     * im Korb, und damit war die groesste Flaeche der Seite dieselbe Farbe wie
     * ihre wichtigste Handlung.
     */
    const { container } = render(
      <RecommendationBoard supplements={mockSupplements} />,
    );

    /* Zink und B12 kommen dazu. Vitamin D3 laeuft und ist keine Aenderung. */
    expect(screen.getAllByText("neu")).toHaveLength(2);

    for (const row of container.querySelectorAll("li")) {
      expect(row.className).not.toMatch(/bg-(brand|primary)/);
    }
  });
});

describe("Empfehlungen — was in dieser Spalte NICHT steht", () => {
  test("nennt in der ganzen Liste keinen Betrag", () => {
    /*
     * ⚠️ DIE REGEL DIESER SEITE. Links ist eine Auswertung: sie beantwortet
     * "was habe ich, was aendert sich, warum". Geld beantwortet keine dieser
     * Fragen. Betraege, Bilanz und Bestaetigung stehen im Warenkorb, und der ist
     * die EINE kommerzielle Flaeche — deshalb steht hier nicht einmal ein
     * kleiner grauer Preis in der Zeile oder ein Minusbetrag bei einem Abgang.
     */
    const { container } = render(
      <RecommendationBoard supplements={mockSupplements} />,
    );

    expect(container.textContent).not.toContain("€");
    expect(container.textContent).not.toContain("im Monat");
  });

  test("macht keine Wirkaussage", () => {
    /*
     * Die Seite begruendet sich mit Messwerten. Ein Satz darueber, dass etwas
     * wirkt oder wogegen es hilft, waere eine Gesundheitsaussage, und die
     * braucht eine Freigabe, die es nicht gibt. Auch die VERNEINUNG zaehlt:
     * "kein messbarer Effekt" im Abschnitt "Fällt weg" waere eine.
     */
    const { container } = render(
      <RecommendationBoard supplements={mockSupplements} />,
    );
    const text = container.textContent ?? "";

    for (const phrase of [
      "wirkt",
      "hilft",
      "unterstützt",
      "gegen ",
      "beugt",
      "effekt",
    ]) {
      expect(text.toLowerCase()).not.toContain(phrase);
    }
  });

  test("sagt nirgends, ein Praeparat habe etwas verbessert", async () => {
    /*
     * ⚠️ DIE FEINE GRENZE, und sie laeuft zwischen Kopf und Zeile. Der Kopf
     * spricht ueber MESSWERTE und darf das — er sagt heute die nachrechenbare
     * Fassung ("liegen näher am Zielbereich"), weil "verbessert" fachlich noch
     * nicht freigegeben ist. In einer ZEILE, direkt neben einem Produktnamen,
     * waere dasselbe Wort die Behauptung, DIESES Praeparat habe den Wert
     * verbessert — und das bleibt verboten, auch wenn die Kopfzeile es einmal
     * sagen darf.
     */
    const user = userEvent.setup();
    const { container } = render(
      <RecommendationBoard supplements={mockSupplements} />,
    );

    /* Auch im Aufgeklappten, wo am meisten Platz fuer einen Satz zu viel ist. */
    await user.click(
      screen
        .getAllByRole("button")
        .find((b) => b.textContent?.startsWith("Eisenbisglycinat"))!,
    );

    for (const row of container.querySelectorAll("li")) {
      expect(row.textContent?.toLowerCase()).not.toContain("verbesser");
    }
    /* Solange die Freigabe fehlt, auch nicht im Kopf. */
    expect(container.textContent?.toLowerCase()).not.toContain("verbesser");
  });

  test("faerbt weder Empfehlungsstaerke noch Schiene ein", () => {
    /*
     * Gruen, Bernstein und Rot beantworten im Produkt "wo steht dieser
     * Messwert". Eine eingefaerbte Empfehlungsstaerke saehe aus wie ein Befund
     * — "Optional" in Bernstein liest sich als Warnung und bedeutet das
     * Gegenteil.
     *
     * ⚠️ DIE SCHIENE IST DIE GEFAHRENSTELLE. Sie zeichnet Messwerte und waere
     * der naechstliegende Ort fuer eine Ampel; sie arbeitet stattdessen mit
     * Lage. Geprueft werden deshalb ALLE Spans der Liste, auch die der Schiene.
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

describe("Empfehlungen — der Abschnitt 'Fällt weg'", () => {
  test("begruendet den Abgang mit der Messung", () => {
    /*
     * Statt einer durchgestrichenen Zahl ein Satz. ⚠️ Und zwar ueber die
     * MESSUNG: "kein messbarer Effekt" waere eine Wirkaussage mit einem "kein"
     * davor, und die Seite sagt ueber Wirkung nichts — in keine Richtung.
     */
    const omega = mockSupplements.find((p) => p.id === "omega-3");

    expect(toDropReason(omega!)).toBe(
      "Triglyceride seit Start unverändert bei 148 mg/dl — keine messbare Veränderung.",
    );
  });

  test("nennt den wegfallenden Betrag nicht", () => {
    /*
     * Der Minusbetrag stand hier und war das einzige Geld in der linken Spalte —
     * damit las sich der Abgang als Ersparnis und nicht als Ergebnis der
     * Messung. Was eine Aenderung kostet, rechnet der Korb, und zwar vollstaendig.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    const weg = abschnitt(WEG);
    expect(weg.textContent).not.toContain("€");
    expect(
      within(weg).getByRole("button", {
        name: "Trotzdem behalten: Omega-3 (EPA/DHA)",
      }),
    ).toBeInTheDocument();
  });

  test("verschwindet ganz, wenn nichts wegfaellt", () => {
    /*
     * Keine leere Ueberschrift: "Fällt weg" ohne Inhalt waere beim Erstbesuch
     * eine Warnung ohne Anlass.
     */
    render(<RecommendationBoard supplements={ohneAbo} />);

    expect(screen.queryByText(WEG)).not.toBeInTheDocument();
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
    /* Zink und B12 — Kreatin ist opt-in und liegt nicht im Vorschlag. */
    expect(within(korb()).getAllByText("kommt dazu").length).toBe(2);
    expect(within(korb()).getByText("wird entfernt")).toBeInTheDocument();
  });

  test("traegt die Betraege und die Bestaetigung allein", async () => {
    /*
     * ⚠️ DIE ZUSICHERUNG DIESER RUNDE. Der Korb ist die EINE kommerzielle
     * Flaeche: er allein nennt Summen, Differenz und "Änderungen übernehmen".
     * Es gab eine Zusammenfassungsleiste am Fuss der Liste, die dasselbe sagte —
     * damit stand die Kasse mitten in der Auswertung, und zwei
     * "Änderungen übernehmen" in einem Dokument sind eines zu viel.
     */
    renderMitLeiste(mockSupplements);

    expect(
      screen.getAllByRole("button", { name: "Änderungen übernehmen" }),
    ).toHaveLength(1);
    expect(
      within(korb()).getByRole("button", { name: "Änderungen übernehmen" }),
    ).toBeInTheDocument();

    /* Die Bewegung am Preis steht im Korb — und nur dort. */
    expect(within(korb()).getAllByText(/im Monat/).length).toBeGreaterThan(0);
    const listen = screen.getAllByRole("region");
    for (const region of listen) {
      if (region.textContent?.startsWith("Warenkorb")) continue;
      expect(region.textContent).not.toContain("€");
    }
  });

  test("verlangt fuer eine Kuendigung eine zweite Stufe, die sie benennt", async () => {
    /*
     * Absetzen ist eine Kuendigung. Sie darf nicht mit demselben Klick
     * passieren wie eine Bestellung, und die Rueckfrage muss sagen, WAS
     * abgesetzt wird — "2 Positionen" ist keine Information.
     */
    const user = userEvent.setup();
    renderMitLeiste(mockSupplements);

    await user.click(
      within(korb()).getByRole("button", { name: "Änderungen übernehmen" }),
    );

    expect(
      within(korb()).getByText(/Ein Präparat wird abgesetzt/),
    ).toBeInTheDocument();
    expect(
      within(korb()).getByText(/Omega-3 \(EPA\/DHA\) —/),
    ).toBeInTheDocument();
    expect(
      within(korb()).getByRole("button", { name: "Absetzen und bestätigen" }),
    ).toBeInTheDocument();
  });

  test("laesst eine reine Bestellung ohne zweite Stufe durch", async () => {
    const user = userEvent.setup();
    renderMitLeiste(mockSupplements);

    /* Den einzigen Abgang des Vorschlags zurueckdrehen — dann bleiben nur
     * Zugaenge, und die sind eine Bestellung. */
    await user.click(
      screen.getByRole("button", {
        name: "Trotzdem behalten: Omega-3 (EPA/DHA)",
      }),
    );
    await user.click(
      within(korb()).getByRole("button", { name: "Änderungen übernehmen" }),
    );

    await waitFor(() =>
      expect(
        within(korb()).getByText("Keine Änderung vorgemerkt."),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText(/wird abgesetzt/)).not.toBeInTheDocument();
  });

  test("fuehrt zur Abo-Verwaltung", () => {
    renderMitLeiste(mockSupplements);

    expect(
      within(korb()).getByRole("button", { name: "Abo verwalten" }),
    ).toBeInTheDocument();
  });

  test("behaelt die Gliederung beim Erstbesuch mit leerem Abo", () => {
    renderMitLeiste(ohneAbo);

    /* Ohne die Korb-Kachel, deren Platz in der Leiste hier nicht zur Debatte
     * steht — geprueft wird die Gliederung der SEITE. */
    expect(ueberschriften().filter((t) => t !== "Warenkorb")).toEqual([
      KERN,
      OPTIONAL,
    ]);
    expect(within(korb()).getByText("Vitamin D3")).toBeInTheDocument();
    expect(within(korb()).queryByText("wird entfernt")).not.toBeInTheDocument();
  });
});

describe("Empfehlungen — die Bestaetigung auf schmalen Schirmen", () => {
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
     * ⚠️ UND DAMIT GIBT ES HIER KEINE BESTAETIGUNG. Das ist die Folge der Regel
     * "nur eine kommerzielle Flaeche" und kein Versehen: solange die Schublade
     * zu ist, fuehrt der Weg zur Summe ueber den Leisten-Knopf in der Kopfzeile.
     * Vorher stand am Fuss der Liste eine Ersatzleiste — sie ist ausgebaut, weil
     * sie die Kasse in die Auswertung holte.
     */
    rendern("column");

    expect(screen.queryByRole("heading", { name: "Warenkorb" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Änderungen übernehmen" }),
    ).toBeNull();
  });

  test("bestaetigt in der geoeffneten Schublade", () => {
    /* Die Schublade gibt es nur geoeffnet — dort ist vorhanden gleich
     * sichtbar, und der Korb gehoert hinein. */
    rendern("drawer");

    expect(
      screen.getByRole("heading", { name: "Warenkorb" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Änderungen übernehmen" }),
    ).toHaveLength(1);
  });
});

describe("Empfehlungen — der rechtliche Hinweis", () => {
  function hinweis(): HTMLElement {
    return screen.getByText(
      /kein Ersatz für eine ausgewogene, abwechslungsreiche Ernährung/,
    );
  }

  test("sagt, dass Ergänzung nichts ersetzt und die Empfehlung ohne Gewähr gilt", () => {
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(hinweis()).toHaveTextContent(/ohne Gewähr/);
    expect(hinweis()).toHaveTextContent(/ärztliche Diagnose oder Behandlung/);
  });

  test("bleibt zugeklappt sichtbar und auffindbar", () => {
    /*
     * ⚠️ EIN PFLICHTHINWEIS DARF NICHT AUF EINE KLAPPE ZUSAMMENSCHRUMPFEN. Die
     * Kurzform steht deshalb offen da, und der volle Text bleibt im Dokument
     * (hiddenUntilFound), damit die Seitensuche des Browsers ihn findet.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(
      screen.getByText(
        /^Nahrungsergänzungsmittel sind kein Ersatz für eine ausgewogene Ernährung\.$/,
      ),
    ).toBeInTheDocument();
    expect(hinweis()).toBeInTheDocument();
  });

  test("nimmt den Hinweis nicht zum Anlass für eine Wirkaussage", () => {
    /*
     * "Nahrungsergänzung kann helfen" waere die naheliegende Formulierung und
     * genau die unspezifische Gesundheitsaussage, die diese Seite nirgends
     * macht. Ein Hinweis, der eine Erwartung aufbaut, ist keiner.
     */
    render(<RecommendationBoard supplements={mockSupplements} />);

    expect(hinweis().textContent?.toLowerCase()).not.toMatch(
      /helfen|helfe|hilf/,
    );
  });
});
