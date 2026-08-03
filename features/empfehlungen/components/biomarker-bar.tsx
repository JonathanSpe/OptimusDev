import type { TargetRange } from "@/contracts";
import { cn } from "@/lib/utils";

import {
  toBarSpoken,
  toBarValue,
  type BiomarkerBarState,
  type BiomarkerReading,
} from "../rules";

/*
 * ============================================================================
 * DER ZIELMARKER ALS SCHIENE — die Begruendung der Zeile, als Lage.
 * ============================================================================
 * Sie ersetzt den grauen Fliesstext, der vorher in der Zeile stand
 * ("25-OH-Vitamin-D 17 → 44 ng/ml"). Der Text war der eigentliche Grund fuer
 * die Empfehlung und sah aus wie eine Fussnote: gleiche Groesse, gleiche Farbe,
 * gleiche Zeile wie die Dosis daneben, und um ihn zu verstehen, musste man drei
 * Zahlen im Kopf zueinander in Beziehung setzen. Als Schiene ist die Beziehung
 * gezeichnet — Start, heute, Ziel —, und man liest die Spalte von oben nach
 * unten statt achtmal quer.
 *
 * ============================================================================
 * ⚠️ SIE TRAEGT KEINE STATUSFARBE. Sie arbeitet mit LAGE.
 * ============================================================================
 * Gruen, Bernstein und Rot beantworten in diesem Produkt genau eine Frage — wo
 * steht ein Messwert — und diese Frage gehoert dem Dashboard und der Analyse.
 * Auf dieser Seite waere eine gruene Schiene ein Befund neben einer Empfehlung
 * (siehe die Farbregel in recommendation-board.tsx).
 *
 * Was die Zustaende unterscheidet, ist deshalb NICHT der Ton, sondern was
 * ueberhaupt gezeichnet wird: ein Ansatzpunkt hat keinen Startwert, eine
 * laufende Einnahme ohne zweite Messung hat keinen Punkt, ein unveraenderter
 * Wert hat seinen Punkt genau auf dem Startstrich. Die drei Graustufen der
 * Schiene sind dieselben, die die Referenz-Schiene des Dashboards benutzt
 * (track-base / track-reference) — dort tragen sie ausdruecklich KEINE
 * Bewertung, sondern Dichte.
 *
 * ============================================================================
 * DIE ACHSE SPANNT NICHT VON NULL.
 * ============================================================================
 * Von 0 bis 300 waere eine Bewegung von 41 auf 68 ein Wimpernschlag. Die Achse
 * nimmt deshalb den engsten Ausschnitt, der Start, heute und Ziel enthaelt, und
 * laesst darum herum Luft: 30 % nach unten, 15 % nach oben. Werte ausserhalb
 * werden an die Enden geklemmt und bekommen dort einen Anschlag — sonst
 * verschwaende ein einzelner Ausreisser die ganze Schiene, und die Bewegung, um
 * die es geht, waere wieder unsichtbar.
 *
 * ⚠️ DIE GRAFIK IST NICHT DIE QUELLE. Sie ist aria-hidden; daneben steht der
 * vollstaendige Wert als Satz (toBarSpoken). Eine Schiene, die man nicht sieht,
 * darf nicht die einzige Stelle sein, an der eine Zahl vorkommt.
 */

/* Luft unter dem kleinsten und ueber dem groessten beteiligten Wert. */
const AXIS_LOWER = 0.7;
const AXIS_UPPER = 1.15;

interface Axis {
  from: number;
  to: number;
  /** Lage eines Werts auf der Schiene, in Prozent, geklemmt auf 0–100. */
  at: (value: number) => number;
  /** Liegt der Wert ausserhalb des gezeichneten Ausschnitts? */
  outside: (value: number) => boolean;
}

function toAxis(values: readonly number[]): Axis {
  const lowest = Math.min(...values);
  const highest = Math.max(...values);

  /*
   * Bei negativen Werten dreht die Multiplikation das Vorzeichen der Luft, und
   * bei 0 gibt sie keine. Beides kommt bei unseren Markern nicht vor, aber ein
   * Diagramm, das bei einem Vorzeichen still falsch wird, ist schlechter als
   * eines mit zwei Zeilen Absicherung.
   */
  const spread = highest - lowest || Math.abs(highest) || 1;
  const from = lowest > 0 ? lowest * AXIS_LOWER : lowest - spread * 0.3;
  const to = highest > 0 ? highest * AXIS_UPPER : highest + spread * 0.15;
  const span = to - from || 1;

  return {
    from,
    to,
    at: (value) => Math.min(100, Math.max(0, ((value - from) / span) * 100)),
    outside: (value) => value < from || value > to,
  };
}

export interface BiomarkerBarProps {
  label: string;
  /*
   * KEINE EINHEIT ALS EIGENE PROP. Sie steckt in `value` und in `spoken`, weil
   * beide Texte sie an verschiedenen Stellen brauchen ("68 ng/ml", "Zielbereich
   * 70 bis 150 ng/ml") — und weil eine Schiene, die selbst formatiert, eine
   * zweite Stelle waere, an der aus Zahl und Einheit ein Text wird.
   */
  baseline: number | null;
  current: number | null;
  targetMin: number;
  targetMax: number;
  state: BiomarkerBarState;
  /** Was im Wertfeld steht. Kommt fertig aus den Regeln (toBarValue). */
  value: string;
  /** Vorgelesene Fassung des vollstaendigen Werts. */
  spoken: string;
  className?: string;
}

export function BiomarkerBar({
  label,
  baseline,
  current,
  targetMin,
  targetMax,
  state,
  value,
  spoken,
  className,
}: BiomarkerBarProps) {
  const axis = toAxis(
    [baseline, current, targetMin, targetMax].filter(
      (value): value is number => value !== null,
    ),
  );

  /*
   * ⚠️ DIESELBE FRAGE WIE DER SATZ DARUNTER, aus derselben Rechnung: "improved"
   * heisst in den Regeln genau "der Wert liegt im Zielbereich" (isInTarget).
   * Der gefuellte Punkt sagt damit dasselbe wie das Wort — vorher sah der Punkt
   * bei Ferritin 68 (Ziel ab 70) aus, als laege er im Segment, weil zwei
   * Einheiten Achse schmaler sind als der Punkt selbst.
   */
  const imZiel = state === "improved";

  return (
    /*
     * FESTE GEOMETRIE, damit die Schienen der Liste auf EINER Linie liegen.
     * Jede der drei Lagen hat ihre eigene Hoehe: Kopfzeile h-4, Schiene h-2,
     * und beides bleibt stehen, auch wenn ein Wert fehlt. Vorher richtete sich
     * die Hoehe nach dem Inhalt, und weil Zeilen mit und ohne Messwert
     * verschieden viel Inhalt haben, lagen die Schienen untereinander auf drei
     * verschiedenen Linien.
     */
    <div className={cn("min-w-0", className)}>
      {/* Ueber der Schiene: links der Marker, rechts der aktuelle Wert. */}
      <p className="flex h-4 items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground min-w-0 truncate">{label}</span>
        <span
          className={cn(
            "shrink-0 tabular-nums",
            /* Ohne Zahl ist es eine Auskunft und kein Wert: kleiner und
             * gedaempft, damit "Wird gemessen" nicht wie ein Messwert wirkt. */
            current === null
              ? "text-muted-foreground text-2xs"
              : "text-foreground font-medium",
          )}
        >
          {value}
        </span>
      </p>

      {/*
       * DIE GRAFIK. aria-hidden, weil sie dieselbe Aussage traegt wie der Satz
       * darunter und der sr-only-Satz daneben — vorgelesen waere sie ein
       * zweites Mal dasselbe, nur ohne Zahlen.
       */}
      <span aria-hidden="true" className="relative mt-2 block h-2 w-full">
        {/* Grundschiene. */}
        <span className="bg-track-base absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full" />

        {/* Der Zielbereich als hinterlegtes Segment — dichteres Grau, kein
         * Gruen: es ist eine Zone und kein Urteil. */}
        <span
          className="bg-track-reference absolute inset-y-0 rounded-full"
          style={{
            left: `${axis.at(targetMin)}%`,
            width: `${axis.at(targetMax) - axis.at(targetMin)}%`,
          }}
        />

        {/* Der Startwert als schmaler Strich. Im Zustand "starting" gibt es
         * keinen — es ist noch nichts gestartet. */}
        {baseline !== null && state !== "starting" ? (
          <span
            className="bg-muted-foreground/50 absolute top-1/2 h-2.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${axis.at(baseline)}%` }}
          />
        ) : null}

        {/*
         * Der aktuelle Wert. GEFUELLT heisst im Zielbereich, OFFEN heisst noch
         * nicht — die Form traegt dieselbe Aussage wie das Wort darunter, und
         * beide kommen aus derselben Rechnung. Der Ring in Kartenfarbe trennt
         * den Punkt vom Startstrich, wenn beide aufeinanderliegen ("flat");
         * sonst waere genau der Fall unsichtbar, der etwas aussagt.
         */}
        {current !== null ? (
          <span
            className={cn(
              "ring-card-solid absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2",
              imZiel
                ? "bg-foreground"
                : "bg-card-solid border-muted-foreground border-2",
            )}
            style={{ left: `${axis.at(current)}%` }}
          />
        ) : null}

        {/* Anschlag, wenn ein Wert ausserhalb des Ausschnitts liegt. */}
        {current !== null && axis.outside(current) ? (
          <span
            className={cn(
              "bg-foreground absolute inset-y-0 w-0.5",
              current < axis.from ? "left-0" : "right-0",
            )}
          />
        ) : null}
      </span>

      {/* Die vollstaendige Angabe fuer Screenreader — die Schiene ist nicht die
       * einzige Quelle. Der sichtbare Satz dazu steht in der Zeile unter der
       * Schiene (toInterpretation), angeschnitten. */}
      <span className="sr-only">{spoken}</span>
    </div>
  );
}

/**
 * Bequemer Aufruf aus einer Zeile: alles, was die Schiene braucht, steckt schon
 * in der Ablesung. Die Zeile soll nicht acht Props von Hand umsortieren — dabei
 * verrutscht irgendwann eines, und ein verrutschter Zielbereich sieht aus wie
 * ein Messwert.
 */
export function BiomarkerBarFromReading({
  reading,
  className,
}: {
  reading: BiomarkerReading;
  className?: string;
}) {
  const range: TargetRange = reading.range;

  return (
    <BiomarkerBar
      label={reading.label}
      baseline={reading.baseline}
      current={reading.current}
      targetMin={range.min}
      targetMax={range.max}
      state={reading.state}
      value={toBarValue(reading)}
      spoken={toBarSpoken(reading)}
      className={className}
    />
  );
}
