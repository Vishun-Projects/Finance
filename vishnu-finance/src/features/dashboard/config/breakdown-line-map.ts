import { DATA } from '@/features/money-plan/data/money-plan';
import {
  assignLineItemForUnmapped,
  isNonPlanExpenseCategory,
  resolveTransactionLineItem,
} from '@/features/dashboard/config/plan-expense-categories';

export { getCategoryNamesForLineItem, isBufferLineItem } from '@/features/dashboard/config/plan-expense-categories';

export interface TransactionLineItemInput {
  categoryName: string | null | undefined;
  description?: string | null;
  store?: string | null;
  personName?: string | null;
  amount: number;
}

export function allocateTransactionsToLineItems(
  transactions: TransactionLineItemInput[],
): Map<string, number> {
  const actualByLineItem = new Map<string, number>();
  for (const item of DATA.breakdown) {
    actualByLineItem.set(item.label, 0);
  }

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (amount <= 0) continue;
    if (isNonPlanExpenseCategory(tx.categoryName ?? '')) continue;

    let lineItem =
      resolveTransactionLineItem(tx) ??
      assignLineItemForUnmapped(tx.categoryName ?? 'Uncategorized');

    if (!lineItem) continue;

    actualByLineItem.set(lineItem, (actualByLineItem.get(lineItem) || 0) + amount);
  }

  return actualByLineItem;
}

/** @deprecated Use allocateTransactionsToLineItems for accurate per-transaction mapping. */
export function allocateCategorySpendToLineItems(
  categoryRows: Array<{ name: string; expense: number }>,
): Map<string, number> {
  return allocateTransactionsToLineItems(
    categoryRows.map((row) => ({
      categoryName: row.name,
      amount: row.expense,
    })),
  );
}

export function transactionMatchesLineItem(
  tx: TransactionLineItemInput,
  lineItemLabel: string,
): boolean {
  const resolved =
    resolveTransactionLineItem(tx) ??
    assignLineItemForUnmapped(tx.categoryName ?? 'Uncategorized');
  return resolved === lineItemLabel;
}
