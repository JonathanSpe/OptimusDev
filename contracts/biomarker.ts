import { z } from "zod";

/*
 * ============================================================================
 * ⚠️  EINHEITEN UND GRENZWERTE SIND PLATZHALTER — NICHT KLINISCH VALIDIERT.
 * ============================================================================
 * Dieses Modul beschreibt die FORM der Biomarker-Daten, nicht deren Inhalt.
 * Jeder konkrete Grenzwert, der irgendwo im Projekt gegen dieses Schema
 * geparst wird, ist bis auf Weiteres ein Entwurfswert fuer die Gestaltung und
 * muss vor jedem Release gegen das Bluttest-Framework abgeglichen und
 * freigegeben werden. Siehe die Kommentare an referenceLow/referenceHigh und
 * optimalLow/optimalHigh weiter unten.
 * ============================================================================
 *
 * ENTSCHEIDUNG: Die TypeScript-Typen werden aus den Zod-Schemata abgeleitet
 * (z.infer) statt daneben als eigene Interfaces gepflegt. Damit ist die Form an
 * genau EINER Stelle beschrieben und kann nicht auseinanderlaufen — ein
 * handgeschriebenes Interface und ein Schema driften sonst genau dann
 * auseinander, wenn es weh tut. Umkehrbar: wer die Interfaces bevorzugt,
 * schreibt sie hin und annotiert die Schemata mit z.ZodType<…>.
 */

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Ein Messpunkt: was wurde wann gemessen. */
export const measurementSchema = z.object({
  /** ISO-Datum (YYYY-MM-DD). Bewusst ein String: keine Zeitzone, kein Uhrzeit-Rauschen. */
  date: z
    .string()
    .regex(ISO_DATUM, { error: "Datum muss als YYYY-MM-DD vorliegen." }),
  value: z.number().finite(),
});

export type Measurement = z.infer<typeof measurementSchema>;

/*
 * ANZEIGE-Gruppen der Marker. Das ist ein PRAESENTATIONS-Begriff: er ordnet die
 * Kacheln auf dem Dashboard in Abschnitte und sagt nichts ueber eine Bewertung.
 *
 * NICHT VERWECHSELN mit den Bewertungs-Kategorien K1–K4 der Analyse. Die
 * Kategorien sind ein Scoring-Konzept und gehoeren zur Analyse-Oberflaeche; sie
 * duerfen hier weder auftauchen noch aus der Gruppe abgeleitet werden. Ein
 * Marker kann in der Anzeige unter "Herz-Gesundheit" stehen und in der
 * Bewertung in eine voellig andere Kategorie fallen — beides existiert
 * unabhaengig voneinander, und genau deshalb sind es zwei getrennte Begriffe.
 */
export const markerGroupIdSchema = z.enum([
  "hormone",
  "herz",
  "stoffwechsel",
  "schilddruese",
  "leber-niere",
]);

export type MarkerGroupId = z.infer<typeof markerGroupIdSchema>;

export const markerGroupSchema = z.object({
  id: markerGroupIdSchema,
  /** Ueberschrift des Abschnitts, z. B. "Herz-Gesundheit". */
  name: z.string().min(1),
  /** Zeile darunter, z. B. "Lipide · Entzündung · kardiovaskuläres Risiko". */
  subtitle: z.string().min(1),
});

export type MarkerGroup = z.infer<typeof markerGroupSchema>;

/**
 * Reihenfolge der Gruppen = Reihenfolge im Array. Die Anzeige sortiert nicht
 * nach, sie folgt der Liste.
 */
export const markerGroupListSchema = z
  .array(markerGroupSchema)
  .refine(
    (groups) => new Set(groups.map((group) => group.id)).size === groups.length,
    { error: "Jede Gruppen-Id darf nur einmal vorkommen." },
  )
  .readonly();

export const biomarkerSchema = z
  .object({
    /** Stabiler Slug, z. B. "ldl-cholesterin". Referenz fuer derivedFrom. */
    id: z.string().min(1),
    /** Anzeigename, z. B. "LDL-Cholesterin". */
    name: z.string().min(1),
    group: markerGroupIdSchema,
    /*
     * ⚠️ PLATZHALTER — nicht klinisch validiert.
     * Einheit, z. B. "ng/ml". Ein LEERER String bedeutet: dimensionslos (die
     * Verhaeltnis-Indizes). Die Anzeige laesst die Einheit dann weg.
     */
    unit: z.string(),
    /*
     * ⚠️ PLATZHALTER — nicht klinisch validiert. Referenzbereich des Labors.
     * Diese beiden Werte entscheiden, ob ein Messwert als "ausserhalb" gilt.
     * Sie sind Entwurfswerte fuer die Gestaltung und muessen vor dem Release
     * gegen das Bluttest-Framework abgeglichen und freigegeben werden.
     */
    referenceLow: z.number(),
    referenceHigh: z.number(),
    /*
     * ⚠️ PLATZHALTER — nicht klinisch validiert. Optionaler Optimalbereich
     * INNERHALB des Referenzbereichs; dieselbe Freigabepflicht wie oben. Nur
     * wenn beide Grenzen gesetzt sind, zeichnet die Anzeige den Sockel.
     */
    optimalLow: z.number().optional(),
    optimalHigh: z.number().optional(),
    /** true = berechneter Index, nicht gemessen. Braucht dann derivedFrom. */
    isDerived: z.boolean().optional(),
    /** Ids der Marker, aus denen der Index berechnet wird (mindestens zwei). */
    derivedFrom: z.array(z.string().min(1)).readonly().optional(),
    /*
     * Aelteste Messung zuerst. Der letzte Eintrag ist der aktuelle Wert; eine
     * LEERE Liste bedeutet "noch nicht gemessen". Deshalb gibt es kein eigenes
     * value-Feld — zwei Quellen fuer denselben Wert laufen irgendwann
     * auseinander.
     */
    history: z.array(measurementSchema).readonly(),
  })
  .refine((marker) => marker.referenceHigh > marker.referenceLow, {
    error: "referenceHigh muss ueber referenceLow liegen.",
  })
  .refine(
    (marker) =>
      (marker.optimalLow === undefined) === (marker.optimalHigh === undefined),
    { error: "Ein Optimalbereich braucht BEIDE Grenzen oder keine." },
  )
  .refine(
    (marker) =>
      marker.optimalLow === undefined ||
      marker.optimalHigh === undefined ||
      marker.optimalHigh > marker.optimalLow,
    { error: "optimalHigh muss ueber optimalLow liegen." },
  )
  .refine(
    (marker) =>
      marker.optimalLow === undefined ||
      marker.optimalHigh === undefined ||
      (marker.optimalLow >= marker.referenceLow &&
        marker.optimalHigh <= marker.referenceHigh),
    {
      error:
        "Der Optimalbereich muss innerhalb des Referenzbereichs liegen — sonst zeichnet die Kachel einen Sockel neben dem Band.",
    },
  )
  .refine(
    (marker) =>
      marker.history.every(
        (point, index) =>
          index === 0 || point.date > (marker.history[index - 1]?.date ?? ""),
      ),
    { error: "Der Verlauf muss streng aufsteigend nach Datum sortiert sein." },
  )
  .refine(
    (marker) =>
      marker.isDerived === true
        ? (marker.derivedFrom?.length ?? 0) >= 2
        : marker.derivedFrom === undefined,
    {
      error:
        "Abgeleitete Indizes brauchen mindestens zwei Quellmarker; gemessene Marker haben kein derivedFrom.",
    },
  );

export type Biomarker = z.infer<typeof biomarkerSchema>;

/**
 * Die vollstaendige Marker-Liste. Sie prueft zusaetzlich die Beziehungen
 * ZWISCHEN den Markern — das kann ein einzelnes Objekt nicht wissen.
 */
export const biomarkerListSchema = z
  .array(biomarkerSchema)
  .refine(
    (markers) =>
      new Set(markers.map((marker) => marker.id)).size === markers.length,
    { error: "Jede Marker-Id darf nur einmal vorkommen." },
  )
  .refine(
    (markers) => {
      const gemessen = new Set(
        markers
          .filter((marker) => marker.isDerived !== true)
          .map((marker) => marker.id),
      );
      return markers.every((marker) =>
        (marker.derivedFrom ?? []).every((id) => gemessen.has(id)),
      );
    },
    {
      error:
        "derivedFrom muss auf gemessene Marker derselben Liste zeigen — ein Index aus einem Index ist nicht vorgesehen.",
    },
  )
  .readonly();
