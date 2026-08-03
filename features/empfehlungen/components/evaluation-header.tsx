"use client";

import { motion } from "motion/react";

import { useMotionPreset } from "@/lib/motion";

import { toEvaluationSentence, type EvaluationSummary } from "../rules";

/*
 * ============================================================================
 * DER KOPF DER SEITE — was der Test ergeben hat.
 * ============================================================================
 * Hier stand ein Hero: Produktfoto, "6 Präparate, 1 Beutel pro Tag", 75,00 € im
 * Monat. Damit war die erste Aussage der Seite ein Angebot, und alles darunter
 * las sich als seine Begruendung. Die Reihenfolge ist jetzt umgekehrt: oben
 * steht das ERGEBNIS DER MESSUNG, und was es kostet, steht im Warenkorb — der
 * einen kommerziellen Flaeche dieser Seite.
 *
 * ⚠️ KEIN PREIS, KEIN FOTO, KEINE ANZAHL. Alle drei gehoeren zum Angebot. Das
 * Foto steht wieder in der Lieferkachel ("So kommt es zu dir"), wo es den
 * Versand zeigt, statt die Auswertung zu bewerben.
 *
 * ⚠️ ES IST KEINE SEITENUEBERSCHRIFT (siehe AGENTS.md): kein h1, kein Eyebrow
 * mit dem Seitennamen. Die Overline nennt den TEST, die Schlagzeile SEIN
 * ERGEBNIS. "Deine Empfehlungen" ueber einer Liste von Empfehlungen waere genau
 * die verbotene Ueberschrift mit einem Datum davor.
 *
 * ============================================================================
 * DIE ZAHLEN SIND GERECHNET (toEvaluationSummary) UND ZAEHLEN WERTE.
 * ============================================================================
 * Nicht Praeparate: ein Praeparat aus dem Fragebogen hat keinen Messwert und
 * kommt in "n von m" gar nicht vor. Ohne Vergleichsmessung — der Erstbesuch nach
 * dem ersten Test — gibt es keine Bewegung zu nennen, und die Schlagzeile faellt
 * auf die Ansatzpunkte zurueck.
 *
 * ============================================================================
 * ⚠️ DIE SCHLAGZEILE SAGT "NAEHER AM ZIELBEREICH" UND NICHT "VERBESSERT".
 * ============================================================================
 * Der Entwurf wollte "{n} von {m} Werten haben sich seit {Monat} verbessert".
 * Ueber einer Liste von Praeparaten liest sich das als deren Verdienst, und das
 * waere die Gesundheitsaussage, die diese Seite nirgends macht — dieselbe Frage
 * wie bei jeder Zeile, nur an der auffaelligsten Stelle.
 *
 * ⚠️ ES IST EINE ZURUECKSTELLUNG UND KEINE ABLEHNUNG: die Fassung mit
 * "verbessert" ist fachlich nicht freigegeben. Wenn sie es ist, aendert sich
 * genau diese eine Zeile; das Verbot in den ZEILEN bleibt (ein Test sichert es,
 * siehe test/empfehlungen.test.tsx).
 *
 * Was jetzt dasteht, ist genau das, was gerechnet ist: der Abstand zum
 * Zielbereich ist kleiner geworden (toTargetDistance). Kein Urteil, keine
 * Ursache — eine Lage im Vergleich zu einer frueheren.
 */

export interface EvaluationHeaderProps {
  summary: EvaluationSummary;
  /** Datum des Tests, auf dem die Auswertung beruht. */
  testedOn: string;
  /** Monat des Vortests, mit dem verglichen wird. */
  comparedTo: string;
}

export function EvaluationHeader({
  summary,
  testedOn,
  comparedTo,
}: EvaluationHeaderProps) {
  const motionPreset = useMotionPreset();
  const sentence = toEvaluationSentence(summary);

  return (
    <motion.section
      variants={motionPreset.fadeRise}
      initial="hidden"
      animate="visible"
      aria-label="Ergebnis deines Tests"
      className="surface-card rounded-2xl px-5 py-4"
    >
      <p className="text-muted-foreground text-2xs tabular-nums">
        Dein Test vom {testedOn}
      </p>

      <p className="text-foreground mt-1 text-lg font-semibold">
        {summary.hasPreviousTest ? (
          <>
            <span className="tabular-nums">{summary.closer}</span> von{" "}
            <span className="tabular-nums">{summary.compared}</span> Werten
            liegen näher am Zielbereich als im {comparedTo}
          </>
        ) : summary.newStarts > 0 ? (
          <>
            <span className="tabular-nums">{summary.newStarts}</span>{" "}
            {summary.newStarts === 1 ? "Ansatzpunkt" : "Ansatzpunkte"} in deinen
            Werten gefunden
          </>
        ) : (
          /* Weder Vergleich noch Ansatzpunkt: es gibt nichts zu berichten, und
           * eine 0 waere hier ein Befund ohne Grundlage. */
          "Beim nächsten Test schauen wir erneut"
        )}
      </p>

      {sentence === "" ? (
        <p className="text-muted-foreground max-w-measure mt-1.5 text-xs">
          Sobald ein Wert einen Ansatzpunkt zeigt, steht das passende Präparat
          hier.
        </p>
      ) : (
        <p className="text-muted-foreground max-w-measure mt-1.5 text-xs">
          {sentence}
        </p>
      )}
    </motion.section>
  );
}
