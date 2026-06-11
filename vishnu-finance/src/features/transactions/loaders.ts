import type { Transaction } from '@/types';
import { TRANSACTION_PAGE_SIZE } from '@/features/transactions/constants';
import { parseLocalDateEnd, parseLocalDateStart } from '@/lib/date-range';
import { prisma } from '@/lib/db';

export interface TransactionPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TransactionTotals {
  income: number;
  expense: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: TransactionPagination;
  totals?: TransactionTotals | null;
}

export interface TransactionCategorySummary {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string;
}

interface LoadTransactionsParams {
  userId: string;
  startDate: string;
  endDate: string;
  includeDeleted?: boolean;
  type?: 'INCOME' | 'EXPENSE' | 'ALL';
  search?: string;
  page?: number;
  pageSize?: number;
}

function toJson<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function loadTransactionsBootstrap({
  userId,
  startDate,
  endDate,
  includeDeleted = false,
  type = 'ALL',
  search,
  page = 1,
  pageSize = TRANSACTION_PAGE_SIZE,
}: LoadTransactionsParams): Promise<TransactionsResponse> {
  const skip = (page - 1) * pageSize;
  const where: Record<string, unknown> = { userId };

  if (!includeDeleted) {
    where.isDeleted = false;
  }

  if (type !== 'ALL') {
    where.financialCategory = type;
  }

  const start = parseLocalDateStart(startDate);
  const end = parseLocalDateEnd(endDate);
  if (!Number.isNaN(start.getTime()) || !Number.isNaN(end.getTime())) {
    where.transactionDate = {
      ...(Number.isNaN(start.getTime()) ? {} : { gte: start }),
      ...(Number.isNaN(end.getTime()) ? {} : { lte: end }),
    };
  }

  if (search?.trim()) {
    const term = search.trim();
    where.AND = [
      {
        OR: [
          { description: { contains: term, mode: 'insensitive' } },
          { store: { contains: term, mode: 'insensitive' } },
          { personName: { contains: term, mode: 'insensitive' } },
          { upiId: { contains: term, mode: 'insensitive' } },
          { notes: { contains: term, mode: 'insensitive' } },
          { category: { name: { contains: term, mode: 'insensitive' } } },
        ],
      },
    ];
  }

  const [transactions, totalCount, totalsQuery] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: true,
        document: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            fileSize: true,
            visibility: true,
            sourceType: true,
            uploadedById: true,
            ownerId: true,
            bankCode: true,
            isDeleted: true,
            deletedAt: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.aggregate({
      where,
      _sum: { creditAmount: true, debitAmount: true },
    }),
  ]);

  return {
    transactions: toJson(transactions) as Transaction[],
    pagination: {
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize) || 0,
    },
    totals: {
      income: Number(totalsQuery._sum.creditAmount || 0),
      expense: Number(totalsQuery._sum.debitAmount || 0),
    },
  };
}

export async function loadTransactionCategories(userId: string): Promise<TransactionCategorySummary[]> {
  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId }, { isDefault: true }],
    },
    select: {
      id: true,
      name: true,
      type: true,
      color: true,
    },
    orderBy: { name: 'asc' },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type as TransactionCategorySummary['type'],
    color: c.color ?? undefined,
  }));
}
