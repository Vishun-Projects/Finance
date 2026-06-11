import { requireUser } from '@/lib/auth/server-auth';
import { loadScaledMoneyPlanForUser } from '@/lib/plan-income';
import { loadDashboard } from '@/features/dashboard/loaders';
import MoneyPlanDashboard from '@/features/money-plan/components/money-plan-dashboard';

export const dynamic = 'force-dynamic';

/** Phase planner preserved at /phase-plan (linked from the real dashboard). */
export default async function PhasePlanPage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const [scaledPlan, dashboard] = await Promise.all([
    loadScaledMoneyPlanForUser(user.id),
    loadDashboard(user.id),
  ]);

  return <MoneyPlanDashboard scaledPlan={scaledPlan} adherence={dashboard.adherence} />;
}
