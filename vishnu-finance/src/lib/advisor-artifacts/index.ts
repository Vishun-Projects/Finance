export type {
  ArtifactKind,
  AdvisorArtifact,
  ArtifactBuildContext,
  ArtifactPlugin,
  CalendarDayEntry,
  CalendarPayload,
  ChartPayload,
  MindmapNode,
  MindmapPayload,
  InteractiveArtifactSource,
} from '@/lib/advisor-artifacts/types';

export {
  ARTIFACT_PLUGINS,
  detectAndBuildArtifacts,
  formatArtifactsPromptBlock,
  artifactsSystemHint,
  wantsAnyInteractiveArtifact,
  isGenericInteractiveRequest,
} from '@/lib/advisor-artifacts/registry';

export {
  detectChartRequest,
  buildAdvisorChartConfig,
  formatChartContextForPrompt,
  isPaceForecastQuery,
  parsePaceLookbackMonths,
  lastNMonthsDateRange,
  resolveForecastWindow,
  parsePaydayFromQuery,
  runForecast,
} from '@/lib/advisor-artifacts/plugins/chart';
export type { ChartRequest } from '@/lib/advisor-artifacts/plugins/chart';

export {
  computeForecastResult,
  computePaceBreakdown,
  computeSuggestedPace,
  parseForecastRequest,
  targetsFromDiscipline,
} from '@/lib/advisor-artifacts/forecast';
