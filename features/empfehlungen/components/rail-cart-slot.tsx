"use client";

import { useSyncExternalStore } from "react";

import { useRailPlacement } from "@/components/common/rail-placement";
import { useMediaQuery, XL_QUERY } from "@/lib/use-media-query";

/*
 * ============================================================================
 * DER PLATZ DES WARENKORBS IN DER KONTEXT-LEISTE.
 * ============================================================================
 * Die Leiste haengt im (app)-Layout als GESCHWISTER des Glas-Panels, der
 * Seiteninhalt steckt tief darin. Beides sind verschiedene Teilbaeume, und der
 * Warenkorb braucht denselben Zustand wie die Liste — die vorgemerkten
 * Aenderungen. Wuerde die Leiste ihren Korb selbst rendern, muesste dieser
 * Zustand in einen globalen Speicher, nur damit zwei Nachbarn im selben Bild
 * dasselbe wissen.
 *
 * Stattdessen rendert die SEITE den Korb in ihrem eigenen Baum (Zustand also
 * als gewoehnliche Props) und schiebt nur das DOM hierher. Diese Datei ist der
 * Platz dafuer: ein leerer Knoten in der Leiste plus die Anmeldung, ueber die
 * die Seite ihn findet.
 *
 * PREIS DIESER LOESUNG, offen benannt: ein Portal rendert NICHT auf dem Server.
 * Die Korb-Kachel entsteht erst mit der Hydration, waehrend Profil und offene
 * Fragen daneben schon serverseitig dastehen. Sie tritt deshalb mit fadeRise
 * auf — so liest sich das Auftauchen als Auftritt und nicht als Nachzuegler.
 *
 * WARUM EINE ANMELDUNG UND KEINE id: mit document.getElementById braeuchte der
 * Knoten eine id, und es gaebe ihn zeitweise zweimal — in der Spalte und in der
 * geoeffneten Schublade. Zwei gleiche id sind ungueltiges HTML. Ausserdem gibt
 * es hier kein Wettrennen: die Seite erfaehrt vom Knoten, sobald es ihn gibt,
 * statt einmal beim Einhaengen nachzusehen und nichts zu finden.
 *
 * ⚠️ Das hier ist KEIN Zustandsspeicher der Fachlichkeit. Es stehen DOM-Knoten
 * darin, keine Gesundheitsangabe und keine Vormerkung.
 */

/*
 * EIN STAPEL UND KEINE EINZELNE ABLAGE. Beim Oeffnen der Schublade gibt es
 * kurz zwei Knoten: die Spalte ist unter xl zwar unsichtbar, aber wer bei
 * offener Schublade das Fenster verbreitert, hat beide. Der ZULETZT
 * angemeldete gewinnt — das ist immer die Schublade, denn sie kommt spaeter
 * und geht frueher. Schliesst sie sich, faellt der Stapel von selbst auf den
 * vorherigen Knoten zurueck; mit einer einzelnen Ablage waere danach gar
 * keiner mehr angemeldet.
 */
const stapel: HTMLElement[] = [];
const zuhoerer = new Set<() => void>();

function melden(): void {
  for (const benachrichtigen of zuhoerer) benachrichtigen();
}

function anmelden(knoten: HTMLElement): void {
  stapel.push(knoten);
  melden();
}

function abmelden(knoten: HTMLElement): void {
  const stelle = stapel.indexOf(knoten);
  if (stelle !== -1) stapel.splice(stelle, 1);
  melden();
}

function abonniere(onStoreChange: () => void): () => void {
  zuhoerer.add(onStoreChange);
  return () => {
    zuhoerer.delete(onStoreChange);
  };
}

/**
 * Der Knoten in der Kontext-Leiste, in den der Warenkorb portalisiert wird —
 * oder `null`, wenn es gerade keinen sichtbaren gibt.
 *
 * `null` ist ein Normalfall und kein Fehler: unter xl bei geschlossener
 * Schublade, auf dem Server (dort gibt es kein Portal) und ueberall, wo die
 * Seite ohne die Leiste steht. Die Seite rendert dann ihre klebende
 * Fussleiste. Damit ist die Frage "Leiste oder Fuss?" an genau einer Stelle
 * beantwortet, naemlich hier.
 */
export function useRailCartTarget(): HTMLElement | null {
  return useSyncExternalStore(
    abonniere,
    () => stapel.at(-1) ?? null,
    () => null,
  );
}

/**
 * Der leere Platz in der Leiste. Steht in app/(app)/@rail/empfehlungen und
 * rendert selbst nichts Sichtbares.
 */
export function RailCartSlot() {
  const placement = useRailPlacement();
  const istBreit = useMediaQuery(XL_QUERY);

  /*
   * NUR WO DER PLATZ AUCH ZU SEHEN IST. Die Spalte steht unter xl per
   * display:none im Dokument — ein Korb darin waere ein Korb, den niemand
   * findet, und schlimmer noch: die Seite hielte ihn fuer untergebracht und
   * liesse die Fussleiste weg. Die Schublade dagegen existiert ueberhaupt nur
   * im geoeffneten Zustand, dort ist sichtbar gleichbedeutend mit vorhanden.
   */
  const sichtbar = placement === "drawer" || istBreit;
  if (!sichtbar) return null;

  return (
    <div
      /*
       * Anmelden beim Einhaengen, abmelden ueber die zurueckgegebene
       * Aufraeumfunktion. React ruft den Rueckruf dann nicht mehr mit null auf
       * — die Abfrage steht nur, weil der Typ die alte Form offen laesst.
       */
      ref={(knoten) => {
        if (knoten === null) return;
        anmelden(knoten);
        return () => abmelden(knoten);
      }}
    />
  );
}
