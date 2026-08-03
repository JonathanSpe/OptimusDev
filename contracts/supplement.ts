import { z } from "zod";

/*
 * ============================================================================
 * ⚠️  WIRKFENSTER, SCHWELLEN UND PREISE SIND PLATZHALTER.
 * ============================================================================
 * Dieses Modul beschreibt die FORM der Praeparate-Daten, nicht deren Inhalt.
 * Wirkfenster und Delta-Schwellen sind Entwurfswerte fuer die Gestaltung und
 * muessen vor jedem Release gegen das Bluttest-Framework abgeglichen und
 * freigegeben werden. Die PREISE sind frei erfunden und haben mit keiner
 * Preisliste zu tun.
 * ============================================================================
 *
 * ⚠️ KEINE WIRKAUSSAGE IM VERTRAG. Hier steht nirgends, wogegen ein Praeparat
 * hilft oder was es bewirkt. Was das Modell kennt, ist ein ZIELMARKER und was
 * an ihm gemessen wurde — mehr traegt es nicht, und mehr darf keine Oberflaeche
 * daraus machen. Ein Feld "Nutzen" oder "hilft bei" gehoert nicht in diesen
 * Vertrag, sondern in eine freigegebene Fachredaktion.
 *
 * ENTSCHEIDUNG: Die Typen kommen aus den Schemata (z.infer), wie bei den
 * Biomarkern. Begruendung siehe contracts/biomarker.ts.
 *
 * ============================================================================
 * PRAEPARAT UND EINNAHME SIND ZWEI DINGE — deshalb zwei Schemata.
 * ============================================================================
 * Das Praeparat gibt es unabhaengig davon, ob jemand es nimmt: es hat einen
 * Namen, einen Preis, einen Zielmarker und ein erwartetes Wirkfenster. Die
 * EINNAHME ist etwas, das dazukommen kann — seit wann, und was der Zielmarker
 * damals und heute sagt.
 *
 * Vorher lagen beide Seiten flach in einem Typ, und `startedOn` war Pflicht.
 * Damit konnte das Modell nur Praeparate beschreiben, die man bereits nimmt —
 * fuer eine Empfehlungsseite waere jedes empfohlene, aber noch nicht
 * eingenommene Praeparat ein Datensatz mit einem erfundenen Einnahmebeginn
 * gewesen. Ein Datum, das nichts bedeutet, ist schlimmer als kein Datum: es
 * rechnet mit.
 */

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Die laufende Einnahme eines Praeparats. null am Praeparat heisst: wird nicht
 * genommen — nicht "seit null Tagen".
 */
export const supplementIntakeSchema = z.object({
  /** Einnahmebeginn als ISO-Datum (YYYY-MM-DD), ohne Zeitzone. */
  startedOn: z
    .string()
    .regex(ISO_DATUM, { error: "Datum muss als YYYY-MM-DD vorliegen." }),
  /** Tage seit Einnahmebeginn zum Bewertungsstichtag. */
  daysOn: z.number().int().nonnegative(),
  /*
   * Der Zielmarker bei Einnahmebeginn und heute, in targetUnit. null heisst:
   * es gibt keinen vergleichbaren Messpunkt (noch keine zweite Messung, oder
   * kein messbarer Marker).
   *
   * Hier stehen die beiden MESSWERTE und nicht ihre Differenz: die Zeile zeigt
   * den Weg ("41 → 68 ng/ml"), und ein zusaetzlich gespeichertes Delta waere
   * eine zweite Quelle fuer dieselbe Aussage — sie koennten auseinanderlaufen.
   * Die Differenz rechnet toObservedChange in features/analysis/rules.ts.
   */
  baseline: z.number().finite().nullable(),
  current: z.number().finite().nullable(),
});

export type SupplementIntake = z.infer<typeof supplementIntakeSchema>;

/** Richtung, in der eine Veraenderung am Zielmarker als erwuenscht gilt. */
export const expectedDirectionSchema = z.enum(["up", "down"]);

export type ExpectedDirection = z.infer<typeof expectedDirectionSchema>;

/**
 * ⚠️ PLATZHALTER UND NICHT KLINISCH FREIGEGEBEN — der Bereich, in dem der
 * Zielmarker stehen soll, in targetUnit.
 *
 * ============================================================================
 * WARUM DIESER BEREICH AM PRAEPARAT STEHT UND NICHT AM MARKER
 * ============================================================================
 * Fachlich gehoert er an den Marker: contracts/biomarker.ts traegt schon
 * referenceLow/High und optionale optimalLow/High, und drei unserer Zielmarker
 * stehen dort auch (25-OH-Vitamin-D, Ferritin, Triglyceride). Die anderen drei
 * — Magnesium (Serum), Zink (Serum), Holo-Transcobalamin — stehen NICHT in der
 * Marker-Liste, und `targetMarker` ist ein Anzeigename und keine Marker-Id: es
 * gibt heute keine Verknuepfung, ueber die eine Oberflaeche vom Praeparat zum
 * Marker kaeme.
 *
 * ENTSCHEIDUNG: der Bereich liegt deshalb am Praeparat, mit den Werten aus der
 * Marker-Liste, wo es sie gibt. Das ist bewusst die kleinere Loesung, und sie
 * ist umkehrbar: wer `targetMarkerId` nachtraegt und die Marker aus data/
 * bezieht, ersetzt dieses Feld durch den Verweis und traegt den Bereich nur
 * noch an einer Stelle. Bis dahin ist es eine ZWEITE Quelle fuer dieselbe
 * Zahl — der eigentliche Grund, es beim naechsten Umbau abzuloesen.
 *
 * ============================================================================
 * ⚠️ WELCHER BEREICH GEMEINT IST: DER OPTIMALBEREICH.
 * ============================================================================
 * Nicht der Referenzbereich des Labors. Ferritin 68 ng/ml liegt im
 * Referenzbereich (30–300) und unter dem Optimalbereich (70–150) — zwei
 * verschiedene Aussagen ueber denselben Messwert, und nur eine davon ist die,
 * auf die sich eine Empfehlung stuetzt. Wo ein Marker keinen Optimalbereich
 * traegt, gilt der Referenzbereich.
 *
 * null heisst: es gibt keinen Zielmarker, also auch keinen Bereich. Die Zeile
 * zeichnet dann keine Schiene.
 */
export const targetRangeSchema = z
  .object({
    min: z.number().finite(),
    max: z.number().finite(),
  })
  .refine((range) => range.max > range.min, {
    error: "Der Zielbereich muss ueber seiner Untergrenze enden.",
  });

export type TargetRange = z.infer<typeof targetRangeSchema>;

/**
 * WORAUS die Empfehlung eines Praeparats hervorgeht: aus einer Messung oder aus
 * den Angaben im Fragebogen.
 *
 * ⚠️ DAS IST HERKUNFT UND KEIN NUTZEN. Erlaubt ist hier, WOHER die Empfehlung
 * stammt. Nicht erlaubt ist, wogegen ein Praeparat helfen soll — ein Wert wie
 * "Schlaf" oder "Stress" waere genau die Wirkaussage, die dieser Vertrag nicht
 * traegt (siehe Kopf der Datei). Deshalb eine Aufzaehlung und KEIN Freitext: in
 * ein Textfeld schreibt die naechste Hand einen Satz.
 *
 * Gebraucht wird das Feld, weil eine Zeile ohne Messwert sich sonst nur mit dem
 * Fehlen begruenden koennte ("kein messbarer Zielmarker") — das nennt ein Feld
 * unseres Modells und erklaert nichts. Die Herkunft erklaert.
 */
export const recommendationBasisSchema = z.enum(["messung", "fragebogen"]);

export type RecommendationBasis = z.infer<typeof recommendationBasisSchema>;

export const supplementSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    /** Dosis als Anzeigetext, z. B. "2 000 IE / Tag". */
    dose: z.string().min(1),
    /*
     * SCHLUESSEL DES PRODUKTFOTOS — nicht der Pfad und nicht das Bild selbst.
     *
     * Vorher stand die Zuordnung Praeparat → Foto als Tabelle in
     * supplement-row.tsx. Die musste jedes Mal angefasst werden, wenn ein
     * Praeparat dazukam, und eine zweite Oberflaeche haette sich entweder
     * dieselbe Tabelle importiert oder eine eigene angelegt. Jetzt sagen die
     * DATEN, welches Bild gilt; die Oberflaechen loesen den Schluessel nur noch
     * ueber lib/supplement-images.ts auf.
     *
     * Kein Pfad und keine URL: die Bilder werden statisch importiert, damit
     * next/image Groesse und Format zur Bauzeit kennt — und damit ausgeschlossen
     * ist, dass hier eines Tages ein fremder Host steht.
     *
     * null heisst: kein eigenes Foto, es gilt das Rueckfallbild.
     */
    imageKey: z.string().min(1).nullable(),
    /**
     * ⚠️ PLATZHALTER — Preis pro Monat in EURO-CENT. Ganzzahlig, weil
     * Gleitkommazahlen sich beim Summieren verrechnen und der Korb genau diese
     * Summe bildet. Die Anzeige formatiert daraus Euro.
     */
    pricePerMonthCents: z.number().int().nonnegative(),
    /**
     * Gehoert das Praeparat zur laufenden Abo-Fassung? Getrennt von `intake`:
     * ein gerade erst aufgenommenes Praeparat ist im Abo, bevor es eine zweite
     * Messung gibt, und was jemand ausserhalb des Abos einnimmt, waere eine
     * Einnahme ohne Abo-Zugehoerigkeit.
     */
    inSubscription: z.boolean(),
    /*
     * Zielmarker, an dem eine Veraenderung abgelesen wird. null heisst: es gibt
     * keinen messbaren Marker in dieser Auswertung — dann gibt es KEIN Urteil.
     */
    targetMarker: z.string().min(1).nullable(),
    /** Einheit des Zielmarkers; leer bei dimensionslosen Groessen. */
    targetUnit: z.string(),
    /**
     * ⚠️ PLATZHALTER — der Zielbereich des Markers, siehe targetRangeSchema.
     * null, wo es keinen Zielmarker gibt.
     */
    targetRange: targetRangeSchema.nullable(),
    /**
     * Woher die Empfehlung kommt. Die Empfehlungsseite macht daraus den Satz,
     * mit dem sich eine Zeile begruendet: gibt es keinen Messwert, ist die
     * Herkunft das einzige, was sie ehrlich sagen kann.
     */
    basis: recommendationBasisSchema,
    /**
     * ⚠️ PLATZHALTER — erwartetes Wirkfenster in Tagen ab Einnahmebeginn.
     * "from" ist der frueheste Tag, an dem eine Veraenderung ueberhaupt
     * erwartet wird; davor lautet der Stand immer "zu frueh", nie
     * "keine Reaktion".
     */
    effectWindowDays: z
      .object({
        from: z.number().int().nonnegative(),
        to: z.number().int().nonnegative(),
      })
      .refine((window) => window.to > window.from, {
        error: "Das Wirkfenster muss nach seinem Beginn enden.",
      }),
    /**
     * ⚠️ PLATZHALTER — Richtung, in der eine Veraenderung am Marker als
     * erwuenscht gilt. Vitamin D steigt, Triglyceride fallen; ohne diese
     * Richtung ist jede Schwelle sinnlos.
     */
    expectedDirection: expectedDirectionSchema,
    /** ⚠️ PLATZHALTER — ab diesem Betrag in Wirkrichtung zaehlt es als "wirkt". */
    strongDelta: z.number().positive(),
    /** ⚠️ PLATZHALTER — ab diesem Betrag (unter strongDelta) als "wirkt schwach". */
    weakDelta: z.number().positive(),
    /**
     * Kurzer naechster Schritt. Bei "keine Reaktion" MUSS das ein angepasster
     * Rat sein (Dosis, anderes Praeparat, absetzen) — niemals dieselbe Dosis
     * noch einmal. Die Regel dazu steht in features/analysis/rules.ts.
     */
    actionHint: z.string().min(1),
    /*
     * ENTFERNT: followUpQuestion — eine Rueckfrage am Praeparat.
     *
     * Sie stand in der Empfehlungszeile und ist dort ausgebaut worden: die
     * Zeile beantwortet jetzt eine Frage (nehmen oder nicht) und stellt keine.
     * Das Feld ist mitgegangen, statt als unbenutzter Vertragsteil
     * stehenzubleiben — ein Feld, das keine Oberflaeche rendert, sieht beim
     * naechsten Lesen wie eine Zusage aus, die niemand eingeloest hat.
     *
     * Wer Rueckfragen zurueckbringt, prueft zuerst die Kontext-Leiste: dort
     * gibt es sie bereits, mit Zaehler und Ja/Nein. Zwei Orte fuer dieselbe
     * Sache waeren der eigentliche Fehler.
     */
    /** Laufende Einnahme, oder null: wird nicht genommen. */
    intake: supplementIntakeSchema.nullable(),
  })
  .refine((prep) => prep.weakDelta <= prep.strongDelta, {
    error: '"wirkt schwach" muss unter der Schwelle fuer "wirkt" liegen.',
  })
  .refine((prep) => prep.targetMarker !== null || prep.targetUnit === "", {
    error: "Ohne Zielmarker gibt es keine Einheit — targetUnit muss leer sein.",
  })
  .refine(
    (prep) => (prep.targetMarker === null) === (prep.targetRange === null),
    {
      error:
        "Zielmarker und Zielbereich gehoeren zusammen: beide oder keiner von beiden.",
    },
  )
  .refine((prep) => prep.targetMarker !== null || prep.basis === "fragebogen", {
    error:
      "Ohne Zielmarker kann keine Messung die Empfehlung tragen — basis muss „fragebogen“ sein.",
  });

export type Supplement = z.infer<typeof supplementSchema>;

export const supplementListSchema = z
  .array(supplementSchema)
  .refine((preps) => new Set(preps.map((p) => p.id)).size === preps.length, {
    error: "Jede Praeparat-Id darf nur einmal vorkommen.",
  })
  .readonly();
