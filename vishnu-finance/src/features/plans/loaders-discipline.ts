import { loadDashboard } from '@/features/dashboard/loaders';
import type { DisciplineSummary } from '@/lib/plans-discipline';

export async function loadDisciplineSummary(userId: string): Promise<DisciplineSummary> {
  const dashboard = await loadDashboard(userId);
  return dashboard.disciplineSummary;
}
