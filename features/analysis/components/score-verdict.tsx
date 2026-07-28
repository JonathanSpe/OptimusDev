import { Check, CircleHelp, Minus, X, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  SCORE_BAND_CRITICAL,
  SCORE_BAND_GOOD,
  isVerdictShown,
  toScoreVerdict,
  type ScoreVerdict,
} from "../rules";
import { SCORE_MAX } from "../sample-data";

/*
 * ============================================================================
 * DAS URTEIL, IN EINER SPRACHE — Wort, Zeichen und Farbe zu einem Score.
 * ============================================================================
 * Die Schwelle steht in rules.ts (toScoreVerdict). Wie sie AUSSIEHT, steht
 * hier, und zwar einmal: dieselbe Staffel erscheint an vier Stellen — im Kopf
 * eines Quadranten, in jeder Befundzeile, in der Befundtabelle und als Satz auf
 * der Score-Kachel. Traege eine davon ein eigenes Haekchen oder einen eigenen
 * Bernstein, haette die Seite zwei Vokabeln fuer dasselbe Urteil, und der Leser
 * muesste raten, ob der Unterschied etwas bedeutet.
 *
 * NICHTS NEU ERFUNDEN: die Farben sind die Statusfarben, mit denen die
 * Praeparate-Zeilen seit jeher arbeiten (success / warning / critical), und die
 * Zeichen sind dieselben drei — ✓, —, ✕. Wer die Praeparate gelesen hat, kann
 * das Bereichsfeld ohne Legende lesen.
 *
 * FARBE IST NIE DAS EINZIGE SIGNAL (WCAG 1.4.1). Jede Stufe traegt ihr Zeichen,
 * und wo Platz ist, ihr Wort; die Beschriftung fuer Screenreader nennt es
 * ohnehin. In Graustufen gedruckt bleibt die Seite lesbar — die Zeichen
 * unterscheiden sich in der FORM, nicht nur im Ton.
 *
 * ZWEI FORMEN, und die Zuordnung ist die eigentliche Regel — sie haengt am ORT,
 * nicht am Urteil:
 *
 *   IN DER ZEILE (Zeichen + gefaerbte Ziffer, keine Flaeche) — jeder Befund.
 *   Zehn gefuellte Pillen in einem Feld waeren eine Tapete, und die Zeile hat
 *   ihr Wort ohnehin schon: den Namen des Befunds.
 *
 *   IM KOPF EINES BEREICHS (gefuellte Pille mit Wort) — vier Stellen auf der
 *   Seite, eine je Bereich, und JEDE bekommt eine, "gut" eingeschlossen.
 *
 * ⚠️ HIER STAND EINMAL: die Pille sei den Stufen vorbehalten, die Aufmerksam-
 * keit wollen, "gut" trete ohne Flaeche auf, Beruhigung brauche keine. Auf dem
 * Schirm war das ein Fehler. Vier Koepfe nebeneinander, von denen einer eine
 * Pille traegt und drei nur Text, lesen sich nicht als "einer will etwas von
 * dir" — sie lesen sich als vier verschiedene Bauteile: die Woerter beginnen
 * an verschiedenen Kanten, und der Blick sucht die Reihe, statt sie zu
 * ueberfliegen. Eine Reihe vergleicht man nur, wenn ihre Glieder dieselbe Form
 * haben; WELCHES Urteil dasteht, sagen Zeichen, Wort und Ton, und die sagen es
 * deutlich genug.
 *
 * Die Zurueckhaltung sitzt damit an einer anderen Stelle, aber sie sitzt: es
 * gibt genau vier Pillen auf der Seite, und die zehn Zeilen darunter haben
 * keine.
 *
 * ⚠️ DUENNE DATENLAGE TRAEGT NIE EINE FARBE — dieselbe Regel, die schon Marker
 * mit zu wenigen Messungen von jedem Urteil ausschliesst. Ein unsicher
 * gemessener Wert, der gruen leuchtet, ist eine Entwarnung, die niemand geben
 * kann. Solche Zeilen bekommen das Fragezeichen der Praeparate-Zeilen
 * ("nicht beurteilbar") und bleiben grau. Dass sie grau BLEIBEN, sagt die
 * Erklaerung am Kachelkopf — sonst liest sich das Fehlen als Fehler.
 */

interface VerdictLook {
  /** Das Urteil als Wort. Es steht in der Pille und in jeder Beschriftung. */
  word: string;
  /** Textfarbe von Zeichen, Ziffer und Wort. */
  tone: string;
  /** Zarte Flaeche der Pille. Jede Stufe hat eine — siehe oben, warum. */
  pill: string;
  icon: LucideIcon;
}

const VERDICT_LOOK: Readonly<Record<ScoreVerdict, VerdictLook>> = {
  gut: {
    word: "gut",
    tone: "text-success",
    pill: "bg-success-subtle",
    icon: Check,
  },
  grenzwertig: {
    word: "grenzwertig",
    tone: "text-warning",
    pill: "bg-warning-subtle",
    icon: Minus,
  },
  kritisch: {
    word: "kritisch",
    tone: "text-critical",
    pill: "bg-critical-subtle",
    icon: X,
  },
};

/**
 * Die Lage ohne Urteil: dieselbe Form, aber grau und ohne Behauptung. Dieselbe
 * Zuordnung, die auch die Praeparate-Zeilen fuer "nicht beurteilbar" fahren —
 * neutrale Flaeche, Fragezeichen, Wort. Grau ist hier keine vierte Stufe,
 * sondern das Fehlen aller drei.
 */
const UNJUDGED: VerdictLook = {
  word: "nicht beurteilbar",
  tone: "text-muted-foreground",
  pill: "bg-muted",
  icon: CircleHelp,
};

/**
 * Das Aussehen zu einem Score — oder das graue Nicht-Urteil, wenn die Datenlage
 * zu duenn ist. JEDE Flaeche geht durch diese eine Funktion; wer stattdessen
 * selbst toScoreVerdict aufruft, umgeht dabei die Datenlage-Regel.
 */
function toLook(score: number, confidence: number): VerdictLook {
  return isVerdictShown(confidence)
    ? VERDICT_LOOK[toScoreVerdict(score)]
    : UNJUDGED;
}

/**
 * Das Urteil als Wort, fuer Beschriftungen und Tabellenzellen. Es ist dieselbe
 * Vokabel, die auch in der Pille steht — eine Zeile, die vorgelesen "gut" sagt
 * und gezeigt ein Haekchen hat, ist eine Aussage, nicht zwei.
 */
export function toVerdictWord(score: number, confidence: number): string {
  return toLook(score, confidence).word;
}

/**
 * DASSELBE URTEIL ALS SATZ — fuer die Score-Kachel, und nur fuer sie.
 *
 * Die Kachel ist die einzige dunkle Flaeche im Produkt, und die Statusfarben
 * sind fuer helle Karten gesetzt: auf dem dunklen Grund haelt von ihnen nur
 * success ein AA-Verhaeltnis (siehe die on-score-Familie in tokens.json).
 * ENTSCHEIDUNG: Statt drei neue Toene zu erfinden — die Vorgabe war
 * ausdruecklich, die Palette nicht zu erweitern — traegt die Kachel das Urteil
 * als WORT. Das ist ohnehin die verlaesslichere Haelfte des Signals, und die
 * Kachel bleibt die eine starke Flaeche, statt zusaetzlich zu leuchten.
 *
 * Der Satz nennt die Schwelle mit, weil die 71 sonst auf einer Skala steht, die
 * niemand kennt: "grenzwertig" beantwortet "wie ist es", die Zahl dahinter
 * beantwortet "gemessen woran".
 */
export function toScoreNote(score: number): string {
  switch (toScoreVerdict(score)) {
    case "gut":
      return `Im guten Bereich — der beginnt bei ${SCORE_BAND_GOOD} von ${SCORE_MAX} Punkten.`;
    case "grenzwertig":
      return `Noch grenzwertig — gut beginnt bei ${SCORE_BAND_GOOD} von ${SCORE_MAX} Punkten.`;
    case "kritisch":
      return `Kritisch — das ist unter ${SCORE_BAND_CRITICAL} von ${SCORE_MAX} Punkten.`;
  }
}

export interface VerdictScoreProps {
  score: number;
  confidence: number;
  /** Zeichenstufe von Ziffer und Zeichen. Die Zeile bestimmt sie, nicht diese Datei. */
  className?: string;
}

/**
 * DIE LEISE FORM: Zeichen und Ziffer, beide im Ton des Urteils, sonst nichts.
 *
 * Zeichen und Zahl sind EIN gefaerbtes Element und nicht zwei — sie stehen
 * unmittelbar nebeneinander und tragen denselben Ton. Die Regel "hoechstens
 * eine Farbe je Zeile" ist damit eingehalten, ohne dass die Ziffer ihr Zeichen
 * verliert.
 *
 * Die Zahl bleibt tabellarisch gesetzt: die Spalte der Scores muss sich lesen
 * lassen, ohne dass die Augen wandern, und Ziffern verschiedener Breite tun
 * genau das.
 */
export function VerdictScore({
  score,
  confidence,
  className,
}: VerdictScoreProps) {
  const look = toLook(score, confidence);
  const Symbol = look.icon;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 tabular-nums",
        look.tone,
        className,
      )}
    >
      <Symbol className="size-3.5 shrink-0" strokeWidth={2.5} />
      {score}
    </span>
  );
}

export interface VerdictChipProps {
  score: number;
  confidence: number;
  className?: string;
}

/**
 * DIE FORM FUER DEN KOPF EINES BEREICHS: Pille, Zeichen, Wort — bei jeder Stufe
 * dieselbe. Vier Koepfe stehen nebeneinander und sollen sich VERGLEICHEN
 * lassen; dafuer muessen sie dieselbe Form haben (siehe oben). Unterschieden
 * werden sie durch Zeichen, Wort und Ton, nicht durch An- oder Abwesenheit
 * eines Feldes.
 */
export function VerdictChip({
  score,
  confidence,
  className,
}: VerdictChipProps) {
  const look = toLook(score, confidence);
  const Symbol = look.icon;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-2xs inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 leading-4 font-medium",
        look.pill,
        look.tone,
        className,
      )}
    >
      <Symbol className="size-3 shrink-0" strokeWidth={2.5} />
      {look.word}
    </span>
  );
}
