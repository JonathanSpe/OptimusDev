export { BundleMap, type BundleMapProps } from "./components/bundle-map";
export {
  CategoryDial,
  CategoryDialPanel,
  type CategoryDialPanelProps,
  type CategoryDialProps,
} from "./components/category-dial";
export {
  PriorityCard,
  type PriorityCardProps,
} from "./components/priority-card";
export {
  ProgressChart,
  type ProgressChartProps,
} from "./components/progress-chart";
export { ScoreHero, type ScoreHeroProps } from "./components/score-hero";
/*
 * Die Regeln der Analyse — welches Buendel ein Ansatzpunkt ist und wann eine
 * Datenlage zu duenn fuer ein Urteil ist. ⚠️ Platzhalterstufen, siehe rules.
 */
export {
  CONFIDENCE_SOLID,
  MIN_MEASUREMENTS_FOR_VERDICT,
  toFocusBundles,
  toMarkerReading,
  toPriorityBundle,
  type MarkerReading,
  type MarkerVerdict,
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
  toCategoryScore,
  type Bundle,
  type CategoryScore,
  type CategorySeries,
  type FindingMarker,
  type PriorityFinding,
  type ScorePoint,
  type ScoreSummary,
} from "./sample-data";
