"use client";

import { Moon, Sun } from "lucide-react";

import {
  THEME_DARK,
  THEME_DARK_CLASS,
  THEME_LIGHT,
  THEME_STORAGE_KEY,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Umschalter zwischen heller und dunkler Darstellung.
 *
 * ENTSCHEIDUNG: Der Schalter haelt bewusst KEINEN React-State. Symbol und
 * zugaenglicher Name haengen an der Klasse `.dark` am `<html>` und damit an
 * CSS. So kann das Server-Markup nie mit dem DOM auseinanderlaufen, das das
 * Inline-Skript vor dem ersten Zeichnen korrigiert hat: kein
 * Hydration-Konflikt, kein Aufblitzen des falschen Symbols.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle(THEME_DARK_CLASS);
    try {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        isDark ? THEME_DARK : THEME_LIGHT,
      );
    } catch {
      /*
       * Privater Modus oder gesperrter Speicher: die Umschaltung gilt dann nur
       * fuer diese Sitzung. Das ist kein Fehler, den jemand beheben koennte —
       * deshalb keine Meldung, sondern stilles Weiterarbeiten.
       */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
        "focus-visible:outline-ring flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
        className,
      )}
    >
      <Sun aria-hidden="true" className="size-5 dark:hidden" />
      <Moon aria-hidden="true" className="hidden size-5 dark:block" />
      {/*
       * Der Name benennt die AKTION, nicht den Zustand — und wechselt wie das
       * Symbol per CSS. `hidden` schlaegt dabei `sr-only`, weil sr-only die
       * display-Eigenschaft nicht anfasst.
       */}
      <span className="sr-only dark:hidden">
        Dunkle Darstellung einschalten
      </span>
      <span className="sr-only hidden dark:block">
        Helle Darstellung einschalten
      </span>
    </button>
  );
}
