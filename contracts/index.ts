/*
 * Fachliche Vertraege der Anwendung: Form der Domaenendaten als Zod-Schema plus
 * der daraus abgeleitete TypeScript-Typ. Komponenten und Repositories
 * importieren AUSSCHLIESSLICH von hier — nicht voneinander.
 */
export {
  biomarkerListSchema,
  biomarkerSchema,
  markerGroupIdSchema,
  markerGroupListSchema,
  markerGroupSchema,
  measurementSchema,
  type Biomarker,
  type MarkerGroup,
  type MarkerGroupId,
  type Measurement,
} from "./biomarker";
/*
 * Praeparate. ⚠️ Wirkfenster, Delta-Schwellen und Preise sind Platzhalter.
 * Der Vertrag kennt einen ZIELMARKER und Messwerte daran — keine Wirkaussage.
 */
export {
  expectedDirectionSchema,
  recommendationBasisSchema,
  supplementIntakeSchema,
  supplementListSchema,
  supplementSchema,
  type ExpectedDirection,
  type RecommendationBasis,
  type Supplement,
  type SupplementIntake,
} from "./supplement";
