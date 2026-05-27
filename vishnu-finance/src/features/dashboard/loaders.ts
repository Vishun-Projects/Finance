import { dashboardService } from '@/lib/dashboard-service';
import { getPlanAdherence } from '@/lib/plan-adherence-service';
import type { DashboardBootstrap } from '@/features/dashboard/types';
import { getCurrentMonthRange, parseLocalDateEnd, parseLocalDateStart } from '@/lib/date-range';
import { resolvePlanBaseIncome } from '@/lib/plan-income';

export async function loadDashboard(userId: string): Promise<DashboardBootstrap> {
  const monthRange = getCurrentMonthRange();
  const startDate = parseLocalDateStart(monthRange.startDate);
  const endDate = parseLocalDateEnd(monthRange.endDate);

  const stats = await dashboardService.getSimpleStats({ userId, startDate, endDate });
  const planIncome = resolvePlanBaseIncome({
    salaryTakeHome: stats.salaryInfo?.takeHome,
    transactionSalary: stats.incomeBreakdown?.salary,
  });
  const adherence = await getPlanAdherence(userId, planIncome);

  return { stats, adherence };
}
