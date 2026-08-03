"use client";

import { Menu, PanelRight } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { AppNav } from "@/components/common/app-nav";
import { RailPlacementProvider } from "@/components/common/rail-placement";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export interface AppShellHeaderProps {
  /**
   * Der Inhalt der Kontext-Leiste, wie ihn der @rail-Slot fuer die aktuelle
   * Route liefert. Er kommt als Prop und wird hier NICHT gewaehlt: sonst
   * bestueckte die Schublade sich anders als die Spalte daneben, und eine
   * Seite saehe unter xl anders aus als darueber.
   */
  rail: ReactNode;
}

/**
 * Kopfzeile der Inhaltsspalte. Sie traegt genau die beiden Zugaenge, die in
 * schmalen Breiten fehlen: die Navigation (unter md, wo die Icon-Leiste weg
 * ist) und die Kontext-Leiste (unter xl, wo sie nicht ins Panel passt). Ab xl
 * stehen beide Flaechen fest — dann verschwindet die Kopfzeile ganz.
 */
export function AppShellHeader({ rail }: AppShellHeaderProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isRailOpen, setIsRailOpen] = useState(false);

  return (
    <header className="flex shrink-0 items-center gap-3 px-5 pt-4 lg:px-8 xl:hidden">
      <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground md:hidden"
            />
          }
        >
          <Menu aria-hidden="true" />
          <span className="sr-only">Navigation öffnen</span>
        </SheetTrigger>
        {/* Die Wortmarke dient hier auch als Name des Panels. */}
        <SheetContent side="left" title="Optimus" className="w-72">
          <AppNav onNavigate={() => setIsNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <Link
        href="/dashboard"
        className="text-foreground focus-visible:outline-ring rounded-sm text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 md:hidden"
      >
        Optimus
      </Link>

      <Sheet open={isRailOpen} onOpenChange={setIsRailOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground ml-auto"
            />
          }
        >
          <PanelRight aria-hidden="true" />
          <span className="sr-only">Kontext anzeigen</span>
        </SheetTrigger>
        {/*
         * surface="rail": im Panel behaelt die Leiste ihre Flaechenebene.
         * Ohne das wechselte ihr Inhalt beim Umbruch den Untergrund und alle
         * Textrollen darauf waeren falsch.
         *
         * hideTitle: "Kontext" ueber einer Leiste, deren Kacheln sich selbst
         * benennen, war eine Zeile, die nichts hinzufuegte — und sie schob den
         * Inhalt um eine Zeilenhoehe nach unten. Der Name BLEIBT: hideTitle
         * setzt ihn nur auf sr-only, sodass der Dialog weiterhin ueber
         * aria-labelledby angesagt wird. Ohne Namen waere es ein Panel, das
         * sich als "Dialog" meldet und sonst nichts.
         */}
        <SheetContent side="right" surface="rail" title="Kontext" hideTitle>
          {/* Der Inhalt steht hier an seinem ZWEITEN Platz. Anders als die
           * Spalte existiert die Schublade nur geoeffnet — was darin steht,
           * ist damit immer sichtbar. Siehe rail-placement.tsx. */}
          <RailPlacementProvider placement="drawer">
            {rail}
          </RailPlacementProvider>
        </SheetContent>
      </Sheet>
    </header>
  );
}
