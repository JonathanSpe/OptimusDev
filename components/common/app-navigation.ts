import {
  Activity,
  ChartLine,
  LayoutDashboard,
  Lightbulb,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export interface NavChild {
  href: string;
  label: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: readonly NavChild[];
}

/*
 * Reihenfolge der Hauptnavigation — sie ist gesetzt und aendert sich nicht.
 * Die Icon-Leiste zeigt nur die Icons (Beschriftung im Tooltip), die Schublade
 * auf kleinen Bildschirmen zeigt Labels und Unterpunkte. Beide lesen aus dieser
 * einen Liste, damit sie nie auseinanderlaufen.
 */
export const appNavigation: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/analyse",
    label: "Analyse",
    icon: ChartLine,
    children: [
      { href: "/analyse/snapshot", label: "Snapshot" },
      { href: "/analyse/verlauf", label: "Verlauf" },
    ],
  },
  { href: "/empfehlungen", label: "Empfehlungen", icon: Lightbulb },
  { href: "/leistung", label: "Performance", icon: Activity },
  // Bis es einen internen Shop gibt, zeigt der Eintrag auf die oeffentliche Seite.
  { href: "/shop", label: "Shop", icon: ShoppingBag },
];

/** Genau diese Seite ist offen. */
export function isNavCurrent(pathname: string, href: string): boolean {
  return pathname === href;
}

/** Diese Seite oder eine ihrer Unterseiten ist offen. */
export function isNavSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
