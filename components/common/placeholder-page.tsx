type PlaceholderPageProps = {
  title: string;
  lead?: string;
  cardTitle?: string;
  cardText: string;
};

/**
 * Einheitlicher Platzhalter für Seiten, deren Inhalt in einer späteren Stufe
 * folgt: Überschrift, optionaler Vorspann und eine Glaskachel mit Hinweis.
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
        <p className="text-muted-foreground mt-4 max-w-2xl text-lg">{lead}</p>
      ) : null}

      <div className="glass mt-10 max-w-2xl rounded-2xl p-6">
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
