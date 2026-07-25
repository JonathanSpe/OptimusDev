"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Seitliches Panel auf Basis von Base UI Dialog. Fokus-Faenger, Escape,
 * Scroll-Sperre und Rueckgabe des Fokus an den Ausloeser bringt der Dialog
 * mit — hier kommt nur die Positionierung an der Bildschirmkante dazu.
 */

function Sheet(props: Dialog.Root.Props) {
  return <Dialog.Root {...props} />;
}

function SheetTrigger(props: Dialog.Trigger.Props) {
  return <Dialog.Trigger data-slot="sheet-trigger" {...props} />;
}

/**
 * "glass" ist die helle Standardflaeche. "rail" ist die Flaeche der
 * Kontext-Leiste: unter xl wandert die Leiste in dieses Panel und muss dort
 * dieselbe Flaechenebene behalten, sonst wechselt der Inhalt beim Umbruch
 * seinen Untergrund und alle Textrollen darauf waeren falsch.
 */
export type SheetSurface = "glass" | "rail";

// title ist hier die Überschrift des Panels, nicht das HTML-title-Attribut.
interface SheetContentProps extends Omit<Dialog.Popup.Props, "title"> {
  side?: "left" | "right";
  surface?: SheetSurface;
  /** Zugaenglicher Name des Panels — Pflicht, auch wenn er verborgen ist. */
  title: ReactNode;
  /** Titel nur fuer Screenreader ausgeben. */
  hideTitle?: boolean;
  children: ReactNode;
}

function SheetContent({
  side = "right",
  surface = "glass",
  title,
  hideTitle = false,
  className,
  children,
  ...props
}: SheetContentProps) {
  const isRail = surface === "rail";

  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="bg-foreground/25 fixed inset-0 z-40 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
      <Dialog.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 z-50 flex w-80 max-w-full flex-col p-5 transition-transform motion-reduce:transition-none",
          isRail ? "rail-panel" : "glass-strong",
          side === "right"
            ? "right-0 data-ending-style:translate-x-full data-starting-style:translate-x-full"
            : "left-0 data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
          className,
        )}
        {...props}
      >
        <div className="flex shrink-0 items-center justify-between gap-3">
          <Dialog.Title
            className={cn(
              "text-base font-semibold",
              isRail ? "text-on-rail" : "text-foreground",
              hideTitle && "sr-only",
            )}
          >
            {title}
          </Dialog.Title>
          {/*
           * Die Schaltflaeche liegt bewusst im Panel: mit Touch-Screenreader
           * gibt es keine Escape-Taste, um wieder herauszukommen.
           */}
          <Dialog.Close
            aria-label="Schließen"
            className={cn(
              "ml-auto flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
              isRail
                ? "text-on-rail-muted hover:text-on-rail hover:bg-on-rail/10 focus-visible:outline-ring-on-rail"
                : "text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-ring",
            )}
          >
            <X aria-hidden="true" className="size-4" />
          </Dialog.Close>
        </div>
        {/* flex-col, damit Inhalte mit flex-1 (z. B. die Navigation) die Hoehe füllen. */}
        <div className="-mx-1 mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
          {children}
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

export { Sheet, SheetContent, SheetTrigger };
export type { SheetContentProps };
