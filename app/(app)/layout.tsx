import Link from "next/link";

/*
 * Diese Routen-Gruppe ist der eingeloggte Bereich. Ein Auth-Guard (Weiterleitung
 * nach /login für nicht angemeldete Nutzer) kommt in einer späteren Stufe hier
 * bzw. in der Proxy-/Middleware-Schicht dazu — aktuell ist alles frei zugänglich.
 */

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analyse", label: "Analyse" },
  { href: "/leistung", label: "Leistung" },
  // Bis es einen internen Shop gibt, zeigt der Eintrag auf die öffentliche Seite.
  { href: "/shop", label: "Shop" },
];

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="glass sticky top-0 z-50">
        <nav
          aria-label="App-Navigation"
          className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4"
        >
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Optimus
          </Link>

          <ul className="order-last flex w-full flex-wrap items-center gap-x-6 gap-y-2 sm:order-none sm:w-auto sm:flex-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-brand"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/einstellungen"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-brand"
            >
              Einstellungen
            </Link>
            {/* Platzhalter: meldet noch nichts ab, führt nur zurück zur Startseite. */}
            <Link
              href="/"
              className="rounded-lg border border-glass-border bg-brand-subtle px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand-tint"
            >
              Abmelden
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {children}
      </main>
    </>
  );
}
