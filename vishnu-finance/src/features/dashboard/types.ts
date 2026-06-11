import type { DisciplineSummary } from '@/lib/plans-discipline';
import type { PlanIncomeContext } from '@/lib/plan-income';
import type { CurrentAccountBalance } from '@/lib/account-balance-service';
import type { SimpleDashboardData } from '@/types/dashboard';
import type { PlanAdherenceResult } from '@/lib/plan-adherence-service';

/** Shared month snapshot for Dashboard, Health, and related pages */
export interface MonthContext {
  monthLabel: string;
  income: number;
  expenses: number;
  netFlow: number;
  adjustedNetFlow: number;
  disciplineSummary: DisciplineSummary;
  planIncomeContext: PlanIncomeContext;
  accountBalance: CurrentAccountBalance;
  adherence: PlanAdherenceResult;
}

export interface DashboardBootstrap {
  stats: SimpleDashboardData;
  adherence: PlanAdherenceResult;
  disciplineSummary: DisciplineSummary;
  planIncomeContext: PlanIncomeContext;
  accountBalance: CurrentAccountBalance;
  monthContext: MonthContext;
}
