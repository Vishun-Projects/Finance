/**
 * Compatibility re-exports — chart logic lives in advisor-artifacts/plugins/chart.
 */
export type { ChartConfig, ChartType } from '@/lib/advisor-chart-types';
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
  type ChartRequest,
} from '@/lib/advisor-artifacts/plugins/chart';
