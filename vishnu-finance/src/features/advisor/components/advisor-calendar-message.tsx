'use client';

import SpendingCalendar from '@/features/transactions/components/spending-calendar';
import type { CalendarPayload } from '@/lib/advisor-artifacts/types';
import { cn } from '@/lib/utils';

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

interface AdvisorCalendarMessageProps {
  title?: string;
  payload: CalendarPayload;
  className?: string;
}

export function AdvisorCalendarMessage({
  title,
  payload,
  className,
}: AdvisorCalendarMessageProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-xl border border-border/70 bg-card/70',
        className,
      )}
    >
      {title ? (
        <div className="border-b border-border/60 px-3.5 py-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            {title}
          </p>
        </div>
      ) : null}
      <SpendingCalendar
        dailySpend={payload.days}
        formatAmount={formatInr}
        rangeEnd={payload.rangeEnd}
      />
    </div>
  );
}
