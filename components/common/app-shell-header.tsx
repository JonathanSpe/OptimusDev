"use client";

import { Menu, PanelRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppNav } from "@/components/common/app-nav";
import { ContextRail } from "@/components/common/context-rail";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/**
 * Kopfzeile der Inhaltsspalte. Sie traegt genau die beiden Zugaenge, die in
 * schmalen Breiten fehlen: die Navigation (unter md, wo die Icon-Leiste weg
 * ist) und die Kontext-Leiste (unter xl, wo sie nicht ins Panel passt). Ab xl
 * stehen beide Flaechen fest — dann verschwindet die Kopfzeile ganz.
 */
export function AppShellHeader() {
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
         */}
        <SheetContent side="right" surface="rail" title="Kontext">
          <ContextRail />
        </SheetContent>
      </Sheet>
    </header>
  );
}
