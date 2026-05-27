import type { SimpleDashboardData } from '@/types/dashboard';
import type { PlanAdherenceResult } from '@/lib/plan-adherence-service';

export interface DashboardBootstrap {
  stats: SimpleDashboardData;
  adherence: PlanAdherenceResult;
}
