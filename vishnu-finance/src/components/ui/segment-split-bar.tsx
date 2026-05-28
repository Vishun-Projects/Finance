'use client';

import { cn } from '@/lib/utils';
import type { SegmentSplit } from '@/lib/dashboard-insights';

interface SegmentSplitBarProps {
  split: SegmentSplit;
  className?: string;
  showIdealHint?: boolean;
}

export function SegmentSplitBar({ split, className, showIdealHint = true }: SegmentSplitBarProps) {
  const total = split.needs + split.wants + split.savings;
  if (total <= 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {split.needsPct > 0 && (
          <div className="h-full bg-[var(--chart-1)]" style={{ width: `${split.needsPct}%` }} />
        )}
        {split.wantsPct > 0 && (
          <div className="h-full bg-[var(--chart-3)]" style={{ width: `${split.wantsPct}%` }} />
        )}
        {split.savingsPct > 0 && (
          <div className="h-full bg-[var(--chart-2)]" style={{ width: `${split.savingsPct}%` }} />
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-muted">
          <span className="size-2 rounded-full bg-[var(--chart-1)]" />
          Needs {split.needsPct}%
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted">
          <span className="size-2 rounded-full bg-[var(--chart-3)]" />
          Wants {split.wantsPct}%
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted">
          <span className="size-2 rounded-full bg-[var(--chart-2)]" />
          Saved {split.savingsPct}%
        </span>
      </div>
      {showIdealHint && (
        <p className="text-[10px] text-muted">Ideal: 50% Needs · 30% Wants · 20% Savings</p>
      )}
    </div>
  );
}
