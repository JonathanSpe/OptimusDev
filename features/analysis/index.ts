/*
 * Landkarte und Ansatzpunkte sind EIN Baustein: BundleFocus. Die beiden
 * Haelften sind einzeln exportiert, weil sie einzeln getestet werden — auf eine
 * Seite gehoert die Klammer, nicht die Haelfte.
 */
export { BundleFocus, type BundleFocusProps } from "./components/bundle-focus";
export { BundleMap, type BundleMapProps } from "./components/bundle-map";
export {
  CategoryDial,
  CategoryDialPanel,
  type CategoryDialPanelProps,
  type CategoryDialProps,
} from "./components/category-dial";
export {
  PriorityList,
  type PriorityListProps,
} from "./components/priority-list";
export {
  ProgressChart,
  type ProgressChartProps,
} from "./components/progress-chart";
export { ScoreHero, type ScoreHeroProps } from "./components/score-hero";
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
  CONFIDENCE_SOLID,
  MIN_MEASUREMENTS_FOR_VERDICT,
  isAdjustedActionHint,
  toFocusBundles,
  toFocusEntries,
  toMarkerReading,
  toPriorityBundle,
  toSupplementStatus,
  type FocusEntry,
  type MarkerReading,
  type MarkerVerdict,
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
  categoryNameById,
  sampleBundles,
  sampleCategories,
  sampleCategorySeries,
  samplePriorityFindings,
  sampleScore,
  sampleSupplements,
  toCategoryScore,
  type Bundle,
  type CategoryScore,
  type CategorySeries,
  type FindingMarker,
  type PriorityFinding,
  type ScorePoint,
  type ScoreSummary,
  type Supplement,
} from "./sample-data";
