'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DesktopPageColumn } from '@/components/layout/desktop-page-column';
import { PageMandate, type PageMandateMetric } from '@/components/layout/page-mandate';
import { PlanVsActualSection } from '@/features/dashboard/components/plan-vs-actual-section';
import { DashboardQuickActionGrid } from '@/features/dashboard/components/dashboard-quick-action-grid';
import { DashboardGoalsList } from '@/features/dashboard/components/dashboard-goals-list';
import { DashboardInsightsStack } from '@/features/dashboard/components/dashboard-insights-stack';
import type { DashboardBootstrap } from '@/features/dashboard/types';
import type { GoalAdherence } from '@/lib/plan-adherence-service';
import type { CategoryLegendItem } from '@/lib/dashboard-insights';
import { cn, formatRupees } from '@/lib/utils';
import { getTransactionDisplayName } from '@/lib/transaction-utils';

interface DashboardDesktopProps {
  title: string;
  mandate: string;
  metrics: PageMandateMetric[];
  adherence: DashboardBootstrap['adherence'];
  stats: DashboardBootstrap['stats'];
  planIncomeContext: DashboardBootstrap['planIncomeContext'];
  incomeBreakdown: DashboardBootstrap['stats']['incomeBreakdown'];
  salaryReceived: number;
  planBaseIncome: number;
  alerts: string[];
  goals: GoalAdherence[];
  recentTransactions: Array<{
    id: string;
    title: string;
    description?: string | null;
    store?: string | null;
    personName?: string | null;
    date: string;
    amount: number;
    category: string;
  }>;
  topCategories: CategoryLegendItem[];
}

export function DashboardDesktop({
  title,
  mandate,
  metrics,
  adherence,
  stats,
  planIncomeContext,
  incomeBreakdown,
  salaryReceived,
  planBaseIncome,
  alerts,
  goals,
  recentTransactions,
  topCategories,
}: DashboardDesktopProps) {
  const monthlyTrends = stats.monthlyTrends ?? [];
  const topPayees = stats.topPayees ?? [];

  return (
    <DesktopPageColumn className="hidden space-y-4 lg:block">
      <PageMandate
        title={title}
        mandate={mandate}
        metrics={metrics}
        actions={<DashboardQuickActionGrid variant="desktop" />}
      />

      {alerts.length > 0 && (
        <div className="card-base border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertCircle className="size-4 text-[var(--warning)]" />
            Needs attention
          </div>
          <ul className="space-y-1 text-xs text-muted">
            {alerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="flex flex-col gap-3">
          <PlanVsActualSection
            buckets={adherence.buckets}
            lineItems={adherence.lineItems}
            plannedTotal={adherence.plannedTotal}
            actualTotal={adherence.actualTotal}
            salaryReceived={salaryReceived}
            planBaseIncome={planBaseIncome}
            planIncomeSource={adherence.planIncomeSource}
            planIncomeContext={planIncomeContext}
            incomeBreakdown={incomeBreakdown}
            budgetPlanName={adherence.budgetPlanName}
            defaultTab="breakdown"
          />

          <DashboardInsightsStack
            topCategories={topCategories}
            monthlyTrends={monthlyTrends}
            topPayees={topPayees}
          />
        </div>

        <div className="flex flex-col gap-3">
          <DashboardGoalsList goals={goals} />

          <section className="card-base p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium text-foreground">Recent activity</h2>
                <p className="text-[10px] text-muted">Latest transactions this month</p>
              </div>
              <Target className="size-4 text-hint" />
            </div>
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-muted">No transactions this month.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentTransactions.map((tx) => {
                  const isIncome = tx.amount > 0;
                  const displayName =
                    getTransactionDisplayName({
                      description: tx.description ?? undefined,
                      store: tx.store,
                      personName: tx.personName,
                    }) || tx.title;
                  return (
                    <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                          <span>{format(new Date(tx.date), 'd MMM')}</span>
                          <Chip variant="neutral" className="px-1 py-0 text-[10px]">
                            {tx.category}
                          </Chip>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-xs font-medium tabular-nums',
                          isIncome ? 'text-[var(--success)]' : 'text-[var(--danger)]',
                        )}
                      >
                        {isIncome ? '+' : ''}
                        {formatRupees(Math.abs(tx.amount))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
              <Link href="/transactions">View all transactions</Link>
            </Button>
          </section>
        </div>
      </div>

      {stats.salaryInfo && (
        <div className="card-base flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2 text-sm text-foreground sm:items-center">
            <CheckCircle2 className="size-4 shrink-0 text-[var(--success)]" />
            <span>
              Salary: {stats.salaryInfo.jobTitle} · {stats.salaryInfo.company} · take-home{' '}
              {formatRupees(stats.salaryInfo.takeHome)}/mo
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href="/salary">Manage salary</Link>
          </Button>
        </div>
      )}
    </DesktopPageColumn>
  );
}
