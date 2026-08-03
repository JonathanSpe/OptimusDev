"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { useMotionPreset } from "@/lib/motion";

import { toEuro, toEuroDelta, type SubscriptionChange } from "../rules";

/*
 * ============================================================================
 * DIE AENDERUNGSLEISTE — was sich am Abo aendert, nicht was es kostet.
 * ============================================================================
 * ⚠️ SIE IST DIE FASSUNG FUER SCHMALE SCHIRME. Ab xl steht dieselbe Aussage im
 * Warenkorb der Kontext-Leiste (subscription-cart.tsx), und dann erscheint
 * diese Leiste NICHT — zwei Bestaetigen-Schaltflaechen im selben Bild waeren
 * eine zu viel. Welche von beiden dran ist, entscheidet die Tafel an genau
 * einer Stelle.
 *
 * ES IST EIN ABO. Deshalb steht hier nicht "Gesamt 82,10 €", sondern die
 * BEWEGUNG: bisherige Summe, neue Summe, Differenz. Eine Gesamtsumme waere die
 * Rechnung eines Einzelkaufs und verschwiege genau die Zahl, wegen der man
 * hinsieht — naemlich um wie viel es teurer oder guenstiger wird.
 *
 * SIE ENTSTEHT ERST, WENN ES ETWAS ZU BESTAETIGEN GIBT. Eine Leiste, die
 * dauerhaft am Fuss klebt und "±0,00 €" meldet, ist Moebel: sie kostet auf
 * jedem Bildschirm Hoehe und sagt nichts. Ohne Aenderung ist die Seite eine
 * reine Liste.
 *
 * WARUM STICKY UND NICHT FIXED: position:sticky haelt das Element im
 * Dokumentfluss. Es klebt am unteren Rand der INHALTSSPALTE — nicht am Fenster
 * — und wandert am Ende der Liste in seine natuerliche Lage. Damit verdeckt es
 * nichts dauerhaft, braucht keinen reservierten Platz darunter, und das
 * Shell-Raster (Panel, Kontext-Leiste, Icon-Leiste) bleibt unangetastet. Ein
 * fixed-Element haette sich ueber die Kontext-Leiste gelegt.
 *
 * ============================================================================
 * DIE BESTAETIGUNG HAT ZWEI STUFEN, ABER NUR WENN GEKUENDIGT WIRD.
 * ============================================================================
 * Etwas hinzuzufuegen ist eine Bestellung; sie ist mit einem Knopf getan.
 * Etwas ABZUSETZEN ist eine Kuendigung — sie beendet eine laufende Einnahme,
 * und das ist nicht dasselbe wie eine Zeile weniger im Korb. Enthaelt die
 * Aenderung Abgaenge, tauscht der Knopf die Leiste gegen eine Rueckfrage, die
 * die betroffenen Praeparate BEIM NAMEN nennt.
 *
 * ENTSCHEIDUNG: Das ist eine zweite Stufe IN der Leiste und kein modaler
 * Dialog. Es gibt im Projekt keine AlertDialog-Komponente, und einen
 * Fokus-Faenger fuer eine Frage einzufuehren, die aus zwei Knoepfen besteht,
 * waere mehr Maschinerie als Schutz. Die Stufe steht dort, wo die Handlung
 * ausgeloest wurde, und ist mit "Zurück" folgenlos zu verlassen.
 *
 * Ob sie ansteht, weiss diese Leiste nicht selbst — es kommt als Prop aus der
 * Tafel. Sonst haetten Leiste und Warenkorb je einen eigenen Stand davon, und
 * wer beim Verbreitern des Fensters gerade in der Rueckfrage steht, faende
 * sich drueben wieder am Anfang.
 */

export interface SubscriptionBarProps {
  change: SubscriptionChange;
  /** Steht die Kuendigungs-Rueckfrage an? Abgeleitet in der Tafel. */
  showConfirm: boolean;
  /** Erste Stufe: bestaetigen — oder in die Rueckfrage, wenn etwas abgeht. */
  onRequestConfirm: () => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function SubscriptionBar({
  change,
  showConfirm,
  onRequestConfirm,
  onBack,
  onConfirm,
}: SubscriptionBarProps) {
  const motionPreset = useMotionPreset();

  const hasChanges = change.added.length + change.removed.length > 0;

  return (
    <AnimatePresence initial={false}>
      {hasChanges ? (
        <motion.div
          variants={motionPreset.fadeRise}
          initial="hidden"
          animate="visible"
          exit="hidden"
          /*
           * bottom-0 und nicht bottom-4: die Klebekante misst gegen die
           * PADDING-Box der Inhaltsspalte, und die hat unten bereits ein
           * Polster (pb-10 im (app)-Layout). Mit einem zusaetzlichen Abstand
           * schwebte die Leiste 56px ueber der Panelkante, und darunter blitzte
           * die naechste Zeile hervor — das sieht aus wie ein Fehler und nicht
           * wie eine Leiste.
           */
          className="sticky bottom-0 z-10 mt-6"
        >
          {/* shadow-lift statt des Kachel-Schattens: die Leiste liegt
           * ueber der Liste und nicht in ihr, und genau das ist die Stufe,
           * die das Token beschreibt. */}
          <div className="surface-card shadow-lift rounded-2xl p-4">
            {showConfirm ? (
              <CancelConfirm
                change={change}
                onBack={onBack}
                onConfirm={onConfirm}
              />
            ) : (
              <ChangeSummary change={change} onNext={onRequestConfirm} />
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Erste Stufe: die Bilanz und ein Knopf. */
function ChangeSummary({
  change,
  onNext,
}: {
  change: SubscriptionChange;
  onNext: () => void;
}) {
  const parts = [
    change.added.length > 0 ? `${change.added.length} kommt dazu` : null,
    change.removed.length > 0
      ? `${change.removed.length} wird abgesetzt`
      : null,
  ].filter((part) => part !== null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <p className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
          Änderung am Abo
        </p>
        {/*
         * Die drei Zahlen in einer Zeile: bisher, neu, Differenz. Der Pfeil
         * dazwischen ist dieselbe Lesart wie in den Messwerten der Zeilen
         * darueber ("17 → 44") — von wo nach wo.
         */}
        <p className="text-foreground mt-1 flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums">
          <span className="text-muted-foreground line-through">
            {toEuro(change.beforeCents)}
          </span>
          <ArrowRight
            aria-hidden="true"
            className="text-faint size-3.5 self-center"
          />
          <span className="font-semibold">{toEuro(change.afterCents)}</span>
          <span className="text-muted-foreground">
            im Monat · {toEuroDelta(change.deltaCents)}
          </span>
          <span className="sr-only">
            Bisher {toEuro(change.beforeCents)} im Monat, neu{" "}
            {toEuro(change.afterCents)} im Monat, Unterschied{" "}
            {toEuroDelta(change.deltaCents)}.
          </span>
        </p>
        {parts.length > 0 ? (
          <p className="text-muted-foreground mt-0.5 text-xs">
            {parts.join(" · ")}
          </p>
        ) : null}
      </div>

      {/*
       * Der einzige rote Punkt dieser Seite. Rot ist hier kein Urteil ueber
       * einen Messwert, sondern die primaere Handlung — der Gebrauch, den
       * AGENTS.md fuer die Marke vorsieht.
       */}
      <Button onClick={onNext} size="lg">
        Änderungen bestätigen
      </Button>
    </div>
  );
}

/** Zweite Stufe: nur bei Abgaengen, und sie nennt sie beim Namen. */
function CancelConfirm({
  change,
  onBack,
  onConfirm,
}: {
  change: SubscriptionChange;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const names = change.removed.map((prep) => prep.name).join(", ");

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {/*
         * Warnfarbe UND Zeichen UND Wort: der Ton allein traegt die Aussage
         * nicht. Es sind die Danger-Token und NICHT das Marken-Rot — Rot ist
         * hier die Bestaetigung, und dieselbe Farbe fuer Warnung und Zustimmung
         * waere die schlechteste Stelle im ganzen Produkt dafuer.
         */}
        <p className="text-destructive flex items-center gap-1.5 text-sm font-medium">
          <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
          {change.removed.length === 1
            ? "Ein Präparat wird abgesetzt"
            : `${change.removed.length} Präparate werden abgesetzt`}
        </p>
        <p className="text-muted-foreground max-w-measure mt-1 text-xs">
          {names} — die Einnahme endet mit der nächsten Lieferung. Das ist eine
          Kündigung dieser Position und lässt sich danach nur durch eine neue
          Aufnahme rückgängig machen.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="lg" onClick={onBack}>
          Zurück
        </Button>
        <Button variant="destructive" size="lg" onClick={onConfirm}>
          Absetzen und bestätigen
        </Button>
      </div>
    </div>
  );
}
