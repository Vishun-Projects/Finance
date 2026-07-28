import type { BucketAdherence } from '@/lib/plan-adherence-service';
import type { ChartConfig } from '@/lib/advisor-chart-types';
import type { AdvisorArtifact } from '@/lib/advisor-artifacts/types';

/** Goal / wishlist / due targets — from live plan data. */
export interface PaceTarget {
  id: string;
  label: string;
  remaining: number;
  kind: 'goal' | 'due' | 'wish';
}

export interface ForecastTimelineMilestone {
  id: string;
  label: string;
  remaining: number;
  currentMonths: number | null;
  currentEta: string | null;
  suggestedMonths: number | null;
  suggestedEta: string | null;
}

export interface ForecastPeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface ForecastWindow {
  startDate: Date;
  endDate: Date;
  /** Day of month salary usually lands (1–31); drives pay-cycle buckets */
  payday?: number;
  mode: 'explicit' | 'pay_cycles' | 'calendar_months';
  label: string;
  /** Shared periods for pace history and window-scoped adherence */
  periods: ForecastPeriod[];
}

export interface ForecastRequest {
  query: string;
  window: ForecastWindow;
  lookbackCount: number | null;
}

export interface ForecastTimelinePayload {
  title: string;
  lookbackLabel: string;
  windowMode?: ForecastWindow['mode'];
  history: Array<{ label: string; income: number; expense: number; net: number }>;
  currentPaceMonthly: number;
  suggestedPaceMonthly: number;
  /** Separate context: what goals/dues/wishlist need per month from discipline */
  goalsFundingNeedMonthly?: number | null;
  suggestedSteps: string[];
  milestones: ForecastTimelineMilestone[];
  verdict: string;
}

export interface PaceBreakdown {
  monthlyPace: number;
  periodsUsed: number;
  totalIncome: number;
  totalExpense: number;
  periodRows: Array<{ label: string; income: number; expense: number; net: number }>;
}

export interface WindowBucketRow {
  key: string;
  label: string;
  plannedMonthly: number;
  actualMonthly: number;
  mapFrom: string[];
  isSavingsLike: boolean;
}

export interface ForecastComputeResult {
  timeline: ForecastTimelinePayload;
  notes: string[];
  promptBlock: string;
  artifact: Extract<AdvisorArtifact, { kind: 'chart' }>;
  config?: ChartConfig;
  window: ForecastWindow;
  windowBuckets: WindowBucketRow[];
}

export type { BucketAdherence };
