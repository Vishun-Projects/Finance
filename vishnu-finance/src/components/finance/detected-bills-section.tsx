'use client';

import { useState } from 'react';
import { CreditCard, ChevronDown, RefreshCw, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useRecurringBills } from '@/hooks/use-recurring-bills';
import type { DetectedRecurringBill } from '@/lib/recurring-detection';
import { cn } from '@/lib/utils';

interface DetectedBillsSectionProps {
  className?: string;
  onAddDeadline?: (bill: DetectedRecurringBill) => void;
  defaultExpanded?: boolean;
  maxItems?: number;
}

export function DetectedBillsSection({
  className,
  onAddDeadline,
  defaultExpanded = false,
  maxItems = 4,
}: DetectedBillsSectionProps) {
  const { formatCurrency } = useCurrency();
  const { patterns, loading, error, refresh } = useRecurringBills();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const activePatterns = patterns.filter((b) => b.isActiveRecently !== false);
  const monthlyTotal = activePatterns
    .filter((b) => b.frequency === 'monthly')
    .reduce((sum, b) => sum + b.amount, 0);

  const mandates = activePatterns.filter((b) => b.kind === 'mandate');
  const habits = activePatterns.filter((b) => b.kind === 'habit');
  const visibleMandates = expanded ? mandates : mandates.slice(0, maxItems);
  const visibleHabits = expanded ? habits : habits.slice(0, 2);
  const hiddenCount = mandates.length - visibleMandates.length + habits.length - visibleHabits.length;

  return (
    <section className={cn('card-base p-3', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-foreground">Active this month</h2>
          <p className="text-[11px] text-muted">
            Recurring debits seen in the last {expanded ? '5 weeks' : 'few weeks'} — cancelled subs are hidden.
          </p>
        </div>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {!loading && activePatterns.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          Est. monthly from active: <span className="font-medium text-foreground">{formatCurrency(monthlyTotal)}</span>
        </p>
      )}

      {loading ? (
        <p className="mt-2 text-sm text-muted">Scanning recent transactions…</p>
      ) : activePatterns.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No active recurring bills detected this month.</p>
      ) : (
        <div className="mt-3 divide-y divide-border rounded-lg border border-border">
          {visibleMandates.map((bill) => (
            <BillRow key={`${bill.merchant}-${bill.amount}-mandate`} bill={bill} onAddDeadline={onAddDeadline} />
          ))}
          {visibleHabits.map((bill) => (
            <div key={`${bill.merchant}-${bill.amount}-habit`} className="flex items-center gap-3 px-3 py-2.5">
              <Repeat className="size-4 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{bill.merchant}</p>
                <p className="text-[10px] text-muted">~{formatCurrency(bill.amount)}/wk</p>
              </div>
              <Badge variant="outline" className="text-[10px]">Habit</Badge>
            </div>
          ))}
        </div>
      )}

      {!loading && hiddenCount > 0 && (
        <Button variant="ghost" size="sm" className="mt-2 h-8 w-full text-xs" onClick={() => setExpanded(true)}>
          Show {hiddenCount} more
          <ChevronDown className="ml-1 size-3" />
        </Button>
      )}
    </section>
  );
}

function BillRow({
  bill,
  onAddDeadline,
}: {
  bill: DetectedRecurringBill;
  onAddDeadline?: (bill: DetectedRecurringBill) => void;
}) {
  const { formatCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <CreditCard className="size-4 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{bill.merchant}</p>
        <p className="text-[10px] text-muted">
          {formatCurrency(bill.amount)}/{bill.frequency === 'monthly' ? 'mo' : 'wk'} · last{' '}
          {bill.daysSinceLast === 0 ? 'today' : `${bill.daysSinceLast}d ago`}
        </p>
      </div>
      {onAddDeadline && (
        <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-[10px]" onClick={() => onAddDeadline(bill)}>
          Add due
        </Button>
      )}
    </div>
  );
}
