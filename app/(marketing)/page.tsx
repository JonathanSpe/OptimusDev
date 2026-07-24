import Link from "next/link";

const previewCards = [
  {
    title: "Messen",
    description:
      "Blutwerte, Schlaf und Aktivität laufen an einem Ort zusammen — ohne Tabellenchaos.",
  },
  {
    title: "Verstehen",
    description:
      "Jeder Wert wird eingeordnet: Was ist gut, was ist auffällig, was bedeutet das für dich?",
  },
  {
    title: "Handeln",
    description:
      "Konkrete nächste Schritte statt allgemeiner Ratschläge — abgestimmt auf deine Werte.",
  },
];

export default function StartseitePage() {
  return (
    <>
      <section className="max-w-3xl">
        <p className="text-sm font-medium tracking-wide text-brand uppercase">
          Gesundheit in Zahlen
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          Deine Gesundheit, endlich{" "}
          <span className="text-brand">messbar</span> besser.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Optimus bündelt deine Messwerte, erklärt sie in verständlicher Sprache
          und zeigt dir, welcher nächste Schritt wirklich etwas bringt.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/registrieren"
            className="rounded-lg bg-brand px-6 py-3 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover"
          >
            Jetzt starten
          </Link>
          <Link
            href="/so-funktioniert-es"
            className="glass rounded-lg px-6 py-3 text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            So funktioniert es
          </Link>
        </div>
      </section>

      <section
        aria-label="Vorschau"
        className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {previewCards.map((card) => (
          <article key={card.title} className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground">
              {card.title}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {card.description}
            </p>
          </article>
        ))}
      </section>
    </>
  );
}
