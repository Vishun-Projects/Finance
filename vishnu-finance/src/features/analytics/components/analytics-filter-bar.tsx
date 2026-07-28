'use client';

import type { AnalyticsPeriodPreset } from '@/features/analytics/types';
import { cn } from '@/lib/utils';

const PRESETS: Array<{ id: AnalyticsPeriodPreset; label: string }> = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' },
  { id: 'custom', label: 'Custom' },
];

export default function AnalyticsFilterBar({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onCustomRangeChange,
}: {
  preset: AnalyticsPeriodPreset;
  startDate: string;
  endDate: string;
  onPresetChange: (preset: AnalyticsPeriodPreset) => void;
  onCustomRangeChange: (startDate: string, endDate: string) => void;
}) {
  return (
    <div className="w-full min-w-0">
      <div className="-mx-0.5 flex items-center gap-1 overflow-x-auto px-0.5 scrollbar-none sm:flex-wrap sm:overflow-visible sm:justify-end">
        {PRESETS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onPresetChange(option.id)}
            className={cn(
              'h-8 shrink-0 rounded-md px-2.5 text-xs font-medium transition-colors sm:h-9',
              preset === option.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted hover:bg-muted/50 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {preset === 'custom' ? (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="min-w-0 space-y-1">
            <span className="text-[10px] uppercase tracking-[0.08em] text-muted">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onCustomRangeChange(e.target.value, endDate)}
              className="h-9 w-full min-w-0 rounded-md border border-border/50 bg-card px-2 text-sm text-foreground sm:px-3"
            />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-[10px] uppercase tracking-[0.08em] text-muted">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onCustomRangeChange(startDate, e.target.value)}
              className="h-9 w-full min-w-0 rounded-md border border-border/50 bg-card px-2 text-sm text-foreground sm:px-3"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
