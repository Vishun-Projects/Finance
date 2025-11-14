'use client';

import React, { useMemo, useState } from 'react';
import { FinancialEducation } from '@/lib/financial-education';
import { Button } from '@/components/ui/button';

export default function FinancialEducationAssistant() {
  const initialTip = useMemo(() => FinancialEducation.getTipOfTheDay(), []);
  const [tip, setTip] = useState(initialTip);

  const handleNewTip = () => {
    setTip(FinancialEducation.getRandomTip());
  };

  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Smart Money Insight</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {tip.category.toUpperCase()}
        </span>
      </div>
      <p className="mt-2 text-base font-medium text-foreground">{tip.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{tip.description}</p>

      {tip.steps && tip.steps.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {tip.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Difficulty: <span className="font-semibold text-foreground">{tip.difficulty}</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleNewTip}>
          Show Another Tip
        </Button>
      </div>
    </section>
  );
}
