"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

/*
 * ============================================================================
 * DER SCHALTER — ein Zustand, kein Verb.
 * ============================================================================
 * Er steht in den Empfehlungszeilen, wo vorher "Entfernen" stand. Der
 * Unterschied ist nicht kosmetisch: "Entfernen" ist eine Handlung, und an einer
 * Liste, die zum Grossteil aus bereits Vorgemerktem besteht, war es die
 * haeufigste Aufschrift der Seite — die destruktive. Ein Schalter sagt
 * stattdessen, WORAUF die Zeile steht, und ist in beide Richtungen einen Klick
 * weit.
 *
 * ⚠️ KEINE STATUSFARBE UND AUCH NICHT DIE MARKE. Die eingeschaltete Bahn war
 * markenrot, und auf der Empfehlungsseite standen davon acht untereinander: eine
 * Reihe roter Flaechen, die einen Zustand zeigten, direkt neben der EINEN roten
 * Handlung der Seite (der Bestaetigung im Warenkorb). Rot ist dort die Marke und
 * darf nicht auch der Zustand sein. Die Bahn ist deshalb graphitfarben — der
 * Kontrast zwischen aus und an bleibt derselbe, die Bedeutung von Rot auch.
 *
 * Die Farbe traegt die Aussage ohnehin nicht allein: der Daumen wandert, und der
 * zugaengliche Name kommt aus dem Label daneben.
 *
 * Der Ring kommt aus derselben Familie wie bei Button und Toggle, damit der
 * Fokus auf allen drei gleich aussieht.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "border-border bg-muted focus-visible:border-ring focus-visible:ring-ring/50 data-[checked]:bg-foreground data-[checked]:border-foreground relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="bg-background size-4 rounded-full shadow-sm transition-transform data-[checked]:translate-x-4 motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
