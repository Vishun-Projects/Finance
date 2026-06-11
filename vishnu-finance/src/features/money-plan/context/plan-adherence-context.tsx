'use client';

import { createContext, useContext } from 'react';
import type { PlanAdherenceResult } from '@/lib/plan-adherence-service';

const PlanAdherenceContext = createContext<PlanAdherenceResult | null>(null);

export function PlanAdherenceProvider({
  value,
  children,
}: {
  value: PlanAdherenceResult | null;
  children: React.ReactNode;
}) {
  return <PlanAdherenceContext.Provider value={value}>{children}</PlanAdherenceContext.Provider>;
}

export function usePlanAdherence(): PlanAdherenceResult | null {
  return useContext(PlanAdherenceContext);
}
