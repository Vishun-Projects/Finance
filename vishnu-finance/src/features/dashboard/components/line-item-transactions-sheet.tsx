'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Link2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';
import { PLAN_CATEGORY_PICKER_GROUPS } from '@/features/dashboard/config/plan-expense-categories';
import {
  formatGroupDateRange,
  groupLineItemTransactions,
  type MergedLineItemGroup,
} from '@/features/dashboard/utils/group-line-item-transactions';
import type { LineItemTransaction } from '@/lib/plan-adherence-service';
import { formatRupees } from '@/lib/utils';

interface LineItemTransactionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItemLabel: string | null;
  planned: number;
  actual: number;
  onUpdated?: () => void;
}

async function fetchLineItemTransactions(label: string): Promise<LineItemTransaction[]> {
  const res = await fetch(`/api/plan-adherence/line-item-transactions?label=${encodeURIComponent(label)}`);
  if (!res.ok) throw new Error('Failed to load transactions');
  const data = await res.json();
  return data.transactions ?? [];
}

export function LineItemTransactionsSheet({
  open,
  onOpenChange,
  lineItemLabel,
  planned,
  actual,
  onUpdated,
}: LineItemTransactionsSheetProps) {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<LineItemTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [merchantAlias, setMerchantAlias] = useState('');
  const [mappingSaving, setMappingSaving] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!lineItemLabel) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchLineItemTransactions(lineItemLabel);
      setTransactions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [lineItemLabel]);

  useEffect(() => {
    if (!open || !lineItemLabel) return;
    void loadTransactions();
  }, [open, lineItemLabel, loadTransactions]);

  const groups = useMemo(() => groupLineItemTransactions(transactions), [transactions]);

  const saveCategory = async (group: MergedLineItemGroup, categoryName: string) => {
    if (!categoryName || categoryName === group.categoryName) return;

    setSavingKey(group.key);
    setError(null);
    try {
      const res = await fetch('/api/plan-adherence/recategorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: group.transactionIds,
          categoryName,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update category');
      }

      await loadTransactions();
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={lineItemLabel}
      description={`${formatRupees(actual)} spent / ${formatRupees(planned)} planned this month`}
      desktopSide="right"
      contentClassName="flex flex-col sm:max-w-md"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading transactions…
          </div>
        ) : error && groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--danger)]">{error}</p>
        ) : groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions mapped to this line item this month.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {groups.map((group) => {
              const isSaving = savingKey === group.key;
              const dateLabel = formatGroupDateRange(group.dates);

              return (
                <li key={group.key} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{group.displayName}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Select
                          value={group.categoryName}
                          disabled={isSaving}
                          onValueChange={(value) => void saveCategory(group, value)}
                        >
                          <SelectTrigger className="h-8 max-w-[220px] text-xs">
                            {isSaving ? (
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Loader2 className="size-3 animate-spin" />
                                Saving…
                              </span>
                            ) : (
                              <SelectValue placeholder="Category" />
                            )}
                          </SelectTrigger>
                          <SelectContent className="max-h-[280px]">
                            {PLAN_CATEGORY_PICKER_GROUPS.map((section) => (
                              <SelectGroup key={section.label}>
                                <SelectLabel>{section.label}</SelectLabel>
                                {section.options.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                            {!PLAN_CATEGORY_PICKER_GROUPS.some((g) =>
                              g.options.some((o) => o.value === group.categoryName),
                            ) && (
                              <SelectGroup>
                                <SelectLabel>Current</SelectLabel>
                                <SelectItem value={group.categoryName} className="text-xs">
                                  {group.categoryName}
                                </SelectItem>
                              </SelectGroup>
                            )}
                          </SelectContent>
                        </Select>
                        {group.count > 1 && (
                          <Badge variant="outline" className="px-1 py-0 text-[9px] font-normal">
                            {group.count} payments
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{dateLabel}</p>
                      {group.transactions.some((tx) => tx.settlementId) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {group.transactions
                            .filter((tx) => tx.settlementId)
                            .map((tx) => (
                              <Badge key={tx.id} variant="outline" className="px-1 py-0 text-[9px] font-normal">
                                Linked · net {formatRupees(tx.amount)}
                                {tx.grossAmount !== tx.amount ? ` (gross ${formatRupees(tx.grossAmount)})` : ''}
                              </Badge>
                            ))}
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" asChild>
                            <Link href={`/transactions?link=${group.transactionIds[0]}`}>
                              <Link2 className="mr-1 size-3" />
                              Manage link
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-[var(--danger)]">
                      {formatRupees(group.totalAmount)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {error && groups.length > 0 && (
          <p className="mt-2 text-center text-xs text-[var(--danger)]">{error}</p>
        )}
      </div>

      {lineItemLabel && (
        <div className="mt-4 space-y-2 rounded-md border border-border bg-surface/40 p-3">
          <p className="text-xs font-medium text-foreground">Merchant rule</p>
          <p className="text-[10px] text-muted">
            Normalize payee names for transactions in {lineItemLabel}.
          </p>
          <div className="flex gap-2">
            <Input
              value={merchantAlias}
              onChange={(e) => setMerchantAlias(e.target.value)}
              placeholder="e.g. Swiggy"
              className="h-8 text-xs"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0"
              disabled={!merchantAlias.trim() || mappingSaving || transactions.length === 0}
              onClick={async () => {
                setMappingSaving(true);
                try {
                  const res = await fetch('/api/plan-adherence/rename-entity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      transactionIds: transactions.map((tx) => tx.id),
                      newName: merchantAlias.trim(),
                    }),
                  });
                  if (!res.ok) throw new Error('Failed to save mapping');
                  await loadTransactions();
                  onUpdated?.();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to save mapping');
                } finally {
                  setMappingSaving(false);
                }
              }}
            >
              {mappingSaving ? <Loader2 className="size-3.5 animate-spin" /> : 'Apply'}
            </Button>
          </div>
        </div>
      )}

      {lineItemLabel && (
        <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
          <Link href={`/transactions?lineItem=${encodeURIComponent(lineItemLabel)}`}>
            Open in transactions
          </Link>
        </Button>
      )}
    </ResponsiveSheet>
  );
}
