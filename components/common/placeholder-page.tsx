type PlaceholderPageProps = {
  title: string;
  lead?: string;
  cardTitle?: string;
  cardText: string;
};

/**
 * Einheitlicher Platzhalter für Seiten, deren Inhalt in einer späteren Stufe
 * folgt: Überschrift, optionaler Vorspann und eine Karte mit Hinweis.
 *
 * Die Karte ist DECKEND (surface-card), nicht gefrostet: sie steht im
 * eingeloggten Bereich auf der hellen Inhaltsfläche, und dort würde eine
 * transluzente Kachel mit dem Untergrund verschwimmen.
 */
export function PlaceholderPage({
  title,
  lead,
  cardTitle,
  cardText,
}: PlaceholderPageProps) {
  return (
    <section>
      <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {lead ? (
        <p className="text-muted-foreground max-w-measure mt-4 text-lg">
          {lead}
        </p>
      ) : null}

      <div className="surface-card max-w-measure mt-10 rounded-2xl p-6">
        {cardTitle ? (
          <h2 className="text-foreground text-base font-semibold">
            {cardTitle}
          </h2>
        ) : null}
        <p className="text-muted-foreground mt-2 text-sm">{cardText}</p>
      </div>
    </section>
  );
}
