import { requireUser } from '@/lib/auth/server-auth';
import { loadScaledMoneyPlanForUser } from '@/lib/plan-income';
import { loadDashboardCached } from '@/lib/server-data-cache';
import MoneyPlanDashboard from '@/features/money-plan/components/money-plan-dashboard';

/** Phase planner preserved at /phase-plan (linked from the real dashboard). */
export default async function PhasePlanPage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const [scaledPlan, dashboard] = await Promise.all([
    loadScaledMoneyPlanForUser(user.id),
    loadDashboardCached(user.id),
  ]);

  return <MoneyPlanDashboard scaledPlan={scaledPlan} adherence={dashboard.adherence} />;
}
