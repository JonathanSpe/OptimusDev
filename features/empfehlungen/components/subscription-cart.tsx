"use client";

import {
  AlertTriangle,
  ArrowRight,
  Settings2,
  ShoppingCart,
} from "lucide-react";
import { motion } from "motion/react";

import { RailTile } from "@/components/common/context-rail";
import { Button } from "@/components/ui/button";
import type { Supplement } from "@/contracts";
import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  EVALUATION_DATE,
  isInNextSubscription,
  toEuro,
  toEuroDelta,
  type PendingChanges,
  type SubscriptionChange,
} from "../rules";

/*
 * ============================================================================
 * DER WARENKORB — dieselbe Aussage wie die Fussleiste, an einem anderen Platz.
 * ============================================================================
 * Ab xl steht er in der Kontext-Leiste, darunter uebernimmt die klebende
 * Fussleiste (subscription-bar.tsx). WELCHER von beiden erscheint, entscheidet
 * die Tafel an genau einer Stelle — nicht diese Datei.
 *
 * Beide zeigen dieselbe Bilanz und beide holen sie aus toSubscriptionChange.
 * Was sie NICHT selbst tun: rechnen und den Stand der Bestaetigung halten. Das
 * liegt in der Tafel, damit die zwei Plaetze nicht auseinanderlaufen koennen —
 * wer beim Umschalten der Fensterbreite gerade in der Rueckfrage steht, steht
 * danach immer noch darin.
 *
 * ============================================================================
 * ER IST BEIM AUFSCHLAGEN NICHT LEER — und sagt das auch.
 * ============================================================================
 * Der Korb steht auf dem VORSCHLAG aus der letzten Auswertung, siehe
 * toRecommendedChanges in ../rules. Damit gilt fuer die Aufschrift oben eine
 * Bedingung, die nicht verhandelbar ist: solange etwas vorgemerkt ist, das der
 * Nutzer nicht selbst vorgemerkt hat, MUSS dort stehen, dass es ein Vorschlag
 * ist und woher er kommt. Ein vorbefuellter Korb ohne diesen Satz ist ein
 * untergeschobener Korb.
 *
 * ============================================================================
 * WAS IM KORB STEHT: DER LAUFENDE STAND PLUS DIE VORMERKUNGEN.
 * ============================================================================
 * Also auch die Positionen, die ABGEHEN sollen — durchgestrichen und benannt.
 * Sie einfach verschwinden zu lassen waere die schlechtere Wahl: dann bliebe
 * von einem Klick nur eine Summe, die kleiner geworden ist, und die Position
 * waere aus dem Korb nicht mehr zurueckzuholen. Dieselbe Regel wie in der
 * Liste daneben, wo eine entfernte Zeile stehen bleibt.
 *
 * ============================================================================
 * FARBE UND FLAECHE
 * ============================================================================
 * Der Korb steht auf der Kontext-Leiste und nimmt deshalb ausschliesslich die
 * on-rail-Rollen und die rail-Varianten der Schaltflaechen.
 *
 * Zwei farbige Stellen, beide Handlungen, keine davon ein Urteil ueber einen
 * Messwert — dieselbe Regel wie auf der ganzen Seite:
 *   - "Änderungen bestätigen" in Marken-Rot (railPrimary). Es ist damit das
 *     EINE rote Ding auf der Leiste dieser Seite; die Nächster-Test-Kachel mit
 *     ihrem roten Countdown steht hier bewusst nicht (siehe AGENTS.md und
 *     app/(app)/@rail/empfehlungen).
 *   - die Kuendigungswarnung im Danger-Rot (criticalOnRail), mit Zeichen UND
 *     Wort. Ausdruecklich NICHT das Marken-Rot: auf derselben Kachel bestaetigt
 *     eine markenrote Schaltflaeche, und dieselbe Farbe fuer Warnung und
 *     Zustimmung waere die schlechteste Stelle im Produkt dafuer.
 * Kein Gruen, kein Bernstein, nirgends: der Korb faellt keinen Befund.
 *
 * ⚠️ KEINE WIRKAUSSAGE, wie ueberall auf dieser Seite. Der Korb nennt Namen,
 * Dosis und Preis — nie, wogegen etwas hilft.
 */

export interface SubscriptionCartProps {
  supplements: readonly Supplement[];
  pending: PendingChanges;
  change: SubscriptionChange;
  /** Steht die Kuendigungs-Rueckfrage an? Abgeleitet in der Tafel. */
  showConfirm: boolean;
  /** Erste Stufe: bestaetigen — oder in die Rueckfrage, wenn etwas abgeht. */
  onRequestConfirm: () => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function SubscriptionCart({
  supplements,
  pending,
  change,
  showConfirm,
  onRequestConfirm,
  onBack,
  onConfirm,
}: SubscriptionCartProps) {
  const motionPreset = useMotionPreset();

  /*
   * Die naechste Fassung, VEREINIGT mit der laufenden. Das zweite Glied ist der
   * ganze Unterschied: ein Abgang faellt aus isInNextSubscription heraus, soll
   * aber im Korb stehen bleiben — durchgestrichen und zurueckholbar.
   */
  const imKorb = supplements.filter(
    (prep) => isInNextSubscription(prep, pending) || prep.inSubscription,
  );
  const hasChanges = change.added.length + change.removed.length > 0;

  return (
    /*
     * Der Auftritt ist hier kein Schmuck: die Kachel entsteht durch ein Portal
     * und damit erst mit der Hydration, waehrend die Kacheln darueber und
     * darunter schon serverseitig stehen. Ohne Auftritt sieht das nach einem
     * Nachzuegler aus, mit Auftritt nach einer Kachel, die ankommt.
     */
    <motion.div
      variants={motionPreset.fadeRise}
      initial="hidden"
      animate="visible"
    >
      <RailTile title="Warenkorb" icon={<ShoppingCart />}>
        {showConfirm ? (
          <CancelStep change={change} onBack={onBack} onConfirm={onConfirm} />
        ) : (
          <>
            {/*
             * DIE HERKUNFT DES KORBS, bevor sein Inhalt kommt. Ohne diesen Satz
             * saehe der Nutzer beim Aufschlagen einen gefuellten Korb und
             * muesste raten, wer ihn gefuellt hat.
             */}
            {hasChanges ? (
              <p className="text-on-rail-muted mt-2 text-xs">
                Vorschlag nach deinem Test vom {EVALUATION_DATE}. Übernimm ihn
                oder ändere ihn Zeile für Zeile.
              </p>
            ) : null}

            <CartList preps={imKorb} pending={pending} />
            <CartSum change={change} hasChanges={hasChanges} />

            <div className="mt-3 flex flex-col gap-2">
              {hasChanges ? (
                <Button
                  variant="railPrimary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={onRequestConfirm}
                >
                  Änderungen übernehmen
                </Button>
              ) : (
                /*
                 * KEINE BESTAETIGUNG OHNE ANLASS. Ein dauerhaftes "Zur Kasse",
                 * das nichts zu bestaetigen hat, ist ein Knopf, der nichts tut
                 * — und beim zweiten Mal drueckt ihn niemand mehr. Solange
                 * nichts vorgemerkt ist, sagt der Korb genau das.
                 */
                <p className="text-on-rail-muted text-2xs">
                  Keine Änderung vorgemerkt.
                </p>
              )}

              {/*
               * ⚠️ ENTSCHEIDUNG: NOCH OHNE ZIEL, wie der Zugang zum Praeparat
               * in der Zeile. Was hinter "Abo verwalten" gehoert — Liefertakt,
               * Zahlungsweise, Pausieren — ist nichts davon gebaut, und ein
               * Link auf die Platzhalter-Seite /einstellungen waere eine
               * Zusage, die dort niemand einloest. Als Schaltflaeche statt als
               * Link ist sichtbar, dass hier noch nicht navigiert wird.
               *
               * Sie steht UNTER der Bestaetigung und traegt keine Flaeche: die
               * Verwaltung des Abos ist der seltenere Weg, und zwei gleich
               * laute Schaltflaechen nebeneinander haetten keinen Vorrang mehr.
               */}
              <Button variant="railGhost" size="sm" className="w-full text-xs">
                <Settings2 aria-hidden="true" />
                Abo verwalten
              </Button>
            </div>
          </>
        )}
      </RailTile>
    </motion.div>
  );
}

/* ------------------------------------------------------------------------- */
/* Die Positionen                                                             */
/* ------------------------------------------------------------------------- */

function CartList({
  preps,
  pending,
}: {
  preps: readonly Supplement[];
  pending: PendingChanges;
}) {
  if (preps.length === 0) {
    /*
     * Seit der Korb auf dem Vorschlag steht, ist das kein Erstbesuch mehr,
     * sondern das Ergebnis einer Entscheidung: der Nutzer hat alles
     * ausgetragen. Der Satz sagt deshalb, wie es weitergeht, und nicht, dass
     * hier etwas fehle.
     */
    return (
      <p className="text-on-rail-muted mt-3 text-xs">
        Dein Korb ist leer. Über „Hinzufügen“ in der Liste kommt ein Präparat
        wieder herein.
      </p>
    );
  }

  return (
    <ul className="mt-3 flex flex-col">
      {preps.map((prep) => {
        const action = pending.get(prep.id);
        const wirdEntfernt = action === "entfernen";
        const kommtDazu = action === "hinzufuegen";

        return (
          <li
            key={prep.id}
            className="border-rail-line flex items-baseline gap-2 border-t py-2 first:border-t-0 first:pt-0"
          >
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "text-on-rail block truncate text-xs font-medium",
                  wirdEntfernt && "line-through",
                )}
              >
                {prep.name}
              </span>
              {/*
               * Der Zustand steht als WORT da und nicht nur als Durchstreichung
               * oder Farbe — in Graustufen und vorgelesen bleibt er damit
               * dieselbe Aussage.
               */}
              {kommtDazu || wirdEntfernt ? (
                <span className="text-on-rail-muted text-2xs">
                  {kommtDazu ? "kommt dazu" : "wird entfernt"}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "text-on-rail-muted text-2xs shrink-0 tabular-nums",
                wirdEntfernt && "line-through",
              )}
            >
              {toEuro(prep.pricePerMonthCents)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------------- */
/* Die Summe                                                                  */
/* ------------------------------------------------------------------------- */

/**
 * Ohne Vormerkung die laufende Summe, mit Vormerkung die BEWEGUNG. Es ist ein
 * Abo: sobald sich etwas aendert, ist die Zahl, wegen der man hinsieht, nicht
 * die neue Summe, sondern der Unterschied.
 */
function CartSum({
  change,
  hasChanges,
}: {
  change: SubscriptionChange;
  hasChanges: boolean;
}) {
  if (!hasChanges) {
    return (
      <p className="border-rail-line mt-3 border-t pt-3">
        <span className="text-on-rail text-xs font-semibold tabular-nums">
          {toEuro(change.beforeCents)}
        </span>{" "}
        <span className="text-on-rail-muted text-2xs">im Monat</span>
      </p>
    );
  }

  return (
    <p className="border-rail-line mt-3 flex flex-wrap items-baseline gap-x-2 border-t pt-3">
      <span className="text-on-rail-muted text-2xs tabular-nums line-through">
        {toEuro(change.beforeCents)}
      </span>
      <ArrowRight
        aria-hidden="true"
        className="text-on-rail-muted size-3 self-center"
      />
      <span className="text-on-rail text-xs font-semibold tabular-nums">
        {toEuro(change.afterCents)}
      </span>
      <span className="text-on-rail-muted text-2xs tabular-nums">
        im Monat · {toEuroDelta(change.deltaCents)}
      </span>
      <span className="sr-only">
        Bisher {toEuro(change.beforeCents)} im Monat, neu{" "}
        {toEuro(change.afterCents)} im Monat, Unterschied{" "}
        {toEuroDelta(change.deltaCents)}.
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------------- */
/* Die zweite Stufe                                                           */
/* ------------------------------------------------------------------------- */

/**
 * Nur bei Abgaengen, und sie nennt sie beim Namen. Etwas hinzuzufuegen ist eine
 * Bestellung und mit einem Knopf getan; etwas abzusetzen beendet eine laufende
 * Einnahme, und das ist keine Korrektur am Korb.
 */
function CancelStep({
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
    <div className="mt-3">
      {/* Farbe UND Zeichen UND Wort — der Ton allein traegt die Aussage nicht. */}
      <p className="text-critical-on-rail flex items-center gap-1.5 text-xs font-medium">
        <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
        {change.removed.length === 1
          ? "Ein Präparat wird abgesetzt"
          : `${change.removed.length} Präparate werden abgesetzt`}
      </p>
      <p className="text-on-rail-muted mt-1.5 text-xs">
        {names} — die Einnahme endet mit der nächsten Lieferung. Das ist eine
        Kündigung dieser Position und lässt sich danach nur durch eine neue
        Aufnahme rückgängig machen.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <Button
          variant="railDestructive"
          size="sm"
          className="w-full text-xs"
          onClick={onConfirm}
        >
          Absetzen und bestätigen
        </Button>
        <Button
          variant="railOutline"
          size="sm"
          className="w-full text-xs"
          onClick={onBack}
        >
          Zurück
        </Button>
      </div>
    </div>
  );
}
