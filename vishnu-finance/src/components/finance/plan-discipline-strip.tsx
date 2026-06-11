import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { DisciplineSummary } from '@/lib/plans-discipline';
import { formatDisciplineCurrency } from '@/lib/plans-discipline';
import { cn } from '@/lib/utils';

interface PlanDisciplineStripProps {
  summary: DisciplineSummary;
  className?: string;
  href?: string;
}

export function PlanDisciplineStrip({
  summary,
  className,
  href = '/plans',
}: PlanDisciplineStripProps) {
  const content = (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-[13px] border border-border bg-card p-3 transition-colors',
        href && 'active:bg-muted/40',
        summary.status === 'overcommitted' && 'border-[var(--danger)]/30',
        summary.status === 'tight' && 'border-[var(--warning)]/30',
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Plan discipline</p>
        <p className="mt-1 text-sm text-foreground">
          Need {formatDisciplineCurrency(summary.totalRequiredPerMonth)}/mo ·{' '}
          {formatDisciplineCurrency(summary.capacity.available)} fundable
        </p>
        <p className="mt-0.5 text-[10px] text-muted">
          {summary.gap >= 0
            ? `${formatDisciplineCurrency(summary.gap)} after goals & dues`
            : `${formatDisciplineCurrency(Math.abs(summary.gap))} short`}
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted" />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
