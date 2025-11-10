import type { SimpleDashboardData } from '@/components/simple-dashboard';
import { serverFetch } from '@/lib/server-fetch';

interface LoadDashboardOptions {
  userId: string;
  startDate: string;
  endDate: string;
  revalidate?: number;
}

export async function loadDashboardSummary({
  userId,
  startDate,
  endDate,
  revalidate = 60,
}: LoadDashboardOptions): Promise<SimpleDashboardData> {
  const params = new URLSearchParams({
    userId,
    start: startDate,
    end: endDate,
  });

  return serverFetch<SimpleDashboardData>(`/api/dashboard-simple?${params.toString()}`, {
    revalidate,
    description: 'dashboard-simple',
  });
}


