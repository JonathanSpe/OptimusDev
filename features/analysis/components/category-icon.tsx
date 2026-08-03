import {
  Circle,
  HeartPulse,
  Moon,
  Shield,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * ============================================================================
 * DAS ZEICHEN EINES BEREICHS — eine Tabelle, drei Fundstellen.
 * ============================================================================
 * Ein Bereich taucht auf dieser Seite dreimal auf, jedes Mal in einer anderen
 * Umgebung: als Kopf im Bereichsfeld, als Beschriftung an einer Linie in der
 * Entwicklung, und als Herkunft hinter einem Markernamen in der
 * Veraenderungsliste. Bisher verband die drei nur ein Wort — und "Herz-Kreislauf"
 * an drei Stellen in drei Schriftgroessen liest man nicht als dieselbe Sache,
 * man liest es dreimal.
 *
 * Das Zeichen macht daraus einen Wiedererkennungswert, den man nicht lesen muss.
 *
 * DIE TABELLE STEHT GENAU HIER. Zwei Tabellen waeren zwei Zuordnungen, und die
 * laufen auseinander, sobald ein Bereich dazukommt — dann traegt derselbe
 * Bereich im Kopf ein Herz und in der Liste einen Blitz. Das ist derselbe
 * Grund, aus dem die Urteilsstufen in score-verdict.tsx an einer Stelle stehen.
 *
 * ⚠️ DAS ZEICHEN IST DEKORATION UND TRAEGT NIE EINE AUSSAGE. Es ist ueberall
 * aria-hidden, weil der Name unmittelbar daneben steht — vorgelesen waere es
 * eine zweite Nennung derselben Sache. Und es bekommt KEINE Statusfarbe: gruen,
 * bernstein und rot beantworten auf dieser Seite "wo stehst du", und ein
 * bernsteines Herz neben einem Bereichsnamen waere ein Urteil, das niemand
 * gefaellt hat. Der Ton kommt aus der Umgebung, nicht aus dem Zustand.
 */

/**
 * Bereich → Zeichen. Die Ids sind die der Bewertungs-Kategorien K1–K4 aus
 * sample-data (spaeter aus contracts/) — NICHT die Anzeige-Gruppen k1–k5 der
 * Farbtoken, siehe die Namensfalle in tokens/README.md.
 */
const CATEGORY_ICON: Readonly<Record<string, LucideIcon>> = {
  /* Energie & Stoffwechsel — der Blitz, nicht die Flamme: Flamme laese sich als
   * Entzuendung lesen, und die ist auf dieser Seite ein Befund. */
  k1: Zap,
  /* Regeneration & Hormonbalance — Erholung passiert nachts. */
  k2: Moon,
  /* Herz-Kreislauf & Langzeit. */
  k3: HeartPulse,
  /* Immunsystem & Mikronaehrstoffe — Abwehr. Bewusst OHNE Haekchen im Schild:
   * ShieldCheck traegt dasselbe Zeichen wie das Urteil "gut". */
  k4: Shield,
};

/**
 * Rueckfall fuer einen Bereich ohne Eintrag. Ein leerer Platz waere schlimmer
 * als ein neutraler Kreis: die drei Fundstellen richten Zeichen und Name
 * aneinander aus, und eine Zeile ohne Zeichen bricht die Flucht.
 */
const FALLBACK_ICON: LucideIcon = Circle;

export interface CategoryIconProps {
  /** Id der Bewertungs-Kategorie, z. B. "k3". */
  categoryId: string;
  /** Groesse und Ton kommen von aussen — siehe den Warnblock oben. */
  className?: string;
}

export function CategoryIcon({ categoryId, className }: CategoryIconProps) {
  const Icon = CATEGORY_ICON[categoryId] ?? FALLBACK_ICON;

  return (
    <Icon
      aria-hidden="true"
      className={cn("size-3 shrink-0", className)}
      strokeWidth={2}
    />
  );
}
