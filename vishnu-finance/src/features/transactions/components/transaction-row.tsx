'use client';

import React from 'react';
import { Check, Link2, ShoppingCart, Utensils, Zap, ShoppingBag } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';
import { getTransactionDisplayName, getTransactionAmount } from '@/lib/transaction-utils';
import { BrandLogo } from './transaction-brand-logo';

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const cat = category.toLowerCase();
  if (cat.includes('tech') || cat.includes('apple') || cat.includes('electronic'))
    return <ShoppingCart className={className} />;
  if (cat.includes('food') || cat.includes('dine') || cat.includes('sushi'))
    return <Utensils className={className} />;
  if (cat.includes('utility') || cat.includes('bill') || cat.includes('con edison'))
    return <Zap className={className} />;
  return <ShoppingBag className={className} />;
}

export const MobileTransactionCard = React.memo(function MobileTransactionCard({
  transaction,
  isIncome,
  isExpense,
  amount,
  isSelected,
  brandName,
  showSelectionMode,
  toggleSelect,
  formatAmount,
  onPress,
}: {
  transaction: {
    id: string;
    description?: string | null;
    store?: string | null;
    personName?: string | null;
    category?: { name?: string } | null;
  };
  isIncome: boolean;
  isExpense: boolean;
  amount: number;
  isSelected: boolean;
  brandName: string | undefined;
  showSelectionMode: boolean;
  toggleSelect: (id: string) => void;
  formatAmount: (val: number) => string;
  onPress: () => void;
}) {
  return (
    <div
      onClick={onPress}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 transition-all active:bg-muted/30 lg:hidden',
        isSelected && 'bg-primary/5 shadow-inner',
      )}
    >
      {showSelectionMode && (
        <div className="shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSelect(transaction.id);
            }}
            className={cn(
              'flex size-5 items-center justify-center rounded border transition-all',
              isSelected ? 'border-foreground bg-foreground text-background' : 'border-input bg-background',
            )}
          >
            {isSelected && <Check className="size-3" />}
          </button>
        </div>
      )}

      <div className="relative size-9 shrink-0">
        <div className="flex size-9 items-center justify-center overflow-hidden rounded-md border border-border/50 bg-card shadow-sm">
          {brandName ? (
            <BrandLogo name={brandName} size={36} />
          ) : (
            <div className="flex size-full items-center justify-center bg-muted/50">
              <CategoryIcon category={transaction.category?.name || ''} className="size-4" />
            </div>
          )}
        </div>
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-background',
            isIncome ? 'bg-[var(--success)]' : isExpense ? 'bg-[var(--danger)]' : 'bg-muted',
          )}
          aria-hidden
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="truncate text-sm font-medium text-foreground">
            {getTransactionDisplayName({
              description: transaction.description,
              store: transaction.store,
              personName: transaction.personName,
            })}
          </h4>
          <span
            className={cn(
              'shrink-0 text-sm font-semibold tabular-nums',
              isIncome ? 'text-[var(--success)]' : isExpense ? 'text-[var(--danger)]' : 'text-foreground',
            )}
          >
            {isIncome ? '+' : '-'}
            {formatAmount(amount)}
          </span>
        </div>
        <p className="truncate text-[10px] uppercase tracking-wide text-muted">
          {transaction.category?.name || 'General'}
        </p>
      </div>
    </div>
  );
});

export const TransactionRow = React.memo(function TransactionRow({
  transaction,
  isSelected,
  showSelectionMode,
  toggleSelect,
  formatAmount,
  onEdit,
  onLink,
}: {
  transaction: {
    id: string;
    description?: string | null;
    store?: string | null;
    personName?: string | null;
    upiId?: string | null;
    financialCategory?: string;
    creditAmount?: number | null;
    debitAmount?: number | null;
    category?: { name?: string } | null;
    rawData?: { brand?: { name?: string } };
  };
  isSelected: boolean;
  showSelectionMode: boolean;
  toggleSelect: (id: string) => void;
  formatAmount: (val: number) => string;
  onEdit: (t: typeof transaction) => void;
  onLink: (t: typeof transaction) => void;
}) {
  const isIncome = transaction.financialCategory === 'INCOME';
  const isExpense = transaction.financialCategory === 'EXPENSE';
  const amount = Number(getTransactionAmount(transaction as Parameters<typeof getTransactionAmount>[0])) || 0;
  const brand = transaction.rawData?.brand;
  const displayName = getTransactionDisplayName({
    description: transaction.description,
    store: transaction.store,
    personName: transaction.personName,
  });
  const brandName: string | undefined =
    brand?.name ||
    (displayName !== transaction.description ? displayName : undefined) ||
    transaction.store ||
    transaction.personName ||
    undefined;
  const subtitle =
    transaction.upiId || (displayName !== transaction.description ? transaction.description : null);

  return (
    <tr
      className={cn(
        'group cursor-pointer border-b border-border transition-colors',
        isSelected ? 'bg-surface' : 'hover:bg-surface/70',
      )}
      onClick={() => {
        if (showSelectionMode) toggleSelect(transaction.id);
        else onEdit(transaction);
      }}
    >
      {showSelectionMode && (
        <td className="w-8 border-r border-border/40 px-2 py-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSelect(transaction.id);
            }}
            className={cn(
              'flex size-3.5 items-center justify-center rounded border transition-all',
              isSelected ? 'border-foreground bg-foreground text-background' : 'border-border bg-background',
            )}
          >
            {isSelected && <Check className="size-2.5" />}
          </button>
        </td>
      )}
      <td className="max-w-0 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-surface">
            {brandName ? (
              <BrandLogo name={brandName} size={28} />
            ) : (
              <CategoryIcon category={transaction.category?.name || ''} className="size-3 text-muted" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground" title={displayName}>
              {displayName}
            </p>
            {subtitle ? (
              <p className="truncate text-[10px] text-hint" title={subtitle}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="w-28 max-w-28 px-3 py-1.5">
        <Chip variant={isIncome ? 'success' : 'neutral'} className="block max-w-full truncate px-1.5 py-0 text-[10px]">
          {transaction.category?.name || 'Uncategorized'}
        </Chip>
      </td>
      <td
        className={cn(
          'w-24 whitespace-nowrap px-3 py-1.5 text-right text-xs font-medium tabular-nums',
          isIncome ? 'text-[var(--success)]' : isExpense ? 'text-[var(--danger)]' : 'text-foreground',
        )}
      >
        {isIncome ? '+' : '-'}
        {formatAmount(amount)}
      </td>
      <td className="w-10 px-1 py-1.5">
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-hint opacity-0 transition-opacity hover:bg-surface hover:text-foreground group-hover:opacity-100"
          title="Link settlement"
          onClick={(event) => {
            event.stopPropagation();
            onLink(transaction);
          }}
        >
          <Link2 className="size-3.5" />
        </button>
      </td>
    </tr>
  );
});

export function resolveTransactionBrandName(transaction: {
  description?: string | null;
  store?: string | null;
  personName?: string | null;
  rawData?: { brand?: { name?: string } };
}): string | undefined {
  const brand = transaction.rawData?.brand;
  const displayName = getTransactionDisplayName({
    description: transaction.description,
    store: transaction.store,
    personName: transaction.personName,
  });
  return (
    brand?.name ||
    (displayName !== transaction.description ? displayName : undefined) ||
    transaction.store ||
    transaction.personName ||
    undefined
  );
}
