export {
  BiomarkerBoard,
  type BiomarkerBoardProps,
} from "./components/biomarker-board";
export {
  BiomarkerPanel,
  type BiomarkerCategory,
  type BiomarkerPanelProps,
  type BiomarkerPanelView,
} from "./components/biomarker-panel";
/*
 * Die Deutung eines Markers — die einzige Stelle, an der das Dashboard urteilt.
 * Sie steht hier offen, damit jede weitere Ansicht dieselbe Lesart benutzt statt
 * eine zweite zu erfinden.
 */
export {
  toChangeReading,
  toCurrentValue,
  toMarkerStanding,
  toOptimalRange,
  toTargetRange,
  type ChangeReading,
  type MarkerStanding,
  type ValueRange,
} from "./rules";
/*
 * Die Form der Marker kommt aus contracts/ — hier liegen nur die Mock-Daten.
 * ⚠️ Einheiten und Grenzwerte darin sind Platzhalter.
 */
export { sampleMarkerGroups, sampleMarkers } from "./sample-data";
