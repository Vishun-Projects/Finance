export type {
  PaceTarget,
  ForecastTimelineMilestone,
  ForecastPeriod,
  ForecastWindow,
  ForecastRequest,
  ForecastTimelinePayload,
  PaceBreakdown,
  WindowBucketRow,
  ForecastComputeResult,
} from './types';

export {
  isPaceForecastQuery,
  parsePaydayFromQuery,
  parsePaceLookbackMonths,
  hasExplicitLookback,
  lastNMonthsDateRange,
  buildPayCycleRanges,
  resolveForecastWindow,
  parseForecastRequest,
  endOfDay,
  startOfDay,
} from './parse';

export { computePaceBreakdown } from './pace';
export { computeWindowBucketAdherence, isSavingsLikeBucket } from './window-adherence';
export { computeSuggestedPace } from './suggested';
export { targetsFromDiscipline } from './targets';
export { computeForecastResult, formatForecastPromptBlock } from './compute';
export { loadForecastInputs } from './load';
export { runForecast } from './run';
