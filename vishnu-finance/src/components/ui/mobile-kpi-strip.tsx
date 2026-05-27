'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';

export type KpiTone = 'success' | 'danger' | 'neutral' | 'info';

export interface MobileKpiItem {
  label: string;
  value: React.ReactNode;
  tone?: KpiTone;
}

interface MobileKpiStripProps {
  items: MobileKpiItem[];
  className?: string;
}

const toneClasses: Record<KpiTone, string> = {
  success: 'text-[var(--success)]',
  danger: 'text-[var(--danger)]',
  neutral: 'text-foreground',
  info: 'text-info',
};

export function MobileKpiStrip({ items, className }: MobileKpiStripProps) {
  return (
    <>
      <div className={cn('hidden md:contents', className)} aria-hidden />
      <div className={cn(patterns.mobileKpiStrip, 'md:hidden', className)}>
        {items.map((item) => (
          <div key={item.label} className={cn(patterns.mobileKpiPill, 'card-base shrink-0')}>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">{item.label}</p>
            <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', toneClasses[item.tone ?? 'neutral'])}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

interface MobileHeroMetricProps {
  label: string;
  value: React.ReactNode;
  tone?: KpiTone;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function MobileHeroMetric({ label, value, tone = 'neutral', subtitle, footer, className }: MobileHeroMetricProps) {
  return (
    <div className={cn('card-base p-3 md:hidden', className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums leading-none', toneClasses[tone])}>{value}</p>
      {subtitle && <div className="mt-2 text-xs text-muted">{subtitle}</div>}
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}
