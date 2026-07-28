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
 * ZWEI LAUTSTAERKEN, und die Zuordnung ist die eigentliche Regel:
 *
 *   LEISE (Zeichen + gefaerbte Ziffer, keine Flaeche) — jede Befundzeile, und
 *   "gut" ueberall. Zehn gefuellte Pillen in einem Feld waeren eine Tapete;
 *   und eine Entwarnung, die so laut auftritt wie ein Befund, macht die
 *   Lautstaerke bedeutungslos. Beruhigung braucht keine Flaeche.
 *
 *   LAUT (gefuellte Pille mit Wort) — nur "grenzwertig" und "kritisch", und nur
 *   im Kopf eines Bereichs. Das sind hoechstens vier Stellen auf der Seite,
 *   und sie sind die einzigen, an denen die Seite jemanden anspricht.
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
  /** Zarte Flaeche — nur die lauten Stufen haben eine. */
  pill: string | null;
  icon: LucideIcon;
}

const VERDICT_LOOK: Readonly<Record<ScoreVerdict, VerdictLook>> = {
  gut: {
    word: "gut",
    tone: "text-success",
    /* Kein Feld: "gut" ist die Entwarnung, und die tritt leise auf. */
    pill: null,
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

/** Die Lage ohne Urteil: dieselbe Form, aber grau und ohne Behauptung. */
const UNJUDGED: VerdictLook = {
  word: "nicht beurteilbar",
  tone: "text-muted-foreground",
  pill: null,
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
 * DIE LAUTE FORM — aber nur, wo sie laut sein darf. "grenzwertig" und
 * "kritisch" bekommen die gefuellte Pille, "gut" und das Nicht-Urteil stehen
 * ohne Flaeche da. Der Unterschied ist Absicht: die Kachel soll auf einen Blick
 * zeigen, WIE VIELE Bereiche etwas von einem wollen, und das kann sie nur,
 * wenn nicht alle vier eine Pille tragen.
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
        "text-2xs inline-flex items-center gap-1 rounded-full leading-4 font-medium",
        /* Die Pille braucht Innenabstand, die leise Form nicht — sonst stuende
         * das Wort um zwei Pixel eingerueckt neben dem Namen darueber. */
        look.pill === null ? "" : cn("px-1.5 py-0.5", look.pill),
        look.tone,
        className,
      )}
    >
      <Symbol className="size-3 shrink-0" strokeWidth={2.5} />
      {look.word}
    </span>
  );
}
