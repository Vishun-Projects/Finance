import { Suspense } from 'react';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { requireUser } from '@/lib/auth/server-auth';
import { loadAdvisorInsights } from '@/lib/advisor-insights-loader';
import AdvisorPageClient from './page-client';

export default function AdvisorPage() {
  return (
    <Suspense fallback={<AppRouteLoader variant="advisor" title="Loading advisor" />}>
      <AdvisorLoader />
    </Suspense>
  );
}

async function AdvisorLoader() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const insights = await loadAdvisorInsights(user.id);
  return <AdvisorPageClient initialInsights={insights} />;
}
