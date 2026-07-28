import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * ============================================================================
 * DIE BEWEGUNG EINES SCORES — Pfeil, Zahl, Wort, und dreimal dasselbe.
 * ============================================================================
 * Der Snapshot zeigt dieselbe Bewegung an drei Stellen: am Ring eines Bereichs,
 * am Ende seiner Verlaufslinie und in der Tabelle darunter. Stuende die
 * Zuordnung "gestiegen ist gruen" in jeder Kachel neu, waere sie irgendwann
 * dreimal verschieden — und der Leser sieht dann nicht drei Bauteile, sondern
 * einen Widerspruch: derselbe Bereich, oben gruen, unten grau.
 *
 * HIER DARF DIE RICHTUNG BEWERTET WERDEN — aber nur bei SCORES. Ein Score ist
 * per Konstruktion so gebaut, dass hoeher besser ist; er hat keine zwei Enden
 * wie ein Laborwert. Fuer MARKER entscheidet weiterhin die am Marker
 * hinterlegte guenstige Richtung (toChangeReading in rules.ts) — dort ist ein
 * fallender Wert mal die Erholung und mal das Problem.
 *
 * DIE FARBE STEHT NIE ALLEIN: Pfeil, Vorzeichen und Wort sagen dasselbe. Das
 * Wort nur fuer Screenreader — sichtbar traegt es schon der Pfeil.
 *
 * Und weil sie nie allein steht, kann sie auch WEGGELASSEN werden, wo sie mit
 * einer anderen Farbe kollidiert (siehe `neutral`). Die Zuordnung bleibt
 * trotzdem an dieser einen Stelle: verschieden ist dann nicht die Regel,
 * sondern eine ausdrueckliche Ausnahme mit Begruendung.
 */

export type ScoreMove = "gestiegen" | "gefallen" | "unveraendert";

const deltaFormat = new Intl.NumberFormat("de-DE", {
  signDisplay: "exceptZero",
  maximumFractionDigits: 0,
});

/**
 * "±0" statt "0": eine Null OHNE Vorzeichen liest sich wie ein fehlender Wert,
 * eine Null MIT Vorzeichen behauptet eine Richtung, die es nicht gab.
 */
export function toDeltaText(points: number): string {
  return points === 0 ? "±0" : deltaFormat.format(points);
}

export function toScoreMove(delta: number): ScoreMove {
  if (delta > 0) return "gestiegen";
  if (delta < 0) return "gefallen";
  return "unveraendert";
}

const MOVE_LOOK = {
  gestiegen: { label: "gestiegen", tone: "text-success", icon: ArrowUpRight },
  gefallen: { label: "gefallen", tone: "text-warning", icon: ArrowDownRight },
  unveraendert: {
    label: "unverändert",
    tone: "text-muted-foreground",
    icon: ArrowRight,
  },
} as const satisfies Record<
  ScoreMove,
  { label: string; tone: string; icon: unknown }
>;

export interface ScoreDeltaProps {
  /** Punkte gegenueber dem vorherigen Test. Das Vorzeichen ist die Richtung. */
  delta: number;
  /**
   * true = die Bewegung liegt im Rauschband. Dann bleibt sie GRAU: eine Zahl
   * unterhalb der Streuung als Erfolg oder Ruecksetzer einzufaerben behauptet
   * einen Trend, den die Daten nicht hergeben. Sie steht trotzdem da —
   * verschwiegen wird nichts.
   */
  quiet?: boolean;
  /**
   * true = ohne Richtungsfarbe, aber mit Pfeil und Vorzeichen.
   *
   * Fuer Zeilen, in denen bereits eine ANDERE Farbe eine ANDERE Aussage macht.
   * Im Kopf eines Bereichs steht seit dem Urteil beides nebeneinander: das
   * gruene Haekchen sagt "der Score ist gut", der gruene Pfeil sagt "er ist
   * gestiegen" — zwei Bedeutungen fuer einen Ton, eine Zeile auseinander. Der
   * Leser haette bei einem gestiegenen, aber kritischen Bereich Gruen und Rot
   * uebereinander und muesste beide erst sortieren.
   *
   * Verloren geht dabei nichts: Richtung traegt der Pfeil, Betrag das
   * Vorzeichen, und die Beschriftung nennt beides ohnehin in Worten. Die Farbe
   * war hier die dritte Kopie derselben Angabe.
   *
   * NICHT dasselbe wie `quiet`: das ist ein BEFUND ueber die Messung ("liegt im
   * Rauschband") und sagt es auch vorgelesen. Dies hier ist eine Ruecksicht auf
   * die Nachbarschaft und aendert an der Aussage nichts.
   */
  neutral?: boolean;
  className?: string;
}

export function ScoreDelta({
  delta,
  quiet = false,
  neutral = false,
  className,
}: ScoreDeltaProps) {
  const move = toScoreMove(delta);
  const look = MOVE_LOOK[move];
  const Icon = look.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums",
        quiet || neutral ? "text-muted-foreground" : look.tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      {toDeltaText(delta)}
      <span className="sr-only">
        {" "}
        Punkte seit dem letzten Test, {look.label}
        {quiet ? ", im Rauschband" : ""}
      </span>
    </span>
  );
}
