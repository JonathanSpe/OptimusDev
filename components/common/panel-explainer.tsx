"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/*
 * ============================================================================
 * DAS ⓘ AM KACHELKOPF — die Erklaerung, die man sich holt.
 * ============================================================================
 * Jede Kachel der Analyse hatte einen Erklaersatz unter ihrer Ueberschrift.
 * Einzeln war jeder davon richtig; zusammen standen auf einer Seite fuenf
 * Absaetze, die erklaeren, was man sieht, BEVOR man es sieht — und der Leser
 * las sie genau einmal. Danach waren sie vier Zeilen Vorspann vor jedem Inhalt.
 *
 * Deshalb steht die Erklaerung jetzt HINTER einem Zeichen am Kopf: beim ersten
 * Mal holt man sie sich, danach nicht mehr. Was dabei NICHT passieren darf, ist
 * dass sie verschwindet — sie ist der Ort, an dem eine Notation in Worte gefasst
 * wird (was ein blasser Strich bedeutet, was die Punkte zaehlen). Genau deshalb
 * ist das hier ein Popover und kein Tooltip: ein Tooltip oeffnet auf Hover, und
 * auf einem Touchgeraet gibt es keinen.
 *
 * WAS HIER NICHT HINEINGEHOERT: alles, was aus den Daten kommt. Ein Befund
 * ("2 von 5 Praeparaten wirken") steht sichtbar auf der Kachel, auch wenn er
 * ein Satz ist. Hinter das Zeichen gehoert nur, was die Kachel ueber SICH
 * SELBST sagt — sonst versteckt man Inhalt hinter einem Symbol.
 */

export interface PanelExplainerProps {
  /**
   * Was die Schaltflaeche ansagt, als vollstaendige Frage — "Was zeigt diese
   * Kachel?" waere fuenfmal derselbe Text in einer Vorlesereihe. Er benennt
   * deshalb die Kachel: "Was der Optimus Score zeigt".
   */
  label: string;
  /** Die Erklaerung. Ein bis drei Saetze; laenger ist ein Hilfeartikel. */
  children: ReactNode;
  /**
   * Auf welcher Flaeche das Zeichen sitzt. "score" ist die dunkle Kachel — dort
   * kommen Farbe und Fokusring aus der on-score-Familie, alles andere waere auf
   * dunklem Grund unsichtbar.
   */
  surface?: "card" | "score";
  className?: string;
}

export function PanelExplainer({
  label,
  children,
  surface = "card",
  className,
}: PanelExplainerProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className={cn(
          /*
           * 24px Trefferflaeche um ein 16px-Zeichen: die WCAG-Mindestgroesse
           * fuer ein Ziel (2.5.8). Das Zeichen selbst kleiner zu machen und die
           * Flaeche zu behalten geht — umgekehrt nicht.
           */
          "grid size-6 shrink-0 place-items-center rounded-full transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          surface === "score"
            ? "text-on-score-muted hover:text-on-score focus-visible:outline-on-score"
            : "text-faint hover:text-muted-foreground focus-visible:outline-ring",
          className,
        )}
      >
        <Info aria-hidden="true" className="size-4" />
      </PopoverTrigger>
      {/*
       * Die Blase haengt sich UNTER das Zeichen und nach links: am Kachelkopf
       * sitzt das Zeichen ganz rechts, und eine zentrierte Blase liefe dort aus
       * der Kachel. Base UI schiebt sie zusaetzlich selbst in den Viewport.
       */}
      <PopoverContent
        aria-label={label}
        side="bottom"
        align="end"
        className="leading-5"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
