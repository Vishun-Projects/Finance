'use client';

import { cn } from '@/lib/utils';
import type { InsightTone } from '@/lib/dashboard-insights';

const toneClasses: Record<InsightTone, string> = {
  info: 'border-l-[var(--info)]',
  warning: 'border-l-[var(--warning)]',
  success: 'border-l-[var(--success)]',
  neutral: 'border-l-border',
};

interface InsightBannerProps {
  message: string;
  tone?: InsightTone;
  className?: string;
}

export function InsightBanner({ message, tone = 'info', className }: InsightBannerProps) {
  return (
    <div className={cn('rounded-[13px] border-l-[3px] px-3 py-2.5 glass-regular glass-text', toneClasses[tone], className)}>
      <p className="text-xs font-medium leading-relaxed">{message}</p>
    </div>
  );
}
