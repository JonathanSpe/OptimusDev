"use client";

import { createContext, use, type ReactNode } from "react";

/*
 * ============================================================================
 * WO STEHT DIE KONTEXT-LEISTE GERADE?
 * ============================================================================
 * Sie hat zwei Plaetze, und derselbe Inhalt wird an beide gereicht: ab xl die
 * feste Spalte neben dem Panel, darunter die Schublade aus der Kopfzeile.
 *
 * Fast nichts auf der Leiste muss das wissen — Tailwind erledigt jeden
 * Unterschied im Aussehen. Gebraucht wird es genau dort, wo eine Kachel nicht
 * anders AUSSEHEN, sondern anders EXISTIEREN muss. Heute ist das der
 * Warenkorb-Platz: die Spalte ist unter xl per display:none da, aber
 * unsichtbar, und ein Portal in einen unsichtbaren Knoten waere ein Korb, den
 * niemand findet. Die Schublade dagegen gibt es nur, solange sie offen ist —
 * was in ihr steht, ist immer sichtbar.
 *
 * ⚠️ Der Vorgabewert ist "column". Wer die Leiste an einen dritten Platz
 * stellt, umgibt ihn mit einem Provider, statt hier eine Ausnahme einzubauen.
 */

export type RailPlacement =
  /** Die feste Spalte neben dem Panel. Sichtbar erst ab xl. */
  | "column"
  /** Die Schublade der Kopfzeile. Existiert nur im geoeffneten Zustand. */
  | "drawer";

const RailPlacementContext = createContext<RailPlacement>("column");

export function RailPlacementProvider({
  placement,
  children,
}: {
  placement: RailPlacement;
  children: ReactNode;
}) {
  return (
    <RailPlacementContext value={placement}>{children}</RailPlacementContext>
  );
}

export function useRailPlacement(): RailPlacement {
  return use(RailPlacementContext);
}
