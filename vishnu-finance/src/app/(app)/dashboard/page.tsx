import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/server-auth';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import DashboardPage from '@/features/dashboard/components/dashboard-page';
import { loadDashboard } from '@/features/dashboard/loaders';

export const dynamic = 'force-dynamic';

export default async function DashboardRoutePage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const data = await loadDashboard(user.id);

  return (
    <Suspense
      fallback={
        <RouteLoadingState
          title="Loading dashboard"
          description="Pulling transactions and plan adherence..."
          className="min-h-[50vh]"
        />
      }
    >
      <DashboardPage data={data} />
    </Suspense>
  );
}
