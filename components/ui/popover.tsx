"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/lib/utils";

/*
 * Ein Popover ist der KLICK-Verwandte des Tooltips, und der Unterschied ist
 * kein Geschmack: ein Tooltip oeffnet auf Hover und Fokus und ist damit auf
 * einem Touchgeraet nicht erreichbar. Alles, was der Leser BEWUSST aufruft —
 * eine Erklaerung zum Beispiel — muss ein Popover sein, sonst gibt es Geraete,
 * auf denen der Inhalt nicht existiert.
 *
 * Das Aussehen ist bewusst dasselbe wie beim Tooltip: es ist dieselbe Sorte
 * fluechtiger Text ueber der Oberflaeche, und zwei Blasenformen fuer dieselbe
 * Rolle waeren zwei Sprachen.
 */

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "bg-foreground text-background data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 w-fit max-w-xs origin-(--transform-origin) rounded-md px-3 py-2 text-xs",
            className,
          )}
          {...props}
        >
          {children}
          <PopoverPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] data-[side=bottom]:top-1 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
