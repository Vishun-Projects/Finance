'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Layers } from 'lucide-react';
import type { DisciplineSummary } from '@/lib/plans-discipline';
import { formatDisciplineCurrency } from '@/lib/plans-discipline';
import { cn, formatRupees } from '@/lib/utils';

interface DeadlineTeaser {
  title: string;
  dueDate: string;
  amount?: number | null;
}

interface DashboardInsightCarouselProps {
  disciplineSummary?: DisciplineSummary | null;
  upcomingDeadlines?: DeadlineTeaser[];
  className?: string;
}

export function DashboardInsightCarousel({
  disciplineSummary,
  upcomingDeadlines = [],
  className,
}: DashboardInsightCarouselProps) {
  const cards: { id: string; href: string; title: string; body: string; accent: string }[] = [];

  if (disciplineSummary) {
    cards.push({
      id: 'discipline',
      href: '/plans',
      title: 'Plan discipline',
      body:
        disciplineSummary.gap >= 0
          ? `${formatDisciplineCurrency(disciplineSummary.gap)} fundable after commitments`
          : `${formatDisciplineCurrency(Math.abs(disciplineSummary.gap))} short this month`,
      accent: disciplineSummary.status === 'overcommitted' ? 'border-[var(--danger)]/40' : 'border-border',
    });
  }

  if (upcomingDeadlines.length > 0) {
    const next = upcomingDeadlines[0];
    cards.push({
      id: 'deadline',
      href: '/plans?tab=deadlines',
      title: 'Due soon',
      body: `${next.title}${next.amount ? ` · ${formatRupees(next.amount)}` : ''}`,
      accent: 'border-[var(--info)]/40',
    });
  }

  cards.push({
    id: 'learn',
    href: '/education',
    title: 'Learn',
    body: 'Guides and market briefings for smarter money habits',
    accent: 'border-border',
  });

  if (cards.length === 0) return null;

  return (
    <section className={cn(className)}>
      <h2 className="mb-3 px-0.5 text-xs font-medium uppercase tracking-wider text-hint">For you</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className={cn(
              'flex min-w-[220px] max-w-[75vw] shrink-0 flex-col justify-between rounded-2xl border bg-card p-4 transition-colors active:bg-muted/30',
              card.accent
            )}
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{card.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground">
              Open
              <ArrowRight className="size-3" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
