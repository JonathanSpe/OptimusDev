"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  appNavigation,
  isNavCurrent,
  isNavSection,
  type NavChild,
  type NavItem,
} from "@/components/common/app-navigation";
import { ProfileAvatar } from "@/components/common/profile-avatar";
import { sampleProfile } from "@/features/context";
import { cn } from "@/lib/utils";

/*
 * Navigation MIT Beschriftung — sie steht ausschliesslich in der Schublade
 * unter md. Am Bildschirmrand uebernimmt die Icon-Leiste (AppIconRail); dort
 * gibt es bewusst keine Labels und keine Unterpunkte. Weil die Schublade Platz
 * hat, ist sie der Ort, an dem die Unterseiten der Analyse erreichbar bleiben.
 */

export interface AppNavProps {
  /** Schliesst die Schublade nach einem Klick. */
  onNavigate?: () => void;
}

const ITEM_BASE =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
  "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "motion-reduce:transition-none";

function NavLink({
  item,
  isCurrent,
  isSection,
  onNavigate,
}: {
  item: NavItem;
  isCurrent: boolean;
  isSection: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      // Neben der Farbe traegt aria-current das aktive Element fuer Screenreader.
      aria-current={isCurrent ? "page" : isSection ? "true" : undefined}
      className={cn(
        ITEM_BASE,
        isSection
          ? "bg-brand-subtle text-foreground font-semibold"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-5 shrink-0", isSection && "text-brand")}
      />
      <span>{item.label}</span>
    </Link>
  );
}

function NavSubLink({
  child,
  isCurrent,
  onNavigate,
}: {
  child: NavChild;
  isCurrent: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={child.href}
      onClick={onNavigate}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "focus-visible:outline-ring block rounded-lg py-1.5 pr-3 pl-11 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
        isCurrent
          ? "text-brand-strong bg-brand-subtle/60 font-semibold"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {child.label}
    </Link>
  );
}

function ProfileChip({
  isCurrent,
  onNavigate,
}: {
  isCurrent: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/einstellungen"
      onClick={onNavigate}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg p-2 transition-colors",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
        isCurrent ? "bg-brand-subtle" : "hover:bg-muted",
      )}
    >
      <ProfileAvatar
        initials={sampleProfile.initials}
        imageSrc={sampleProfile.imageSrc}
      />
      <span className="min-w-0">
        <span className="text-foreground block truncate text-sm font-medium">
          {sampleProfile.name}
        </span>
        <span className="text-muted-foreground text-2xs block truncate">
          Profil & Einstellungen
        </span>
      </span>
    </Link>
  );
}

export function AppNav({ onNavigate }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="flex min-h-0 flex-1 flex-col gap-1"
    >
      <ul className="flex flex-col gap-1">
        {appNavigation.map((item) => (
          <li key={item.href}>
            <NavLink
              item={item}
              isCurrent={isNavCurrent(pathname, item.href)}
              isSection={isNavSection(pathname, item.href)}
              onNavigate={onNavigate}
            />
            {/*
             * Die Unterpunkte klappen nicht per Klick auf, sondern folgen der
             * Route: ist der Abschnitt offen, sind sie sichtbar. Damit stimmt
             * der Zustand auch nach einem direkten Aufruf der Unterseite.
             */}
            {item.children && isNavSection(pathname, item.href) ? (
              <ul className="mt-1 flex flex-col gap-0.5">
                {item.children.map((child) => (
                  <li key={child.href}>
                    <NavSubLink
                      child={child}
                      isCurrent={isNavCurrent(pathname, child.href)}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Unten verankert: das Profil fuehrt in die Einstellungen. */}
      <div className="mt-auto pt-4">
        <ProfileChip
          isCurrent={isNavSection(pathname, "/einstellungen")}
          onNavigate={onNavigate}
        />
      </div>
    </nav>
  );
}
