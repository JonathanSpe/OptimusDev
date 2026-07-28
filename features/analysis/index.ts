/*
 * Das Bento der Analyse: die Anordnung der Kacheln und ihre Auftrittsreihe.
 * Es gestaltet nichts — die Route komponiert damit, statt selbst ein Raster
 * aufzuspannen.
 */
export {
  AnalysisBoard,
  type AnalysisBoardProps,
} from "./components/analysis-board";
/*
 * Landkarte und Ansatzpunkte sind EIN Baustein: BundleFocus. Die beiden
 * Haelften sind einzeln exportiert, weil sie einzeln getestet werden — auf eine
 * Seite gehoert die Klammer, nicht die Haelfte. BundleTable ist die Tabellen-
 * fassung derselben Daten; BundleFocus stellt sie selbst UNTER die Kachel.
 */
export {
  BundleFocus,
  BundleTable,
  type BundleFocusProps,
  type BundleTableProps,
} from "./components/bundle-focus";
export { BundleMap, type BundleMapProps } from "./components/bundle-map";
/*
 * Ringe und Befunde sind seit dem Umbau von Zeile 1 EIN Baustein: CategoryFocus.
 * Er ersetzt auf dem Snapshot die frueheren zwei Kacheln (CategoryDialPanel und
 * PriorityList) — sie beantworteten dieselbe Frage und liessen die Verbindung
 * dem Leser. Die Tabelle ist einzeln exportiert, weil sie einzeln getestet wird;
 * das Bento stellt sie selbst UNTER die Zeile.
 */
export {
  CategoryFocus,
  CategoryFocusTable,
  type CategoryFocusProps,
  type CategoryFocusTableProps,
} from "./components/category-focus";
export {
  CategoryDial,
  CategoryDialPanel,
  type CategoryDialPanelProps,
  type CategoryDialProps,
} from "./components/category-dial";
/*
 * Das Instrument selbst — Ring und Datenlage-Punkte. Beide Kacheln beziehen es
 * von hier, damit ein Ring nicht an zwei Orten anders laufen kann.
 */
export {
  CategoryRing,
  ConfidenceDots,
  toRingLabel,
  type CategoryRingProps,
  type ConfidenceDotsProps,
  type RingSize,
} from "./components/category-ring";
export {
  PriorityList,
  type PriorityListProps,
} from "./components/priority-list";
/*
 * Die Entwicklung ist EIN Baustein: Verlauf und Aufschluesselung derselben
 * Bewegung. Sie ersetzt die frueheren zwei Kacheln (ProgressChart, ChangePanel)
 * — zwei Antworten auf dieselbe Frage waren eine Aufgabe fuer den Leser. Die
 * Tabelle ist einzeln exportiert, weil sie einzeln getestet wird;
 * ProgressionPanel stellt sie selbst UNTER die Kachel.
 */
export {
  ProgressionPanel,
  ProgressionTable,
  type ProgressionPanelProps,
  type ProgressionTableProps,
} from "./components/progression-panel";
/*
 * Die Bewegung eines Scores — Pfeil, Zahl, Wort. Ring, Linienende und Tabelle
 * lesen dieselbe Zuordnung, sonst ist derselbe Bereich oben gruen und unten
 * grau.
 */
export {
  ScoreDelta,
  toDeltaText,
  toScoreMove,
  type ScoreDeltaProps,
  type ScoreMove,
} from "./components/score-delta";
export { ScoreHero, type ScoreHeroProps } from "./components/score-hero";
/*
 * Das Urteil zu einem Score in EINER Sprache — Zeichen, Wort, Ton und Satz.
 * Ringe, Befundzeilen, Tabelle und Score-Kachel lesen von hier; eine zweite
 * Zuordnung waere eine zweite Vokabel fuer dieselbe Schwelle.
 * ⚠️ Die Schwelle selbst ist ein Platzhalter, siehe rules.
 */
export {
  VerdictChip,
  VerdictScore,
  toScoreNote,
  toVerdictWord,
  type VerdictChipProps,
  type VerdictScoreProps,
} from "./components/score-verdict";
export {
  SupplementPanel,
  SupplementRow,
  type SupplementPanelProps,
  type SupplementRowProps,
} from "./components/supplement-row";
/*
 * Die Regeln der Analyse — welches Buendel ein Ansatzpunkt ist und wann eine
 * Datenlage zu duenn fuer ein Urteil ist. ⚠️ Platzhalterstufen, siehe rules.
 */
export {
  CATEGORY_NOISE_FALLBACK,
  CHANGE_FLAT,
  CONFIDENCE_SOLID,
  MIN_MEASUREMENTS_FOR_VERDICT,
  SCORE_BAND_CRITICAL,
  SCORE_BAND_GOOD,
  TOP_CHANGE_COUNT,
  isAdjustedActionHint,
  isVerdictShown,
  toCategoryBundles,
  toCategoryMovements,
  toCategoryNoise,
  toChangeOrder,
  toChangeReading,
  toFocusBundles,
  toFocusEntries,
  toFocusRanks,
  toMarkerReading,
  toObservedChange,
  toPriorityBundle,
  toScoreVerdict,
  toSupplementStatus,
  toTopChanges,
  type CategoryMovement,
  type ChangeDirection,
  type ChangeReading,
  type ChangeVerdict,
  type FocusEntry,
  type MarkerReading,
  type MarkerVerdict,
  type ObservedChange,
  type ScoreVerdict,
  type SupplementStatus,
} from "./rules";
/*
 * ⚠️ Scores, Zielwert und Limiter sind Platzhalter — siehe Kopf von
 * sample-data.
 */
export {
  CONFIDENCE_MAX,
  SCORE_MAX,
  SCORE_MIN,
  SCORE_TARGET,
  categoryIdByMarker,
  categoryNameById,
  sampleBundles,
  sampleCategories,
  sampleCategorySeries,
  sampleMarkerChanges,
  samplePriorityFindings,
  sampleScore,
  sampleSupplements,
  toCategoryEvidence,
  toCategoryScore,
  toMarkerChanges,
  type Bundle,
  type CategoryScore,
  type CategorySeries,
  type FavourableDirection,
  type FindingMarker,
  type MarkerChange,
  type PriorityFinding,
  type ScorePoint,
  type ScoreSummary,
  type Supplement,
} from "./sample-data";
