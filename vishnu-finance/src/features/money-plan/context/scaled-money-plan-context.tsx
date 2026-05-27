'use client';

import { createContext, useContext } from 'react';
import type { ScaledMoneyPlanView } from '@/lib/plan-income';

const ScaledMoneyPlanContext = createContext<ScaledMoneyPlanView | null>(null);

export function ScaledMoneyPlanProvider({
  value,
  children,
}: {
  value: ScaledMoneyPlanView;
  children: React.ReactNode;
}) {
  return (
    <ScaledMoneyPlanContext.Provider value={value}>
      {children}
    </ScaledMoneyPlanContext.Provider>
  );
}

export function useScaledMoneyPlan(): ScaledMoneyPlanView {
  const context = useContext(ScaledMoneyPlanContext);
  if (!context) {
    throw new Error('useScaledMoneyPlan must be used within ScaledMoneyPlanProvider');
  }
  return context;
}
