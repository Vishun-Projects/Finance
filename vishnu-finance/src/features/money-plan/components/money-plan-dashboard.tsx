'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { icons } from '@/features/money-plan/components/money-plan-inline-ui';
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
import { cn } from '@/lib/utils';

const tabs = ['Overview', 'Savings', 'Investments', 'Insurance', 'Roadmap', 'Research'] as const;

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

const SHORT_LABELS: Record<(typeof tabs)[number], string> = {
  Overview: 'Overview',
  Savings: 'Savings',
  Investments: 'Invest',
  Insurance: 'Insure',
  Roadmap: 'Roadmap',
  Research: 'Research',
};

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
    <div className="money-plan-root w-full max-w-none space-y-3 text-foreground lg:space-y-4">
      {/* Scrolls away — global top bar already says Phase Plan */}
      <div className="space-y-2">
        <p className="max-w-prose text-balance text-[11px] text-muted sm:text-xs">
          6.5 LPA · Age {plan.age} · Mummy {plan.parents.mummy} · Papa {plan.parents.papa}
        </p>

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

        {adherence ? (
          <div className="flex flex-wrap gap-1.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              See this month&apos;s actuals
              <ArrowRight className="size-3" />
            </Link>
            <Link
              href="/plans"
              className="inline-flex items-center gap-1 rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Fund goals from headroom
              <ArrowRight className="size-3" />
            </Link>
          </div>
        ) : null}

        {/* Desktop title — no global top bar duplicate on lg */}
        <h1 className="hidden text-xl font-semibold text-foreground lg:block">Phase Plan</h1>
      </div>

      <MobileStickyTabs
        tabs={tabs.map((tab, i) => ({
          id: String(i),
          label: tab,
          shortLabel: SHORT_LABELS[tab],
        }))}
        activeId={String(activeTab)}
        onChange={(id) => setActiveTab(Number(id))}
        className="lg:hidden"
        underGlobalTopBar
      />

      <div className="hidden border-b border-border/40 lg:block dark:border-border/55">
        <div className="-mb-px flex gap-0.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(i)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs font-medium transition-colors whitespace-nowrap',
                activeTab === i
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground',
              )}
            >
              <span className="opacity-70">{tabIcons[i]}</span>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <ActiveComponent />
    </div>
  );
}
