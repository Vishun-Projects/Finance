import { Suspense } from 'react';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { requireUser } from '@/lib/auth/server-auth';
import DashboardPage from '@/features/dashboard/components/dashboard-page';
import { loadDashboardCached } from '@/lib/server-data-cache';

export default function DashboardRoutePage() {
  return (
    <Suspense fallback={<AppRouteLoader variant="dashboard" title="Loading dashboard" />}>
      <DashboardLoader />
    </Suspense>
  );
}

async function DashboardLoader() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const data = await loadDashboardCached(user.id);
  return <DashboardPage data={data} />;
}
