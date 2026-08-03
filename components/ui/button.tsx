import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        /*
         * Die rail-Varianten gehoeren auf die Kontext-Leiste. Sie ziehen Text,
         * Rahmen, Hover-Flaeche und Fokus-Ring ausschliesslich aus den
         * on-rail-Tokens — so bleiben sie richtig, wenn die Leiste ihre
         * Flaeche wechselt, waehrend muted/primary daran zerbrechen wuerden.
         */
        /*
         * DIE EINE GEFUELLTE. Sie traegt die primaere Handlung einer Kachel —
         * heute genau eine, "Änderungen bestätigen" im Warenkorb.
         *
         * Ihre FLAECHE kommt aus der Marke und nicht aus der on-rail-Familie,
         * und das ist Absicht: ein gefuellter Knopf bringt seinen eigenen Grund
         * mit, deckend und in beiden Modi gleich — er haengt nicht davon ab,
         * worauf er steht. Was davon abhaengt, ist der FOKUS-RING, denn der
         * zeichnet auf die Flaeche daneben; er kommt deshalb aus on-rail.
         *
         * ⚠️ Rot bleibt auf der Leiste EIN Ding pro Seite. Wo diese Variante
         * steht, darf die Nächster-Test-Kachel mit ihrem Countdown nicht stehen
         * — siehe AGENTS.md.
         */
        railPrimary:
          "bg-primary text-primary-foreground hover:bg-primary/80 focus-visible:border-ring-on-rail focus-visible:ring-ring-on-rail/40",
        railGhost:
          "text-on-rail-muted hover:bg-on-rail/10 hover:text-on-rail focus-visible:border-ring-on-rail focus-visible:ring-ring-on-rail/40",
        railOutline:
          "border-rail-line-strong text-on-rail hover:bg-on-rail/10 focus-visible:border-ring-on-rail focus-visible:ring-ring-on-rail/40",
        railLink:
          "text-on-rail-brand underline underline-offset-4 hover:no-underline focus-visible:border-ring-on-rail focus-visible:ring-ring-on-rail/40",
        /*
         * Gefahr auf der Leiste, zart hinterlegt wie die Variante destructive
         * auf der Inhaltsflaeche — orangerotes Danger-Rot, nicht die Marke.
         * Traegt nie allein: daneben stehen Zeichen und Wort.
         */
        railDestructive:
          "bg-critical-on-rail/10 text-critical-on-rail hover:bg-critical-on-rail/20 focus-visible:border-critical-on-rail/40 focus-visible:ring-critical-on-rail/20",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
