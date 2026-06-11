'use client';

import { useCurrency } from '@/contexts/CurrencyContext';

interface LiabilityRow {
  id: string;
  name: string;
  balance: number;
}

interface DebtPayoffHintProps {
  liabilities: LiabilityRow[];
}

/** Illustrative payoff estimate — not financial advice. */
export function DebtPayoffHint({ liabilities }: DebtPayoffHintProps) {
  const { formatCurrency } = useCurrency();
  const withBalance = liabilities.filter((l) => l.balance > 0);
  if (withBalance.length === 0) return null;

  return (
    <section className="card-base space-y-3 p-4">
      <div>
        <h2 className="text-sm font-medium text-foreground">Debt payoff (illustrative)</h2>
        <p className="mt-1 text-xs text-muted">
          Rough months-to-zero if you paid ~5% of each balance monthly. Not advice — adjust for your
          actual EMI or minimum due.
        </p>
      </div>
      <ul className="space-y-2 text-sm">
        {withBalance.map((l) => {
          const illustrativePayment = Math.max(l.balance * 0.05, 500);
          const months = Math.ceil(l.balance / illustrativePayment);
          return (
            <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
              <span className="font-medium text-foreground">{l.name}</span>
              <span className="text-xs text-muted tabular-nums">
                {formatCurrency(l.balance)} · ~{months} mo at {formatCurrency(Math.round(illustrativePayment))}/mo
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
