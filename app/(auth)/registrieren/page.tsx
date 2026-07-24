import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Registrieren",
};

export default function RegistrierenPage() {
  return (
    <section className="glass-strong rounded-2xl p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Konto erstellen
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Die echte Registrierung folgt in einer späteren Stufe. Bis dahin kannst
        du dir den eingeloggten Bereich unverbindlich ansehen.
      </p>

      <Link
        href="/dashboard"
        className="mt-8 block rounded-lg bg-brand px-4 py-3 text-center text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover"
      >
        Zur Dashboard-Vorschau
      </Link>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Bereits registriert?{" "}
        <Link
          href="/login"
          className="font-medium text-brand transition-colors hover:text-brand-hover"
        >
          Anmelden
        </Link>
      </p>
    </section>
  );
}
