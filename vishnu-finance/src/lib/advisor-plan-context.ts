import type { DashboardBootstrap } from '@/features/dashboard/types';
import { formatDisciplineCurrency } from '@/lib/plans-discipline';
import { planIncomeSourceLabel, receivedSalarySourceLabel } from '@/lib/plan-income';
import { formatRupees } from '@/lib/utils';

export function formatAdvisorPlanContext(dashboard: DashboardBootstrap): string {
  const { stats, adherence, disciplineSummary, planIncomeContext } = dashboard;
  const { currentMonthStats } = stats;

  const overBudget = adherence.buckets.filter((b) => b.status === 'over');
  const lines = [
    '=== THIS MONTH PLAN & DISCIPLINE ===',
    `Month: ${adherence.monthLabel}`,
    `Plan breakdown scaled to: ${formatRupees(adherence.planBaseIncome)}/mo from ${planIncomeSourceLabel(adherence.planIncomeSource)}`,
    planIncomeContext.activeSalaryTakeHome
      ? `Active salary structure: ${formatRupees(planIncomeContext.activeSalaryTakeHome)}/mo`
      : null,
    `Salary credited this month: ${formatRupees(planIncomeContext.currentMonthSalaryReceived)}`,
    `Salary credited last month: ${formatRupees(planIncomeContext.lastMonthSalaryReceived)}`,
    `Capacity anchor (${receivedSalarySourceLabel(planIncomeContext.receivedSalarySource)}): ${formatRupees(planIncomeContext.receivedSalaryAnchor)}`,
    `Plan adherence score: ${adherence.overallScore}%`,
    `Planned total: ${formatRupees(adherence.plannedTotal)} | Actual spend: ${formatRupees(adherence.actualTotal)}`,
    `Net flow: ${formatRupees(currentMonthStats.netFlow)} | Adjusted net: ${formatRupees(currentMonthStats.adjustedNetFlow)}`,
    '',
    'Capacity (fund from salary credited, not unspent plan lines alone):',
    `- Headroom: ${formatDisciplineCurrency(disciplineSummary.capacity.headroom)}`,
    `- Unspent plan: ${formatDisciplineCurrency(disciplineSummary.capacity.underspend)}`,
    `- Fundable for goals/dues/wishlist: ${formatDisciplineCurrency(disciplineSummary.capacity.available)}`,
    `- Required/mo (goals + dues + wishlist): ${formatDisciplineCurrency(disciplineSummary.totalRequiredPerMonth)}`,
    `- Gap: ${formatDisciplineCurrency(disciplineSummary.gap)} (${disciplineSummary.status})`,
  ].filter(Boolean) as string[];

  if (overBudget.length > 0) {
    lines.push('', 'Over-budget buckets:');
    for (const bucket of overBudget) {
      lines.push(
        `- ${bucket.label}: ${formatRupees(bucket.actual)} spent vs ${formatRupees(bucket.planned)} planned`,
      );
    }
  }

  const behindGoals = disciplineSummary.goals.filter((g) => g.paceStatus === 'behind').slice(0, 5);
  if (behindGoals.length > 0) {
    lines.push('', 'Goals behind pace:');
    for (const goal of behindGoals) {
      lines.push(`- ${goal.title}: needs ${formatDisciplineCurrency(goal.monthlyRequired ?? 0)}/mo`);
    }
  }

  const urgentDeadlines = disciplineSummary.deadlines
    .filter((d) => d.isOverdue || d.isDueThisMonth)
    .slice(0, 5);
  if (urgentDeadlines.length > 0) {
    lines.push('', 'Upcoming/overdue dues:');
    for (const deadline of urgentDeadlines) {
      lines.push(`- ${deadline.title}: ${deadline.label}`);
    }
  }

  return lines.join('\n');
}
