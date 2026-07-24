import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

const kpis = [
  { label: "Ruhepuls", value: "58", unit: "bpm", trend: "−2 zur Vorwoche" },
  { label: "Schlaf", value: "7,2", unit: "h", trend: "+0,4 zur Vorwoche" },
  { label: "Regeneration", value: "82", unit: "%", trend: "stabil" },
  { label: "Vitamin D", value: "34", unit: "ng/ml", trend: "letzte Messung" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Guten Morgen 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Alle Werte sind Platzhalter — echte Daten folgen in einer späteren
          Stufe.
        </p>
      </header>

      <section
        aria-label="Kennzahlen"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {kpis.map((kpi) => (
          <article key={kpi.label} className="glass rounded-2xl p-5">
            <h2 className="text-sm font-medium text-muted-foreground">
              {kpi.label}
            </h2>
            <p className="mt-3 text-3xl font-semibold text-foreground">
              {kpi.value}
              <span className="ml-1 text-base font-medium text-muted-foreground">
                {kpi.unit}
              </span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{kpi.trend}</p>
          </article>
        ))}
      </section>

      <section
        aria-label="Verlauf"
        className="glass-strong rounded-2xl p-6 lg:p-8"
      >
        <h2 className="text-lg font-semibold text-foreground">
          Verlauf der letzten 30 Tage
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Platz für das Diagramm — die Visualisierung kommt in einer späteren
          Stufe.
        </p>
        <div className="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
          <span className="text-sm text-muted-foreground">
            Diagramm-Platzhalter
          </span>
        </div>
      </section>

      <section aria-label="Empfehlung" className="glass rounded-2xl p-6">
        <p className="text-sm font-medium tracking-wide text-brand uppercase">
          Empfehlung
        </p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">
          Heute: 20 Minuten zügig spazieren
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Beispieltext für eine Empfehlung. Später steht hier ein Vorschlag, der
          aus deinen aktuellen Werten abgeleitet und mit Quellen belegt wird.
        </p>
      </section>
    </div>
  );
}
