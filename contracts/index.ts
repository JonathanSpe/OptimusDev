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
