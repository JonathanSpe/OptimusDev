/*
 * Die Empfehlungsseite. Die Route komponiert damit und gestaltet nichts selbst.
 */
/*
 * Die Lieferkachel der Kontext-Leiste: was aus dem Abo tatsaechlich ankommt.
 * Steht in app/(app)/@rail/empfehlungen, unter dem Warenkorb.
 */
export { DeliveryTile } from "./components/delivery-tile";
export {
  RecommendationBoard,
  type RecommendationBoardProps,
} from "./components/recommendation-board";
export {
  RecommendationRow,
  type RecommendationRowProps,
} from "./components/recommendation-row";
/*
 * Der Platz des Warenkorbs in der Kontext-Leiste. RailCartSlot steht in
 * app/(app)/@rail/empfehlungen, useRailCartTarget beantwortet der Tafel, ob es
 * ihn gibt — und damit, ob der Korb in die Leiste oder an den Fuss gehoert.
 */
export { RailCartSlot, useRailCartTarget } from "./components/rail-cart-slot";
export {
  SubscriptionBar,
  type SubscriptionBarProps,
} from "./components/subscription-bar";
export {
  SubscriptionCart,
  type SubscriptionCartProps,
} from "./components/subscription-cart";
/*
 * Die Regeln der Seite — welche Staerke eine Empfehlung hat und was eine
 * Aenderung am Abo kostet. Die einzige Stelle, die hier urteilt oder rechnet.
 * ⚠️ Platzhalterstufen und erfundene Preise, siehe rules.
 */
export {
  isInNextSubscription,
  toEuro,
  toEuroDelta,
  toEvidence,
  toggleMembership,
  toRecommendationStrength,
  toRecommendedChanges,
  toSubscriptionChange,
  type Evidence,
  type PendingAction,
  type PendingChanges,
  type RecommendationStrength,
  type SubscriptionChange,
} from "./rules";
