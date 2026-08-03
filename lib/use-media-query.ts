"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * ============================================================================
 * EINE MEDIA QUERY IN JAVASCRIPT — und warum das die Ausnahme bleibt.
 * ============================================================================
 * Breakpoints gehoeren nach CSS. Fast alles im Produkt loest seine Breiten
 * ueber Tailwind-Praefixe oder Container-Queries, und das soll so bleiben:
 * CSS kennt die Fensterbreite schon beim ersten Bild, JavaScript erst nach der
 * Hydration.
 *
 * DIESER HOOK IST FUER DEN EINEN FALL, DEN CSS NICHT KANN: wenn nicht die
 * Darstellung eines Elements von der Breite abhaengt, sondern die FRAGE, WO im
 * Baum es ueberhaupt entsteht. Der Warenkorb der Empfehlungsseite steht ab xl
 * in der Kontext-Leiste und darunter als klebende Fussleiste — das sind zwei
 * verschiedene Elternknoten, und display:none kann keinen Knoten verschieben.
 * Beides gleichzeitig zu rendern und eines auszublenden waere die
 * CSS-Loesung — dann stuenden zwei Bestaetigen-Schaltflaechen im Dokument.
 *
 * Wer nur etwas anders AUSSEHEN lassen will, nimmt Tailwind und nicht das hier.
 */

/**
 * Tailwinds xl-Stufe (80rem / 1280px) als Media Query.
 *
 * ⚠️ Sie muss mit dem xl-Praefix im (app)-Layout zusammenbleiben: dort
 * entscheidet `xl:block` an der Kontext-Leiste, ob es die Spalte ueberhaupt
 * gibt. Weicht dieser Wert ab, portalisiert der Warenkorb in eine Spalte, die
 * niemand sieht.
 */
export const XL_QUERY = "(min-width: 80rem)";

/**
 * Beantwortet eine Media Query und meldet Aenderungen.
 *
 * Auf dem Server gibt es kein Fenster, deshalb liefert der Serverstand immer
 * `false` — die Anordnung fuer SCHMALE Schirme ist die Vorgabe. Das ist die
 * sichere Richtung: sie kommt ohne die Spalte aus, die es dort noch nicht gibt.
 * Dieselbe Antwort bekommt jsdom, wo es kein matchMedia gibt (siehe
 * test/setup.ts) — die Tests pruefen also durchgehend die schmale Anordnung.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
