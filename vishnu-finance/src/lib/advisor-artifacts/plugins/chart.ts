import type { ChartConfig, ChartType } from '@/lib/advisor-chart-types';
import type { TransactionDetail } from '@/lib/financial-analysis';
import type { ArtifactPlugin, AdvisorArtifact } from '@/lib/advisor-artifacts/types';
import type { DisciplineSummary } from '@/lib/plans-discipline';
import {
  buildPaceForecastChart,
  isPaceForecastQuery,
  resolveForecastWindow,
  targetsFromDiscipline,
} from '@/lib/advisor-artifacts/chart-builders/pace-forecast';
import { formatForecastPromptBlock } from '@/lib/advisor-artifacts/forecast';
import type { ScaledIncomeBudgetBucket } from '@/lib/income-budget-service';

export {
  isPaceForecastQuery,
  parsePaceLookbackMonths,
  lastNMonthsDateRange,
  resolveForecastWindow,
  parsePaydayFromQuery,
  runForecast,
} from '@/lib/advisor-artifacts/forecast';

export interface ChartRequest {
  type: ChartType;
}

const CHART_TYPE_PATTERNS: Array<{ type: ChartType; re: RegExp }> = [
  { type: 'line', re: /\b(line\s*chart|line\s*graph|as\s+a\s+line|trend\s*line)\b/i },
  { type: 'area', re: /\b(area\s*chart|area\s*graph)\b/i },
  { type: 'pie', re: /\b(pie\s*chart|pie\s*graph|donut)\b/i },
  { type: 'bar', re: /\b(bar\s*chart|bar\s*graph|column\s*chart)\b/i },
];

/** Specific chart ask. Forecast/goal-pace uses the same chart kind — different series math. */
export function detectChartRequest(query: string): ChartRequest | null {
  if (isPaceForecastQuery(query)) return { type: 'line' };
  for (const { type, re } of CHART_TYPE_PATTERNS) {
    if (re.test(query)) return { type };
  }
  if (/\b(chart|graph|plot)\b/i.test(query)) {
    return { type: 'line' };
  }
  return null;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function sortByDate(transactions: TransactionDetail[]): TransactionDetail[] {
  return [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
}

function buildTimeSeries(
  transactions: TransactionDetail[],
  grain: 'day' | 'month',
): ChartConfig {
  const map = new Map<string, { Paid: number; Received: number }>();
  for (const tx of sortByDate(transactions)) {
    const key = grain === 'day' ? isoDay(tx.date) : monthLabel(tx.date);
    const cur = map.get(key) || { Paid: 0, Received: 0 };
    if (tx.type === 'EXPENSE') cur.Paid += tx.amount;
    else if (tx.type === 'INCOME') cur.Received += tx.amount;
    map.set(key, cur);
  }

  const data = [...map.entries()].map(([name, v]) => ({
    name,
    Paid: Math.round(v.Paid * 100) / 100,
    Received: Math.round(v.Received * 100) / 100,
    Net: Math.round((v.Received - v.Paid) * 100) / 100,
  }));

  return {
    type: 'line',
    title: grain === 'day' ? 'Paid vs received by day' : 'Paid vs received by month',
    data,
    dataKeys: ['Paid', 'Received'],
    colors: ['var(--danger)', 'var(--success)'],
    xAxisKey: 'name',
    height: 280,
  };
}

function buildCategoryBars(transactions: TransactionDetail[]): ChartConfig {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'EXPENSE') continue;
    const name = tx.category?.name || 'Uncategorized';
    map.set(name, (map.get(name) || 0) + tx.amount);
  }
  const data = [...map.entries()]
    .map(([name, amount]) => ({ name, Amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.Amount - a.Amount)
    .slice(0, 12);

  return {
    type: 'bar',
    title: 'Spending by category',
    data,
    dataKeys: ['Amount'],
    colors: ['var(--info)'],
    xAxisKey: 'name',
    height: 280,
  };
}

function buildCategoryPie(transactions: TransactionDetail[]): ChartConfig {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'EXPENSE') continue;
    const name = tx.category?.name || 'Uncategorized';
    map.set(name, (map.get(name) || 0) + tx.amount);
  }
  const data = [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return {
    type: 'pie',
    title: 'Expense share by category',
    data,
    dataKeys: ['value'],
    xAxisKey: 'name',
    height: 280,
  };
}

function buildCumulativeLine(transactions: TransactionDetail[]): ChartConfig {
  let paid = 0;
  let received = 0;
  const data: Array<{ name: string; Paid: number; Received: number }> = [];
  for (const tx of sortByDate(transactions)) {
    if (tx.type === 'EXPENSE') paid += tx.amount;
    else if (tx.type === 'INCOME') received += tx.amount;
    data.push({
      name: isoDay(tx.date),
      Paid: Math.round(paid * 100) / 100,
      Received: Math.round(received * 100) / 100,
    });
  }
  const byDay = new Map<string, (typeof data)[number]>();
  for (const row of data) byDay.set(row.name, row);

  return {
    type: 'line',
    title: 'Cumulative paid vs received',
    data: [...byDay.values()],
    dataKeys: ['Paid', 'Received'],
    colors: ['var(--danger)', 'var(--success)'],
    xAxisKey: 'name',
    height: 280,
  };
}

export function buildAdvisorChartConfig(args: {
  query: string;
  chartRequest: ChartRequest;
  transactions: TransactionDetail[];
  entityLabel?: string;
  disciplineSummary?: DisciplineSummary | null;
  /** @deprecated unused — ForecastEngine does not fall back to capacity */
  fallbackMonthlyPace?: number;
  adherenceBuckets?: import('@/lib/plan-adherence-service').BucketAdherence[] | null;
  scaledBuckets?: ScaledIncomeBudgetBucket[];
  goalsFundingNeedMonthly?: number | null;
}): {
  config?: ChartConfig;
  notes?: string[];
  timeline?: import('@/lib/advisor-artifacts/forecast').ForecastTimelinePayload;
} | null {
  const { query, chartRequest, transactions, entityLabel } = args;

  if (isPaceForecastQuery(query)) {
    const window = resolveForecastWindow(query);
    const built = buildPaceForecastChart({
      query,
      transactions,
      targets: targetsFromDiscipline(args.disciplineSummary),
      window,
      scaledBuckets: args.scaledBuckets,
      adherenceBuckets: args.scaledBuckets ? undefined : args.adherenceBuckets,
      goalsFundingNeedMonthly:
        args.goalsFundingNeedMonthly ??
        args.disciplineSummary?.totalRequiredPerMonth ??
        null,
    });
    if (!built) return null;
    return built;
  }

  if (transactions.length === 0) return null;

  const q = query.toLowerCase();
  const spanDays =
    (Math.max(...transactions.map((t) => t.date.getTime())) -
      Math.min(...transactions.map((t) => t.date.getTime()))) /
    (1000 * 60 * 60 * 24);

  let config: ChartConfig;

  if (chartRequest.type === 'pie' || /\b(share|breakdown|composition)\b/.test(q)) {
    config = buildCategoryPie(transactions);
  } else if (chartRequest.type === 'bar' || /\b(by\s+category|category\s+wise)\b/.test(q)) {
    config = buildCategoryBars(transactions);
  } else if (/\bcumulat/.test(q)) {
    config = buildCumulativeLine(transactions);
  } else if (chartRequest.type === 'area') {
    config = {
      ...buildTimeSeries(transactions, spanDays > 60 ? 'month' : 'day'),
      type: 'area',
    };
  } else {
    config = {
      ...buildTimeSeries(transactions, spanDays > 60 ? 'month' : 'day'),
      type: 'line',
    };
  }

  if (entityLabel) {
    config.title = `${config.title ?? 'Chart'} — ${entityLabel}`;
  }

  return { config };
}

export function formatChartContextForPrompt(
  config: ChartConfig | undefined,
  notes?: string[],
  timeline?: import('@/lib/advisor-artifacts/forecast').ForecastTimelinePayload,
): string {
  if (timeline) {
    return formatForecastPromptBlock({ timeline, notes: notes || [] });
  }

  if (!config) {
    return (notes || []).join('\n');
  }

  const paid = config.dataKeys.includes('Paid')
    ? config.data.reduce((s, d) => s + (Number(d.Paid) || 0), 0)
    : null;
  const received = config.dataKeys.includes('Received')
    ? config.data.reduce((s, d) => s + (Number(d.Received) || 0), 0)
    : null;
  const amount = config.dataKeys.includes('Amount')
    ? config.data.reduce((s, d) => s + (Number(d.Amount) || 0), 0)
    : null;
  const value = config.dataKeys.includes('value')
    ? config.data.reduce((s, d) => s + (Number(d.value) || 0), 0)
    : null;

  const sample = config.data
    .slice(0, 12)
    .map((row) =>
      [row.name, ...config.dataKeys.map((k) => `${k}=${row[k]}`)].join(' | '),
    )
    .join('\n');

  return [
    '=== CHART RENDERED BY THE APP (Recharts) ===',
    'The UI will plot this chart for the user. NEVER say you cannot generate charts or visuals.',
    `chart_type: ${config.type}`,
    `chart_title: ${config.title ?? ''}`,
    `series: ${config.dataKeys.join(', ')}`,
    `point_count: ${config.data.length}`,
    paid != null ? `series_paid_total: ${Math.round(paid * 100) / 100}` : null,
    received != null ? `series_received_total: ${Math.round(received * 100) / 100}` : null,
    amount != null ? `series_amount_total: ${Math.round(amount * 100) / 100}` : null,
    value != null ? `series_value_total: ${Math.round(value * 100) / 100}` : null,
    notes?.length ? 'notes:' : null,
    ...(notes ?? []).map((n) => `- ${n}`),
    'sample_points:',
    sample,
    'Your job: briefly summarize what the chart shows. Do not invent ASCII charts.',
    '=== END CHART ===',
  ]
    .filter(Boolean)
    .join('\n');
}

export const chartArtifactPlugin: ArtifactPlugin<'chart'> = {
  kind: 'chart',
  detect: (query) => detectChartRequest(query) != null,
  build: (ctx) => {
    const chartRequest = detectChartRequest(ctx.query) ?? { type: 'line' as const };
    const built = buildAdvisorChartConfig({
      query: ctx.query,
      chartRequest,
      transactions: ctx.transactions,
      entityLabel: ctx.entityLabel,
      disciplineSummary: ctx.disciplineSummary,
      fallbackMonthlyPace: ctx.fallbackMonthlyPace,
      adherenceBuckets: ctx.adherenceBuckets,
    });
    if (!built) return null;
    return {
      kind: 'chart',
      title: built.timeline?.title || built.config?.title || 'Chart',
      payload: {
        config: built.config,
        notes: built.notes,
        timeline: built.timeline,
      },
    };
  },
  promptHint: (artifact) =>
    formatChartContextForPrompt(
      artifact.payload.config,
      artifact.payload.notes,
      artifact.payload.timeline,
    ),
};

/** Build a default line chart when generic “interactive” falls back to chart. */
export function buildDefaultChartArtifact(ctx: {
  query: string;
  transactions: TransactionDetail[];
  entityLabel?: string;
  disciplineSummary?: DisciplineSummary | null;
  fallbackMonthlyPace?: number;
  adherenceBuckets?: import('@/lib/plan-adherence-service').BucketAdherence[] | null;
}): Extract<AdvisorArtifact, { kind: 'chart' }> | null {
  const built = buildAdvisorChartConfig({
    query: ctx.query,
    chartRequest: { type: 'line' },
    transactions: ctx.transactions,
    entityLabel: ctx.entityLabel,
    disciplineSummary: ctx.disciplineSummary,
    fallbackMonthlyPace: ctx.fallbackMonthlyPace,
    adherenceBuckets: ctx.adherenceBuckets,
  });
  if (!built) return null;
  return {
    kind: 'chart',
    title: built.timeline?.title || built.config?.title || 'Chart',
    payload: {
      config: built.config,
      notes: built.notes,
      timeline: built.timeline,
    },
  };
}
