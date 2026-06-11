'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, ReceiptText } from 'lucide-react';
import { MobileGroupedList } from '@/components/ui/mobile-grouped-list';
import { Chip } from '@/components/ui/chip';
import { getTransactionDisplayName } from '@/lib/transaction-utils';
import { cn, formatRupees } from '@/lib/utils';

interface RecentTransaction {
  id: string;
  title: string;
  description?: string | null;
  store?: string | null;
  personName?: string | null;
  date: string;
  amount: number;
  category: string;
}

interface DashboardRecentActivityProps {
  transactions: RecentTransaction[];
  className?: string;
}

export function DashboardRecentActivity({ transactions, className }: DashboardRecentActivityProps) {
  if (transactions.length === 0) {
    return (
      <section className={cn('card-base p-3', className)}>
        <h2 className="text-sm font-medium text-foreground">Recent activity</h2>
        <p className="mt-2 text-xs text-muted">No transactions this month.</p>
        <Link
          href="/transactions"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground"
        >
          Add a transaction
          <ArrowRight className="size-3" />
        </Link>
      </section>
    );
  }

  return (
    <section className={cn(className)}>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="text-sm font-medium text-foreground">Recent activity</h2>
        <Link href="/transactions" className="text-xs font-medium text-muted hover:text-foreground">
          View all
        </Link>
      </div>
      <MobileGroupedList
        className="!space-y-0 lg:hidden"
        sections={[
          {
            items: transactions.map((tx) => {
              const isIncome = tx.amount > 0;
              const displayName =
                getTransactionDisplayName({
                  description: tx.description ?? undefined,
                  store: tx.store,
                  personName: tx.personName,
                }) || tx.title;
              return {
                id: tx.id,
                label: displayName,
                description: `${format(new Date(tx.date), 'd MMM')} · ${tx.category}`,
                href: '/transactions',
                icon: <ReceiptText className="size-4 text-muted" />,
                trailing: (
                  <span
                    className={cn(
                      'text-xs font-medium tabular-nums',
                      isIncome ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    )}
                  >
                    {isIncome ? '+' : ''}
                    {formatRupees(Math.abs(tx.amount))}
                  </span>
                ),
              };
            }),
          },
        ]}
      />
    </section>
  );
}
