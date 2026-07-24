import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Anmelden",
};

export default function LoginPage() {
  return (
    <section className="glass-strong rounded-2xl p-8">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        Anmelden
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Die echte Anmeldung folgt in einer späteren Stufe. Bis dahin kannst du
        dir den eingeloggten Bereich unverbindlich ansehen.
      </p>

      <Link
        href="/dashboard"
        className="bg-brand text-on-brand hover:bg-brand-hover mt-8 block rounded-lg px-4 py-3 text-center text-sm font-medium transition-colors"
      >
        Zur Dashboard-Vorschau
      </Link>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Noch kein Konto?{" "}
        <Link
          href="/registrieren"
          className="text-brand hover:text-brand-hover font-medium transition-colors"
        >
          Registrieren
        </Link>
      </p>
    </section>
  );
}
