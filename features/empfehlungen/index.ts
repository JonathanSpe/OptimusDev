/*
 * Die Empfehlungsseite. Die Route komponiert damit und gestaltet nichts selbst.
 */
/*
 * Die Schiene, die den Zielmarker einer Zeile zeigt: Start, heute, Zielbereich.
 * ⚠️ Ohne Statusfarbe — sie arbeitet mit Lage, siehe biomarker-bar.tsx.
 */
export {
  BiomarkerBar,
  BiomarkerBarFromReading,
  type BiomarkerBarProps,
} from "./components/biomarker-bar";
/*
 * Die Lieferkachel der Kontext-Leiste: Takt, Versand und das Produktfoto — das
 * ausdruecklich NICHT im Kopf der Seite steht, wo es Werbung waere.
 */
export { DeliveryTile } from "./components/delivery-tile";
export { DroppedRow, type DroppedRowProps } from "./components/dropped-row";
/*
 * Der Kopf der Seite: was der TEST ergeben hat. Ausdruecklich kein Angebot —
 * kein Preis, kein Foto, keine Anzahl.
 */
export {
  EvaluationHeader,
  type EvaluationHeaderProps,
} from "./components/evaluation-header";
export { OptionalRow, type OptionalRowProps } from "./components/optional-row";
export {
  RecommendationBoard,
  type RecommendationBoardProps,
} from "./components/recommendation-board";
export {
  RecommendationRow,
  type RecommendationRowProps,
} from "./components/recommendation-row";
/* Das Aufgeklappte einer Zeile: der ganze Satz und die Felder, die es gibt. */
export {
  ReasonLink,
  ReasonPanel,
  type ReasonPanelProps,
} from "./components/reason-panel";
/*
 * Der Platz des Warenkorbs in der Kontext-Leiste. RailCartSlot steht in
 * app/(app)/@rail/empfehlungen, useRailCartTarget beantwortet der Tafel, ob es
 * ihn gibt — und damit, ob der Korb ueberhaupt dargestellt werden kann. Er ist
 * die einzige Stelle der Seite mit Betraegen und Bestaetigung.
 */
export { RailCartSlot, useRailCartTarget } from "./components/rail-cart-slot";
export {
  SubscriptionCart,
  type SubscriptionCartProps,
} from "./components/subscription-cart";
/*
 * Die Regeln der Seite — welche Staerke eine Empfehlung hat, was am Zielmarker
 * ablesbar ist und was eine Aenderung am Abo kostet. Die einzige Stelle, die
 * hier urteilt oder rechnet.
 * ⚠️ Platzhalterstufen, erfundene Preise und zwei Platzhalter-Daten, siehe rules.
 */
export {
  DELIVERY_FROM_MONTH,
  EVALUATION_DATE,
  isInNextSubscription,
  PREVIOUS_TEST_MONTH,
  toBarContext,
  toBarSpoken,
  toBarValue,
  toBiomarkerReading,
  toDropReason,
  toEuro,
  toEuroDelta,
  toEvaluationSentence,
  toEvaluationSummary,
  toEvidence,
  toggleMembership,
  toInterpretation,
  toReasonDetails,
  toRecommendationStrength,
  toRecommendedChanges,
  toSubscriptionChange,
  type BiomarkerBarState,
  type BiomarkerReading,
  type EvaluationSummary,
  type Evidence,
  type PendingAction,
  type PendingChanges,
  type ReasonDetail,
  type RecommendationStrength,
  type SubscriptionChange,
} from "./rules";
