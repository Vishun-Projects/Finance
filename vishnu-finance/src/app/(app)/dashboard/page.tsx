import { requireUser } from '@/lib/auth/server-auth';
import DashboardPage from '@/features/dashboard/components/dashboard-page';
import { loadDashboardCached } from '@/lib/server-data-cache';

export default async function DashboardRoutePage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const data = await loadDashboardCached(user.id);
  return <DashboardPage data={data} />;
}
