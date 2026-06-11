'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { fmt } from '@/features/money-plan/data';
import { Pill, icons } from '@/features/money-plan/components/money-plan-inline-ui';
import {
  OverviewTab,
  SavingsTab,
  InvestmentsTab,
  InsuranceTab,
  RoadmapTab,
  ResearchTab,
} from '@/features/money-plan/components/tabs';
import {
  ScaledMoneyPlanProvider,
  useScaledMoneyPlan,
} from '@/features/money-plan/context/scaled-money-plan-context';
import { PlanAdherenceProvider } from '@/features/money-plan/context/plan-adherence-context';
import { TakeHomeAnchor } from '@/components/finance/take-home-anchor';
import type { PlanAdherenceResult } from '@/lib/plan-adherence-service';
import type { ScaledMoneyPlanView } from '@/lib/plan-income';
import { MobileStickyTabs } from '@/components/ui/mobile-sticky-tabs';

const tabs = ['Overview', 'Savings', 'Investments', 'Insurance', 'Roadmap', 'Research'];

const TAB_COMPONENTS = [
  OverviewTab,
  SavingsTab,
  InvestmentsTab,
  InsuranceTab,
  RoadmapTab,
  ResearchTab,
];

const tabIcons = [
  icons.overview,
  icons.savings,
  icons.investments,
  icons.insurance,
  icons.roadmap,
  icons.research,
];

export default function MoneyPlanDashboard({
  scaledPlan,
  adherence,
}: {
  scaledPlan: ScaledMoneyPlanView;
  adherence?: PlanAdherenceResult | null;
}) {
  return (
    <ScaledMoneyPlanProvider value={scaledPlan}>
      <PlanAdherenceProvider value={adherence ?? null}>
        <MoneyPlanDashboardContent adherence={adherence} />
      </PlanAdherenceProvider>
    </ScaledMoneyPlanProvider>
  );
}

function MoneyPlanDashboardContent({ adherence }: { adherence?: PlanAdherenceResult | null }) {
  const plan = useScaledMoneyPlan();
  const [activeTab, setActiveTab] = useState(0);
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="money-plan-root w-full max-w-none text-foreground">
      <div className="mb-5 space-y-3">
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-hint">
            Personal Finance Plan
          </p>
          <h1 className="text-[22px] font-medium text-foreground">Vishnu&apos;s Money Dashboard</h1>
          <p className="mt-1 max-w-prose text-balance text-xs text-muted-foreground sm:text-[13px]">
            6.5 LPA · Age {plan.age} · Mummy {plan.parents.mummy} · Papa {plan.parents.papa}
          </p>
        </div>

        <TakeHomeAnchor
          baseIncome={plan.baseIncome}
          source={plan.source}
          variant="compact"
          activeSalaryTakeHome={plan.activeSalaryTakeHome}
          currentMonthSalaryReceived={plan.currentMonthSalaryReceived}
          lastMonthSalaryReceived={plan.lastMonthSalaryReceived}
          receivedSalarySource={
            plan.currentMonthSalaryReceived > 0
              ? 'current_month'
              : plan.lastMonthSalaryReceived > 0
                ? 'last_month'
                : 'none'
          }
        />

        {adherence && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface"
            >
              See this month&apos;s actuals
              <ArrowRight className="size-3" />
            </Link>
            <Link
              href="/plans"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface"
            >
              Fund goals from headroom
              <ArrowRight className="size-3" />
            </Link>
          </div>
        )}
      </div>

      <MobileStickyTabs
        tabs={tabs.map((tab, i) => ({
          id: String(i),
          label: tab,
          shortLabel: tab === 'Investments' ? 'Invest' : tab === 'Insurance' ? 'Insure' : tab.slice(0, 5),
        }))}
        activeId={String(activeTab)}
        onChange={(id) => setActiveTab(Number(id))}
        className="mb-4"
      />

      <div className="card-base mb-5 hidden gap-0.5 overflow-x-auto p-1 lg:flex">
        {tabs.map((tab, i) => (
          <Pill
            key={tab}
            label={tab}
            active={activeTab === i}
            onClick={() => setActiveTab(i)}
            icon={tabIcons[i]}
          />
        ))}
      </div>

      <ActiveComponent />
    </div>
  );
}
