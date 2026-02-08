import { Suspense } from 'react';
import SimpleDashboard from '@/components/simple-dashboard';
import FinancialSkeleton from '@/components/feedback/financial-skeleton';
import { loadDashboardSummary } from '@/lib/loaders/dashboard';
import { requireUser } from '@/lib/auth/server-auth';
import type { SimpleDashboardData } from '@/components/simple-dashboard';
import { getCurrentMonthRange } from '@/lib/date-range';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const { startDate, endDate } = getCurrentMonthRange();

  let initialData: SimpleDashboardData | null = null;
  try {
    initialData = await loadDashboardSummary({
      userId: user.id,
      startDate,
      endDate,
      revalidate: 120,
    });
  } catch (error) {
    console.error('[dashboard] failed to bootstrap summary', error);
  }

  return (
    <Suspense fallback={<FinancialSkeleton />}>
      <SimpleDashboard
        initialData={initialData}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </Suspense>
  );
}
