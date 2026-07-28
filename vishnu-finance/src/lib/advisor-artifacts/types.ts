import type { ChartConfig } from '@/lib/advisor-chart-types';
import type { TransactionDetail } from '@/lib/financial-analysis';
import type { IncomeBudgetBucketDto } from '@/lib/income-budget-service';
import type { DisciplineSummary } from '@/lib/plans-discipline';
import type { BucketAdherence } from '@/lib/plan-adherence-service';
import type { ForecastTimelinePayload } from '@/lib/advisor-artifacts/forecast';

export type ArtifactKind = 'chart' | 'calendar' | 'mindmap';

export interface CalendarDayEntry {
  date: string;
  expense: number;
  income: number;
  count: number;
}

export interface CalendarPayload {
  days: CalendarDayEntry[];
  rangeEnd?: string;
}

export interface MindmapNode {
  id: string;
  label: string;
  amount?: number;
  children?: MindmapNode[];
}

export interface MindmapPayload {
  root: MindmapNode;
}

export interface ChartPayload {
  config?: ChartConfig;
  notes?: string[];
  timeline?: ForecastTimelinePayload;
}

export type ArtifactPayload = ChartPayload | CalendarPayload | MindmapPayload;

export type AdvisorArtifact =
  | { kind: 'chart'; title: string; payload: ChartPayload }
  | { kind: 'calendar'; title: string; payload: CalendarPayload }
  | { kind: 'mindmap'; title: string; payload: MindmapPayload };

export interface ArtifactBuildContext {
  query: string;
  transactions: TransactionDetail[];
  budgetBuckets: IncomeBudgetBucketDto[];
  entityLabel?: string;
  hasDatedWindow?: boolean;
  disciplineSummary?: DisciplineSummary | null;
  fallbackMonthlyPace?: number;
  adherenceBuckets?: BucketAdherence[] | null;
}

export interface ArtifactPlugin<K extends ArtifactKind = ArtifactKind> {
  kind: K;
  detect: (query: string) => boolean;
  build: (ctx: ArtifactBuildContext) => Extract<AdvisorArtifact, { kind: K }> | null;
  promptHint: (artifact: Extract<AdvisorArtifact, { kind: K }>) => string;
}

export interface InteractiveArtifactSource {
  type: 'interactive';
  kind: ArtifactKind;
  title: string;
  payload: ArtifactPayload;
}
