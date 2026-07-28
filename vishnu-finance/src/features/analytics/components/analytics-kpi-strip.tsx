'use client';

import { formatRupees, cn } from '@/lib/utils';
import type { AnalyticsBootstrap } from '@/features/analytics/types';

function TinySparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = Math.max(max - min, 1);
  const coords = points
    .map((value, idx) => {
      const x = (idx / (points.length - 1)) * 100;
      const y = 100 - ((value - min) / span) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="h-5 w-10 shrink-0 sm:h-7 sm:w-14" preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="6" points={coords} className="text-muted" />
    </svg>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-[10px] text-muted">No prior</span>;
  const isUp = delta >= 0;
  return (
    <span className={`text-[10px] font-medium ${isUp ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
      {isUp ? '↑' : '↓'} {Math.abs(delta)}%
    </span>
  );
}

export default function AnalyticsKpiStrip({
  data,
  recentPace,
}: {
  data: AnalyticsBootstrap;
  recentPace?: number;
}) {
  const cards = [
    {
      title: 'Net Saved',
      value: data.kpis.netSaved.value,
      delta: data.kpis.netSaved.deltaPct,
      trend: data.kpis.netSaved.trend,
      sub: 'Selected range',
    },
    {
      title: 'Avg / Month',
      value: data.kpis.avgMonthlySaved.value,
      delta: data.kpis.avgMonthlySaved.deltaPct,
      trend: data.kpis.avgMonthlySaved.trend,
      sub: 'Monthly net',
    },
    {
      title: 'Bank Balance',
      value: data.kpis.bankBalance.value,
      delta: data.kpis.bankBalance.deltaPct,
      trend: data.kpis.bankBalance.trend,
      sub: 'Latest closing',
    },
    ...(typeof recentPace === 'number'
      ? [
          {
            title: 'Recent Pace',
            value: recentPace,
            delta: null as number | null,
            trend: data.kpis.netSaved.trend,
            sub: 'Last 6 months',
            suffix: '/mo',
            tone: recentPace < 0 ? 'danger' : 'success',
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className="min-w-0 rounded-xl border border-border/70 bg-card/80 p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-1.5">
            <p className="truncate text-[10px] uppercase tracking-[0.08em] text-muted">{card.title}</p>
            <TinySparkline points={card.trend.slice(-12)} />
          </div>
          <p
            className={cn(
              'mt-0.5 truncate text-sm font-semibold sm:mt-1 sm:text-lg',
              'tone' in card && card.tone === 'danger'
                ? 'text-[var(--danger)]'
                : 'tone' in card && card.tone === 'success'
                  ? 'text-[var(--success)]'
                  : 'text-foreground',
            )}
          >
            {formatRupees(card.value)}
            {'suffix' in card && card.suffix ? card.suffix : ''}
          </p>
          <div className="mt-0.5 flex items-center justify-between gap-1">
            <DeltaBadge delta={card.delta} />
            <p className="hidden truncate text-[10px] text-muted sm:block">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
