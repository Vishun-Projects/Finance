import { prisma } from '@/lib/db';
import { loadPlanPreviewCached } from '@/lib/server-data-cache';import type { SalaryStructure, SalaryHistory } from '@/types';
import type { PlanPreviewData } from '@/components/finance/salary-plan-preview-card';

export interface SalaryBootstrap {
  structures: SalaryStructure[];
  history: SalaryHistory[];
  planPreview: PlanPreviewData | null;
}

function toJson<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function loadSalaryBootstrap(userId: string): Promise<SalaryBootstrap> {
  const [structures, history, planPreview] = await Promise.all([
    (prisma as any).salaryStructure.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).salaryHistory.findMany({
      where: { userId },
      orderBy: { effectiveDate: 'desc' },
      include: { salaryStructure: true },
    }),
    loadPlanPreviewCached(userId),
  ]);

  return {
    structures: toJson(structures) as SalaryStructure[],
    history: toJson(history) as SalaryHistory[],
    planPreview,
  };
}
