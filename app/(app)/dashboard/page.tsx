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
        <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
          Guten Morgen 👋
        </h1>
        <p className="text-muted-foreground mt-2">
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
            <h2 className="text-muted-foreground text-sm font-medium">
              {kpi.label}
            </h2>
            <p className="text-foreground mt-3 text-3xl font-semibold">
              {kpi.value}
              <span className="text-muted-foreground ml-1 text-base font-medium">
                {kpi.unit}
              </span>
            </p>
            <p className="text-muted-foreground mt-2 text-xs">{kpi.trend}</p>
          </article>
        ))}
      </section>

      <section
        aria-label="Verlauf"
        className="glass-strong rounded-2xl p-6 lg:p-8"
      >
        <h2 className="text-foreground text-lg font-semibold">
          Verlauf der letzten 30 Tage
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Platz für das Diagramm — die Visualisierung kommt in einer späteren
          Stufe.
        </p>
        <div className="border-border mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed">
          <span className="text-muted-foreground text-sm">
            Diagramm-Platzhalter
          </span>
        </div>
      </section>

      <section aria-label="Empfehlung" className="glass rounded-2xl p-6">
        <p className="text-brand text-sm font-medium tracking-wide uppercase">
          Empfehlung
        </p>
        <h2 className="text-foreground mt-2 text-lg font-semibold">
          Heute: 20 Minuten zügig spazieren
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Beispieltext für eine Empfehlung. Später steht hier ein Vorschlag, der
          aus deinen aktuellen Werten abgeleitet und mit Quellen belegt wird.
        </p>
      </section>
    </div>
  );
}
