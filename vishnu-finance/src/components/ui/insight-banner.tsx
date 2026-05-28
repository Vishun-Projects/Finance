'use client';

import { cn } from '@/lib/utils';
import type { InsightTone } from '@/lib/dashboard-insights';

const toneClasses: Record<InsightTone, string> = {
  info: 'border-l-[var(--info)] bg-[var(--info)]/5 text-[var(--info)]',
  warning: 'border-l-[var(--warning)] bg-[var(--warning)]/5 text-[var(--warning)]',
  success: 'border-l-[var(--success)] bg-[var(--success)]/5 text-[var(--success)]',
  neutral: 'border-l-border bg-surface text-muted',
};

interface InsightBannerProps {
  message: string;
  tone?: InsightTone;
  className?: string;
}

export function InsightBanner({ message, tone = 'info', className }: InsightBannerProps) {
  return (
    <div className={cn('rounded-md border-l-[3px] px-3 py-2.5', toneClasses[tone], className)}>
      <p className="text-xs leading-relaxed">{message}</p>
    </div>
  );
}
