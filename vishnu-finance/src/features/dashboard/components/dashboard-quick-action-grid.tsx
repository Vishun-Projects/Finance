'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarPlus,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

interface QuickActionItem {
  icon: LucideIcon;
  label: string;
  href: string;
  tone?: 'emerald' | 'red' | 'blue' | 'neutral';
}

const ACTIONS: QuickActionItem[] = [
  { icon: TrendingUp, label: 'Add income', href: '/transactions?type=INCOME', tone: 'emerald' },
  { icon: TrendingDown, label: 'Add expense', href: '/transactions?type=EXPENSE', tone: 'red' },
  { icon: Target, label: 'Set goal', href: '/plans?tab=goals', tone: 'blue' },
  { icon: CalendarPlus, label: 'Deadline', href: '/plans?tab=deadlines', tone: 'neutral' },
];

const toneBg: Record<NonNullable<QuickActionItem['tone']>, string> = {
  emerald: 'bg-[var(--success)]/10 text-[var(--success)]',
  red: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  blue: 'bg-[var(--info)]/10 text-[var(--info)]',
  neutral: 'bg-surface text-foreground',
};

interface DashboardQuickActionGridProps {
  className?: string;
}

export function DashboardQuickActionGrid({ className }: DashboardQuickActionGridProps) {
  return (
    <section className={cn(className)}>
      <h2 className="mb-3 px-0.5 text-xs font-medium uppercase tracking-wider text-hint">Quick actions</h2>
      <div className="grid grid-cols-4 gap-3">
        {ACTIONS.map(({ icon: Icon, label, href, tone = 'neutral' }) => (
          <Link
            key={href}
            href={href}
            onClick={() => void hapticLight()}
            className="btn-touch flex flex-col items-center gap-2 text-center"
          >
            <span
              className={cn(
                'flex size-14 items-center justify-center rounded-full border border-border/60',
                toneBg[tone]
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="text-[10px] font-medium leading-tight text-muted-foreground">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
