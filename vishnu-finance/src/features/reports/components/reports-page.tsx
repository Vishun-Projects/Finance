'use client';

import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Download } from 'lucide-react';
import { PageMandate } from '@/components/layout/page-mandate';
import { Button } from '@/components/ui/button';
import { patterns } from '@/design/patterns';
import { cn } from '@/lib/utils';

function monthOptions(count = 12) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = subMonths(now, i);
    const value = format(d, 'yyyy-MM');
    const label = format(d, 'MMMM yyyy');
    return { value, label, start: startOfMonth(d), end: endOfMonth(d) };
  });
}

export default function ReportsPage() {
  const options = useMemo(() => monthOptions(), []);
  const [selected, setSelected] = useState(options[0]?.value ?? '');
  const selectedMonth = options.find((o) => o.value === selected) ?? options[0];

  const csvHref = selectedMonth
    ? `/api/export/transactions?startDate=${format(selectedMonth.start, 'yyyy-MM-dd')}&endDate=${format(selectedMonth.end, 'yyyy-MM-dd')}`
    : '/api/export/transactions';

  return (
    <div className={cn(patterns.pageColumn, 'space-y-6')}>
      <PageMandate
        title="Reports"
        mandate="Download a CSV of transactions for any month — for your records or tax prep."
        hideTitleOnMobile
      />

      <section className="card-base space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label htmlFor="report-month" className="mb-1.5 block text-xs font-medium text-hint">
              Month
            </label>
            <select
              id="report-month"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Button asChild className="shrink-0">
            <a href={csvHref} download>
              <Download className="mr-2 size-4" />
              Download CSV
            </a>
          </Button>
        </div>

        <p className="text-xs text-muted">
          Export includes date, description, category, type, debit/credit, store, and person for{' '}
          <span className="font-medium text-foreground">{selectedMonth?.label}</span>. Open in Excel or
          Google Sheets for pivot tables and category totals.
        </p>
      </section>

      <section className="card-base p-4">
        <h2 className="text-sm font-medium text-foreground">Print-friendly summary</h2>
        <p className="mt-1 text-xs text-muted">
          For a full month-at-a-glance with charts, use{' '}
          <a href="/dashboard" className="font-medium text-foreground underline-offset-2 hover:underline">
            Dashboard
          </a>{' '}
          or{' '}
          <a href="/financial-health" className="font-medium text-foreground underline-offset-2 hover:underline">
            Health Score
          </a>
          . Net worth trends live on{' '}
          <a href="/net-worth" className="font-medium text-foreground underline-offset-2 hover:underline">
            Net worth
          </a>
          .
        </p>
        <p className="mt-3 text-sm tabular-nums text-muted">
          Selected period: {format(selectedMonth.start, 'd MMM yyyy')} –{' '}
          {format(selectedMonth.end, 'd MMM yyyy')}
        </p>
      </section>
    </div>
  );
}
