import { prisma } from '@/lib/db';

type HistoryRow = {
  categoryId: string | null;
  subcategoryId: string | null;
  notes: string | null;
  store: string | null;
  financialCategory: string;
  upiId: string | null;
  personName: string | null;
};

const historySelect = {
  categoryId: true,
  subcategoryId: true,
  notes: true,
  store: true,
  financialCategory: true,
  upiId: true,
  personName: true,
} as const;

/**
 * Batch-enrich parsed transactions from prior categorized history.
 * Uses at most 3 DB queries instead of one query per transaction.
 */
export async function enrichParsedTransactionsFromHistory<T extends Record<string, unknown>>(
  userId: string,
  transactions: T[],
): Promise<T[]> {
  if (!userId || transactions.length === 0) {
    return transactions;
  }

  const uniqueUpiIds = [...new Set(transactions.map((t) => t.upiId).filter(Boolean))] as string[];
  const uniqueStores = [...new Set(transactions.map((t) => t.store).filter(Boolean))] as string[];
  const uniquePersonNames = [...new Set(transactions.map((t) => t.personName).filter(Boolean))] as string[];

  if (uniqueUpiIds.length === 0 && uniqueStores.length === 0 && uniquePersonNames.length === 0) {
    return transactions;
  }

  const baseWhere = {
    userId,
    isDeleted: false,
    categoryId: { not: null },
  };

  const [upiHistory, storeHistory, personHistory] = await Promise.all([
    uniqueUpiIds.length > 0
      ? prisma.transaction.findMany({
          where: { ...baseWhere, upiId: { in: uniqueUpiIds } },
          orderBy: { transactionDate: 'desc' },
          select: historySelect,
        })
      : Promise.resolve([] as HistoryRow[]),
    uniqueStores.length > 0
      ? prisma.transaction.findMany({
          where: { ...baseWhere, store: { in: uniqueStores } },
          orderBy: { transactionDate: 'desc' },
          select: historySelect,
        })
      : Promise.resolve([] as HistoryRow[]),
    uniquePersonNames.length > 0
      ? prisma.transaction.findMany({
          where: { ...baseWhere, personName: { in: uniquePersonNames } },
          orderBy: { transactionDate: 'desc' },
          select: historySelect,
        })
      : Promise.resolve([] as HistoryRow[]),
  ]);

  const byUpi = new Map<string, HistoryRow>();
  const byStore = new Map<string, HistoryRow>();
  const byPerson = new Map<string, HistoryRow>();

  for (const row of upiHistory) {
    if (row.upiId && !byUpi.has(row.upiId)) {
      byUpi.set(row.upiId, row);
    }
  }
  for (const row of storeHistory) {
    if (row.store && !byStore.has(row.store)) {
      byStore.set(row.store, row);
    }
  }
  for (const row of personHistory) {
    if (row.personName && !byPerson.has(row.personName)) {
      byPerson.set(row.personName, row);
    }
  }

  return transactions.map((txn) => {
    const upiId = txn.upiId as string | undefined;
    const store = txn.store as string | undefined;
    const personName = txn.personName as string | undefined;

    let history: HistoryRow | undefined;
    if (upiId) history = byUpi.get(upiId);
    if (!history && store) history = byStore.get(store);
    if (!history && personName) history = byPerson.get(personName);

    if (!history) {
      return txn;
    }

    return {
      ...txn,
      categoryId: history.categoryId,
      subcategoryId: history.subcategoryId,
      autoCategorized: true,
    };
  });
}
