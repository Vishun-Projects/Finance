import type { LineItemTransaction } from '@/lib/plan-adherence-service';
import { getTransactionDisplayName } from '@/lib/transaction-utils';

export interface MergedLineItemGroup {
  key: string;
  displayName: string;
  categoryName: string;
  transactionIds: string[];
  transactions: LineItemTransaction[];
  totalAmount: number;
  count: number;
  dates: string[];
}

function normalizeDisplayKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function groupLineItemTransactions(transactions: LineItemTransaction[]): MergedLineItemGroup[] {
  const groups = new Map<string, MergedLineItemGroup>();

  for (const tx of transactions) {
    const displayName =
      getTransactionDisplayName({
        description: tx.description,
        store: tx.store,
        personName: tx.personName,
      }) || tx.description;

    const key = normalizeDisplayKey(displayName);
    const categoryName = tx.categoryName ?? 'Uncategorized';

    const existing = groups.get(key);
    if (existing) {
      existing.transactionIds.push(tx.id);
      existing.transactions.push(tx);
      existing.totalAmount += tx.amount;
      existing.count += 1;
      existing.dates.push(tx.date);
    } else {
      groups.set(key, {
        key,
        displayName,
        categoryName,
        transactionIds: [tx.id],
        transactions: [tx],
        totalAmount: tx.amount,
        count: 1,
        dates: [tx.date],
      });
    }
  }

  return [...groups.values()].sort((a, b) => b.totalAmount - a.totalAmount);
}

export function formatGroupDateRange(dates: string[]): string {
  if (dates.length === 0) return '';
  const sorted = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const first = new Date(sorted[0]);
  const last = new Date(sorted[sorted.length - 1]);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  if (sorted.length === 1 || fmt(first) === fmt(last)) {
    return fmt(last);
  }
  return `${fmt(first)} – ${fmt(last)}`;
}
