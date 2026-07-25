"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Segmentierter Umschalter fuer genau EINE Auswahl aus wenigen Optionen
 * (Ansicht, Zeitraum). Er steht auf der Radio-Gruppe von Base UI und ist damit
 * eine echte radiogroup: Pfeiltasten wechseln die Auswahl, Tab springt in die
 * Gruppe und wieder heraus, und jede Option meldet ihren Zustand an
 * Screenreader. Eine Reihe aus <button>-Elementen kann das nicht — dort weiss
 * die Hilfstechnik nicht, dass die Optionen zusammengehoeren.
 *
 * NICHT dafuer gedacht, eine Aktion auszuloesen. Der Umschalter waehlt eine
 * Darstellung; alles, was etwas TUT, bleibt eine Schaltflaeche.
 */

export interface SegmentedControlOption<Value extends string> {
  value: Value;
  label: string;
  /** Optionales Icon vor der Beschriftung. Reine Dekoration. */
  icon?: ReactNode;
}

export interface SegmentedControlProps<Value extends string> {
  /** Zugaenglicher Name der Gruppe — Pflicht, auch wenn er verborgen ist. */
  label: string;
  options: readonly SegmentedControlOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  className?: string;
}

export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: SegmentedControlProps<Value>) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(next: Value) => onValueChange(next)}
      className={cn(
        "bg-foreground/5 inline-flex shrink-0 items-center gap-0.5 rounded-xl p-0.5",
        className,
      )}
    >
      {options.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          /*
           * Die gewaehlte Option traegt eine DECKENDE Flaeche mit Schatten — sie
           * liegt sichtbar auf der Rille. Farbe ist dabei nie das einzige
           * Signal: die Auswahl steht als aria-checked im Baum.
           */
          className={cn(
            "focus-visible:outline-ring flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
            "text-muted-foreground data-unchecked:hover:text-foreground",
            "data-checked:bg-card-solid data-checked:text-foreground data-checked:shadow-sm",
            "[&_svg]:size-3.5 [&_svg]:shrink-0",
          )}
        >
          {option.icon ? (
            <span aria-hidden="true" className="flex">
              {option.icon}
            </span>
          ) : null}
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
