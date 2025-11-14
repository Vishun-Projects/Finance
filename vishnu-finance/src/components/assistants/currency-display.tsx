'use client';

import React from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CurrencyDisplayProps {
  title?: string;
}

export default function CurrencyDisplayAssistant({ title = 'Preferred Currency' }: CurrencyDisplayProps) {
  const { selectedCurrency, getCurrencySymbol, lastUpdated } = useCurrency();
  const symbol = getCurrencySymbol(selectedCurrency);

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="mt-2 text-2xl font-bold text-foreground">
        {symbol} {selectedCurrency}
      </div>
      {lastUpdated && (
        <p className="mt-1 text-xs text-muted-foreground">
          Rates updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </section>
  );
}
