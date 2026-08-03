"use client";

import { ChevronDown } from "lucide-react";

import type { Supplement } from "@/contracts";
import { cn } from "@/lib/utils";

import { toReasonDetails } from "../rules";

/*
 * ============================================================================
 * DIE BEGRUENDUNG — sie war da, aber nicht zu sehen.
 * ============================================================================
 * Die Zeile trug ihre Messwerte und dahinter einen grauen Chevron am
 * Produktnamen. Der versprach eine Detailansicht, die es nicht gibt, und
 * beantwortete die Frage nicht, die man an eine Empfehlung hat: WARUM diese.
 *
 * Jetzt klappt die Zeile AN DERSELBEN STELLE auf, an der man sie liest — keine
 * Navigation, kein Ladezustand, keine Rueckkehr. Zwei Bestandteile:
 *
 *   ReasonLink   Rechts in der Zeile, wo vorher der Preis stand: "Begründung"
 *                mit Chevron. Es ist KEINE eigene Schaltflaeche — die ganze
 *                Zeile ist der Ausloeser (siehe unten), und ein Knopf im Knopf
 *                waere weder gueltiges HTML noch bedienbar. Optisch ist es ein
 *                Link, im Dokument ein Teil des Zeilenknopfes.
 *
 *   ReasonPanel  Das Aufgeklappte: der ganze Satz und darunter die Felder, die
 *                es gibt.
 *
 * ⚠️ FEHLENDE FELDER WERDEN WEGGELASSEN (siehe toReasonDetails). Eine Zeile
 * "Nächster Messzeitpunkt: —" ist keine Auskunft.
 *
 * ⚠️ KEINE WIRKAUSSAGE, auch nicht im Aufgeklappten. Hier ist die Versuchung am
 * groessten, weil Platz da ist: ein Satz, was das Praeparat bewirkt, waere eine
 * Gesundheitsaussage und braucht eine Freigabe, die das Projekt nicht hat. Was
 * dasteht, sind Messwerte, Dosis, Herkunft und der naechste Schritt.
 */

/**
 * Der sichtbare Hinweis, dass die Zeile mehr hergibt. Ein `span` und kein
 * `button`: der Ausloeser ist die Zeile.
 */
export function ReasonLink({ open }: { open: boolean }) {
  return (
    <span className="text-foreground text-2xs flex shrink-0 items-center gap-1">
      <span className="underline underline-offset-4">Begründung</span>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "text-faint size-3.5 transition-transform motion-reduce:transition-none",
          open && "rotate-180",
        )}
      />
    </span>
  );
}

export interface ReasonPanelProps {
  prep: Supplement;
  /** Der vollstaendige Satz, der in der Zeile angeschnitten steht. */
  interpretation: string | null;
  id: string;
}

export function ReasonPanel({ prep, interpretation, id }: ReasonPanelProps) {
  const details = toReasonDetails(prep);

  return (
    <div id={id} className="border-border mt-3 border-t pt-3">
      {interpretation === null ? null : (
        <p className="text-muted-foreground max-w-measure text-xs">
          {interpretation}
        </p>
      )}

      {/*
       * Beschreibungsliste und keine Tabelle: es sind Felder zu einem Ding und
       * keine Matrix. Die Bezeichnung steht ueber dem Wert und nicht daneben —
       * in der schmalen Inhaltsspalte brechen zweispaltige Paare sonst an der
       * unguenstigsten Stelle um.
       */}
      <dl className="mt-3 flex flex-col gap-2.5">
        {details.map((detail) => (
          <div key={detail.label}>
            <dt className="text-faint text-3xs font-medium">{detail.label}</dt>
            <dd className="text-muted-foreground max-w-measure mt-0.5 text-xs tabular-nums">
              {detail.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
