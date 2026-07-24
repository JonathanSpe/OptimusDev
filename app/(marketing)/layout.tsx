import Link from "next/link";

const navigation = [
  { href: "/so-funktioniert-es", label: "So funktioniert's" },
  { href: "/wissenschaft", label: "Wissenschaft" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/shop", label: "Shop" },
];

const legalLinks = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
];

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="glass sticky top-0 z-50">
        <nav
          aria-label="Hauptnavigation"
          className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4"
        >
          <Link
            href="/"
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

          <Link
            href="/login"
            className="ml-auto rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover"
          >
            Anmelden
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        {children}
      </main>

      <footer className="glass mt-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Optimus
          </p>
          <ul className="flex items-center gap-6">
            {legalLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-brand"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </>
  );
}
