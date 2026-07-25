"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import optimusMark from "@/public/optimus-mark.png";
import {
  appNavigation,
  isNavCurrent,
  isNavSection,
  type NavItem,
} from "@/components/common/app-navigation";
import { ProfileAvatar } from "@/components/common/profile-avatar";
import { ThemeToggle } from "@/components/common/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { sampleProfile } from "@/features/context";
import { cn } from "@/lib/utils";

/*
 * Die Icon-Leiste ist KEIN Teil des App-Panels: sie ist eine eigene,
 * schwebende Glasflaeche links davon, senkrecht zentriert und mit eigenem
 * Schatten. Ab lg schwebt sie frei, darunter (md bis lg) dockt sie an die
 * linke Panel-Kante an — dann verliert sie rechts Rundung, Kante und Schatten
 * und liest als angesetzte Spalte. Unter md ist sie weg; dort uebernimmt die
 * Schublade in der Kopfzeile.
 */

const ITEM =
  "relative flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors " +
  "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "motion-reduce:transition-none";

/*
 * Der aktive Eintrag ist die staerkste rote Flaeche der ganzen App: gefuelltes
 * Marken-Rot, weisses Icon. Rot bleibt damit Akzent — es steht auf 40 Pixeln,
 * nicht auf einer Flaeche.
 */
const ITEM_ACTIVE = "bg-brand text-on-brand shadow-sm hover:bg-brand-hover";
const ITEM_QUIET =
  "text-muted-foreground hover:bg-foreground/5 hover:text-foreground";

function RailLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const isSection = isNavSection(pathname, item.href);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={item.href}
            /*
             * "page" nur fuer die genau geoeffnete Seite; steht eine
             * Unterseite offen (z. B. /analyse/verlauf), markiert "true" den
             * Abschnitt. Die Farbe ist damit nie das einzige Signal.
             */
            aria-current={
              isNavCurrent(pathname, item.href)
                ? "page"
                : isSection
                  ? "true"
                  : undefined
            }
            className={cn(ITEM, isSection ? ITEM_ACTIVE : ITEM_QUIET)}
          >
            <Icon aria-hidden="true" className="size-5" />
            {/* Ohne Label braucht der Link einen Namen fuer Screenreader. */}
            <span className="sr-only">{item.label}</span>
          </Link>
        }
      />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function AppIconRail() {
  const pathname = usePathname();
  const isSettings = isNavSection(pathname, "/einstellungen");

  return (
    <TooltipProvider delay={250}>
      <div
        className={cn(
          "glass-rail rounded-panel hidden w-16 flex-col items-center gap-2 py-4 md:flex",
          /*
           * Angedockt: rechts buendig mit dem Panel. Rundung und Schatten
           * fallen weg, die leise rechte Kante bleibt — sie ist zusammen mit
           * der fehlenden linken Panel-Kante die einzige Trennlinie.
           */
          "md:max-lg:self-stretch md:max-lg:rounded-r-none md:max-lg:shadow-none",
          // Frei schwebend: senkrecht zentriert im Fenster.
          "lg:self-center",
        )}
      >
        <Link href="/dashboard" className={cn(ITEM, "hover:bg-foreground/5")}>
          {/*
           * Die Bildmarke traegt ihre Flaeche selbst (rotes Quadrat mit dem O)
           * und ist deshalb rein dekorativ: den Namen des Links liefert der
           * Text darunter. Statischer Import, damit next/image die Groesse
           * kennt und kein Layout-Sprung entsteht.
           */}
          <Image
            src={optimusMark}
            alt=""
            aria-hidden="true"
            priority
            className="h-7 w-auto"
          />
          <span className="sr-only">Optimus — zum Dashboard</span>
        </Link>

        <nav aria-label="Hauptnavigation">
          <ul className="flex flex-col items-center gap-1">
            {appNavigation.map((item) => (
              <li key={item.href}>
                <RailLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Unten verankert: Darstellung und Profil. */}
        <div className="mt-auto flex flex-col items-center gap-1">
          <ThemeToggle />

          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/einstellungen"
                  aria-current={isSettings ? "page" : undefined}
                  className={cn(
                    ITEM,
                    "hover:bg-foreground/5",
                    /*
                     * Der Avatar behaelt seine Identitaet — aktiv wird er
                     * deshalb umrandet und nicht wie die Icons gefuellt.
                     */
                    isSettings && "ring-brand ring-2",
                  )}
                >
                  <ProfileAvatar
                    initials={sampleProfile.initials}
                    imageSrc={sampleProfile.imageSrc}
                  />
                  <span className="sr-only">Profil & Einstellungen</span>
                </Link>
              }
            />
            <TooltipContent side="right">Profil & Einstellungen</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
