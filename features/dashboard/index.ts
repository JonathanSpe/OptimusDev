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
 * Die Form der Marker kommt aus contracts/ — hier liegen nur die Mock-Daten.
 * ⚠️ Einheiten und Grenzwerte darin sind Platzhalter.
 */
export { sampleMarkerGroups, sampleMarkers } from "./sample-data";
