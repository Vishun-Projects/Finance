import type { PlanPreviewData } from '@/components/finance/salary-plan-preview-card';
import type { PlanIncomeSource } from '@/lib/plan-income';

type ScaledPlan = { baseIncome: number; source: string };
type DashboardSlice = {
  adherence: {
    plannedTotal: number;
    actualTotal: number;
    overallScore: number;
    monthLabel: string;
  };
  disciplineSummary: {
    capacity: { headroom: number; underspend: number; available: number };
  };
  planIncomeContext?: {
    activeSalaryTakeHome?: number | null;
    currentMonthSalaryReceived?: number | null;
    lastMonthSalaryReceived?: number | null;
    receivedSalaryAnchor?: string | null;
    receivedSalarySource?: string | null;
  };
};

/** Single mapper for salary bootstrap, API route, and phase-plan. */
export function toPlanPreviewData(scaledPlan: ScaledPlan, dashboard: DashboardSlice): PlanPreviewData {
  const { adherence, disciplineSummary, planIncomeContext } = dashboard;
  return {
    takeHome: scaledPlan.baseIncome,
    source: scaledPlan.source as PlanIncomeSource,
    activeSalaryTakeHome: planIncomeContext?.activeSalaryTakeHome ?? undefined,
    currentMonthSalaryReceived: planIncomeContext?.currentMonthSalaryReceived ?? undefined,
    lastMonthSalaryReceived: planIncomeContext?.lastMonthSalaryReceived ?? undefined,
    receivedSalaryAnchor:
      planIncomeContext?.receivedSalaryAnchor != null
        ? Number(planIncomeContext.receivedSalaryAnchor)
        : undefined,
    receivedSalarySource:
      planIncomeContext?.receivedSalarySource === 'current_month' ||
      planIncomeContext?.receivedSalarySource === 'last_month' ||
      planIncomeContext?.receivedSalarySource === 'none'
        ? planIncomeContext.receivedSalarySource
        : undefined,
    plannedTotal: adherence.plannedTotal,
    actualTotal: adherence.actualTotal,
    headroom: disciplineSummary.capacity.headroom,
    underspend: disciplineSummary.capacity.underspend,
    available: disciplineSummary.capacity.available,
    overallScore: adherence.overallScore,
    monthLabel: adherence.monthLabel,
  };
}

export function toPlanPreviewApiResponse(scaledPlan: ScaledPlan, dashboard: DashboardSlice) {
  const data = toPlanPreviewData(scaledPlan, dashboard);
  return {
    takeHome: data.takeHome,
    source: data.source,
    activeSalaryTakeHome: data.activeSalaryTakeHome,
    currentMonthSalaryReceived: data.currentMonthSalaryReceived,
    lastMonthSalaryReceived: data.lastMonthSalaryReceived,
    receivedSalaryAnchor: data.receivedSalaryAnchor,
    receivedSalarySource: data.receivedSalarySource,
    plannedTotal: data.plannedTotal,
    actualTotal: data.actualTotal,
    headroom: data.headroom,
    underspend: data.underspend,
    available: data.available,
    overallScore: data.overallScore,
    monthLabel: data.monthLabel,
  };
}
