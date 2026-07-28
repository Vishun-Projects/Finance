import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface PageMandateMetric {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger' | 'warning';
  href?: string;
}

interface PageMandateProps {
  title: string;
  mandate: string;
  metrics?: PageMandateMetric[];
  className?: string;
  actions?: ReactNode;
  /** Hide h1 on mobile when the global top bar already shows the same title */
  hideTitleOnMobile?: boolean;
}

const toneClass: Record<NonNullable<PageMandateMetric['tone']>, string> = {
  default: 'text-foreground',
  success: 'text-[var(--success)]',
  danger: 'text-[var(--danger)]',
  warning: 'text-[var(--warning)]',
};

export function PageMandate({
  title,
  mandate,
  metrics = [],
  className,
  actions,
  hideTitleOnMobile = false,
}: PageMandateProps) {
  const shown = metrics.slice(0, 3);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1
            className={cn(
              'text-lg font-semibold text-foreground lg:text-xl',
              hideTitleOnMobile && 'max-lg:hidden',
            )}
          >
            {title}
          </h1>
          <p className={cn('text-xs text-muted lg:text-sm', hideTitleOnMobile ? 'mt-0' : 'mt-0.5')}>
            {mandate}
          </p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {shown.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {shown.map((metric) => {
            const chip = (
              <div
                key={`${metric.label}-${metric.value}`}
                className="min-w-[5.5rem] shrink-0 rounded-lg bg-surface px-3 py-2"
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-hint">{metric.label}</p>
                <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', toneClass[metric.tone ?? 'default'])}>
                  {metric.value}
                </p>
              </div>
            );
            if (metric.href) {
              return (
                <Link key={`${metric.label}-${metric.value}`} href={metric.href} className="shrink-0">
                  {chip}
                </Link>
              );
            }
            return chip;
          })}
        </div>
      )}
    </div>
  );
}
