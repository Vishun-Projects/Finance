'use client';

import React, { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface DailySpendEntry {
  date: string;
  expense: number;
  income: number;
  count: number;
}

interface SpendingCalendarProps {
  dailySpend: DailySpendEntry[];
  formatAmount: (value: number) => string;
  rangeEnd?: string;
  isLoading?: boolean;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function intensityClass(expense: number, maxExpense: number) {
  if (expense <= 0) return 'bg-transparent';
  const ratio = expense / maxExpense;
  if (ratio >= 0.75) return 'bg-[var(--danger)]';
  if (ratio >= 0.5) return 'bg-[var(--danger)]/70';
  if (ratio >= 0.25) return 'bg-[var(--danger)]/45';
  return 'bg-[var(--danger)]/25';
}

export default function SpendingCalendar({
  dailySpend,
  formatAmount,
  rangeEnd,
  isLoading = false,
}: SpendingCalendarProps) {
  const spendByDate = useMemo(() => {
    const map = new Map<string, DailySpendEntry>();
    dailySpend.forEach((entry) => map.set(entry.date, entry));
    return map;
  }, [dailySpend]);

  const maxExpense = useMemo(
    () => Math.max(...dailySpend.map((d) => d.expense), 1),
    [dailySpend],
  );

  const [month, setMonth] = useState(() => {
    if (rangeEnd) {
      try {
        return startOfMonth(parseISO(rangeEnd));
      } catch {
        return startOfMonth(new Date());
      }
    }
    return startOfMonth(new Date());
  });

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const monthDays = useMemo(() => eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  }), [month]);

  const leadingEmpty = getDay(startOfMonth(month));

  const hoveredEntry = hoveredDate ? spendByDate.get(hoveredDate) : null;

  if (isLoading) {
    return (
      <div className="border-b border-border p-3">
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="h-[220px] w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-foreground">Daily spending</h2>
          <p className="text-[10px] text-muted">Hover a day for totals</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[5.5rem] text-center text-xs font-medium tabular-nums">
            {format(month, 'MMM yyyy')}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((label) => (
          <div key={label} className="text-center text-[10px] font-medium uppercase text-muted">
            {label}
          </div>
        ))}
        {Array.from({ length: leadingEmpty }).map((_, i) => (
          <div key={`pad-${i}`} className="h-8" aria-hidden />
        ))}
        {monthDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const entry = spendByDate.get(dateKey);
          const expense = entry?.expense ?? 0;
          const income = entry?.income ?? 0;
          const inMonth = isSameMonth(day, month);
          const tooltip = expense > 0 || income > 0
            ? `${format(day, 'd MMM yyyy')}\nSpent: ${formatAmount(expense)}${income > 0 ? `\nReceived: ${formatAmount(income)}` : ''}${entry?.count ? `\n${entry.count} txn` : ''}`
            : format(day, 'd MMM yyyy');

          return (
            <button
              key={dateKey}
              type="button"
              title={tooltip}
              onMouseEnter={() => setHoveredDate(dateKey)}
              onMouseLeave={() => setHoveredDate(null)}
              className={cn(
                'relative flex h-8 flex-col items-center justify-center rounded-md text-[11px] tabular-nums transition-colors',
                inMonth ? 'text-foreground hover:bg-surface' : 'text-muted/40',
                isToday(day) && 'ring-1 ring-border',
                expense > 0 && 'font-semibold',
              )}
            >
              <span>{day.getDate()}</span>
              {expense > 0 ? (
                <span
                  className={cn(
                    'absolute bottom-0.5 h-1 w-4 rounded-full',
                    intensityClass(expense, maxExpense),
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-[2rem] rounded-md bg-surface px-2 py-1.5 text-[10px] text-muted">
        {hoveredEntry ? (
          <span>
            <span className="font-medium text-foreground">
              {hoveredDate ? format(parseISO(hoveredDate), 'd MMM yyyy') : ''}
            </span>
            {' · '}
            Spent {formatAmount(hoveredEntry.expense)}
            {hoveredEntry.income > 0 ? ` · Received ${formatAmount(hoveredEntry.income)}` : ''}
            {hoveredEntry.count > 0 ? ` · ${hoveredEntry.count} txn` : ''}
          </span>
        ) : (
          <span>Move over a date to preview spend</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted">
        <span>Low</span>
        <div className="flex flex-1 gap-0.5">
          <span className="h-1 flex-1 rounded-full bg-[var(--danger)]/20" />
          <span className="h-1 flex-1 rounded-full bg-[var(--danger)]/45" />
          <span className="h-1 flex-1 rounded-full bg-[var(--danger)]/70" />
          <span className="h-1 flex-1 rounded-full bg-[var(--danger)]" />
        </div>
        <span>High</span>
      </div>
    </div>
  );
}
