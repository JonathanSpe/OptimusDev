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
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {lead ? (
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{lead}</p>
      ) : null}

      <div className="glass mt-10 max-w-2xl rounded-2xl p-6">
        {cardTitle ? (
          <h2 className="text-base font-semibold text-foreground">
            {cardTitle}
          </h2>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">{cardText}</p>
      </div>
    </section>
  );
}
