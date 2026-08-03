"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

import { cn } from "@/lib/utils";

/*
 * ============================================================================
 * DER AUFKLAPPBARE BEREICH — fuer Text, der dastehen MUSS, aber nicht oben.
 * ============================================================================
 * Erster Anlass ist der rechtliche Hinweis der Empfehlungsseite: er ist Pflicht
 * und trotzdem nicht das, wofuer jemand die Seite aufschlaegt. Zugeklappt bleibt
 * seine Kurzform sichtbar, damit die Klappe nicht das Einzige ist, was von ihm
 * uebrig bleibt.
 *
 * hiddenUntilFound: der Panel-Inhalt bleibt fuer die Seitensuche des Browsers
 * findbar und klappt beim Treffer selbst auf. Bei einem Pflichthinweis ist das
 * genau richtig — er darf nicht deshalb unauffindbar sein, weil er zu ist.
 */
function Collapsible({ className, ...props }: CollapsiblePrimitive.Root.Props) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      className={cn(className)}
      {...props}
    />
  );
}

function CollapsibleTrigger({
  className,
  ...props
}: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "focus-visible:outline-ring rounded-sm text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
      {...props}
    />
  );
}

function CollapsiblePanel({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-panel"
      hiddenUntilFound
      className={cn(className)}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsiblePanel };
