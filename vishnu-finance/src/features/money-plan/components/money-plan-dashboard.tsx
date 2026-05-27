'use client';

import { useState } from 'react';
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
import { planIncomeSourceLabel } from '@/lib/plan-income';
import type { ScaledMoneyPlanView } from '@/lib/plan-income';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

export default function MoneyPlanDashboard({ scaledPlan }: { scaledPlan: ScaledMoneyPlanView }) {
  return (
    <ScaledMoneyPlanProvider value={scaledPlan}>
      <MoneyPlanDashboardContent />
    </ScaledMoneyPlanProvider>
  );
}

function MoneyPlanDashboardContent() {
  const plan = useScaledMoneyPlan();
  const [activeTab, setActiveTab] = useState(0);
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="money-plan-root w-full max-w-none text-foreground">
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-hint">
          Personal Finance Plan
        </p>
        <h1 className="text-[22px] font-medium text-foreground">Vishnu&apos;s Money Dashboard</h1>
        <p className="mt-1 max-w-prose text-balance text-xs text-muted-foreground sm:text-[13px]">
          6.5 LPA · {fmt(plan.salary)} in-hand · scaled from {planIncomeSourceLabel(plan.source)} · Age{' '}
          {plan.age} · Mummy {plan.parents.mummy} · Papa {plan.parents.papa}
        </p>
      </div>

      <div className="mb-5 md:hidden">
        <Select value={String(activeTab)} onValueChange={(value) => setActiveTab(Number(value))}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab, i) => (
              <SelectItem key={tab} value={String(i)}>
                {tab}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-base mb-5 hidden gap-0.5 overflow-x-auto p-1 md:flex">
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
