'use client';

import AdvisorPage from '@/features/advisor/components/advisor-page';
import type { AdvisorInsightsPayload } from '@/lib/dashboard-insights';

interface AdvisorPageClientProps {
  initialInsights: AdvisorInsightsPayload;
}

export default function AdvisorPageClient({ initialInsights }: AdvisorPageClientProps) {
  return <AdvisorPage initialInsights={initialInsights} />;
}
