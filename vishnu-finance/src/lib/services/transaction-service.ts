import { clearUserCache } from '@/lib/api-cache';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { parseLocalDateStart, parseLocalDateEnd } from '@/lib/date-range';
import { getCanonicalName } from '@/lib/entity-mapping-service';
import { categorizeTransactionsBatch } from '@/lib/gemini';
import { categorizeTransactions, type TransactionToCategorize } from '@/lib/transaction-categorization-service';

export class TransactionServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public extras?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'TransactionServiceError';
  }
}

async function afterTransactionMutation(userId: string) {
  await clearUserCache(userId);
  invalidateUserAppData(userId);
}

const ALLOWED_CATEGORIES = ['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'OTHER'] as const;

const PATTERN_RULES: Array<[string[], string]> = [
  [['min bal chg', 'minimum balance', 'service charge', 'atm amc', 'uncoll chrg', 'sms chg', 'annual fee', 'maintenance charge', 'eft charge'], 'other expenses'],
  [['atm wdl', 'tran date', 'atm id', 'cash withdrawal', 'self-', '/self'], 'other expenses'],
  [['credit interest', 'interest credit', 'neft/hdfc', 'word publish'], 'other income'],
  [['salary', 'credited'], 'salary'],
  [['milk', 'dud', 'dudh', 'aata', 'atta', 'grocery', 'kirana', 'vegetables', 'sabzi', 'fruits', 'eggs', 'anda', 'rice', 'dal', 'sugar', 'tel', 'oil', 'ghee', 'paneer', 'dahi', 'curd', 'aloo', 'pyaz', 'tamatar', 'soyabean', 'mother dairy', 'amul', 'country delight', 'bigbasket', 'blinkit'], 'food'],
  [['paan', 'panipuri', 'chai', 'tea', 'samosa', 'snacks', 'vada', 'poha', 'nashta', 'breakfast', 'lunch', 'dinner', 'hotel', 'dhaba', 'restaurant', 'biryani', 'thali', 'meals', 'frooti', 'cold drink', 'juice', 'dhaniya', 'bhindi', 'momo', 'burger', 'roll', 'shawarma', 'pav bhaji'], 'food & dining'],
  [['swiggy', 'zomato', 'dominos', 'pizza', 'mcdonalds', 'kfc', 'burger king', 'starbucks', 'cafe', 'subway'], 'food & dining'],
  [['sweets', 'mithai', 'bakery', 'cake', 'pastry', 'dryfruit', 'dry fruit', 'chocolate', 'dairy milk'], 'food & dining'],
  [['medical', 'medico', 'pharmacy', 'medicine', 'chemist', 'hospital', 'clinic', 'doctor', 'apollo', 'medplus', '1mg', 'pharmeasy', 'netmeds', 'diagnostic', 'lab', 'cipladine', 'tablet', 'dawai'], 'healthcare'],
  [['recharge', 'gpayrecharge', 'vodaf', 'airtel', 'jio', 'bsnl', 'electricity', 'bijli', 'gas', 'lpg', 'water bill', 'broadband', 'wifi', 'internet', 'dth', 'tata sky', 'dish tv'], 'utilities'],
  [['uber', 'ola', 'rapido', 'taxi', 'cab', 'metro', 'railway', 'indian railways', 'irctc', 'bus', 'petrol', 'diesel', 'fuel', 'cng', 'parking', 'toll'], 'transportation'],
  [['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'bigbasket', 'blinkit', 'zepto', 'instamart', 'jiomart', 'dmart', 'shopping', 'cloth', 'kapda', 'footwear', 'shoe'], 'shopping'],
  [['netflix', 'hotstar', 'spotify', 'prime video', 'youtube', 'bookmyshow', 'cinema', 'pvr', 'inox', 'movie', 'game'], 'entertainment'],
  [['subscription', 'monthly', 'renewal', 'autopay'], 'subscriptions'],
  [['gift', 'rakhi', 'shagun', 'mehendi', 'henna', 'birthday', 'anniversary', 'festival', 'donation', 'charity'], 'gifts & donations'],
  [['salon', 'parlour', 'haircut', 'beauty', 'wheel', 'dettol', 'soap', 'shampoo', 'gum', 'prints', 'stationery'], 'personal care'],
  [['zerodha', 'groww', 'upstox', 'mutual fund', 'sip', 'fixed deposit', 'demat', 'trading'], 'investment'],
  [['insurance', 'lic', 'policy', 'premium'], 'insurance'],
  [['school', 'college', 'tuition', 'coaching', 'course', 'training'], 'education'],
  [['rent', 'landlord', 'society', 'maintenance', 'flat', 'apartment'], 'housing'],
  [['emi', 'loan', 'bajaj finserv', 'repayment'], 'debt payment'],
  [['hotel', 'oyo', 'booking', 'airbnb', 'trip', 'vacation', 'holiday', 'flight', 'airline'], 'travel'],
  [['tax', 'gst', 'income tax', 'tds'], 'taxes'],
];

const CATEGORY_FALLBACKS: Record<string, string[]> = {
  'bank charges': ['bank fees', 'charges', 'fees', 'other'],
  cash: ['cash withdrawal', 'atm', 'other'],
  income: ['salary', 'earnings', 'other income', 'income'],
  groceries: ['grocery', 'food', 'food & dining', 'shopping'],
  'food & dining': ['food', 'dining', 'restaurants', 'eating out'],
  healthcare: ['medical', 'health', 'pharmacy'],
  utilities: ['bills', 'recharge', 'mobile'],
  transport: ['travel', 'transportation', 'commute'],
  shopping: ['personal', 'lifestyle'],
  entertainment: ['subscriptions', 'leisure'],
  gifts: ['gifts & donations', 'personal'],
  'personal care': ['lifestyle', 'personal', 'shopping'],
  investments: ['savings', 'finance'],
  insurance: ['finance', 'other'],
  education: ['learning', 'other'],
  housing: ['rent', 'home', 'other'],
  'emi & loans': ['emi', 'loans', 'finance'],
};

function transformTransaction(t: Record<string, unknown>) {
  return {
    ...t,
    creditAmount: Number(t.creditAmount),
    debitAmount: Number(t.debitAmount),
    balance: t.balance ? Number(t.balance) : null,
    category: t.category
      ? {
          id: (t.category as { id: string }).id,
          name: (t.category as { name: string }).name,
          type: (t.category as { type: string }).type,
          color: (t.category as { color: string | null }).color,
          icon: (t.category as { icon: string | null }).icon,
        }
      : null,
  };
}

function buildDateFilterSql(
  startDate: string | undefined,
  endDate: string | undefined,
  range: string | undefined,
  tablePrefix = '',
): typeof Prisma.empty {
  const col = tablePrefix ? `${tablePrefix}."transactionDate"` : '"transactionDate"';
  if (range === 'all' || (!startDate && !endDate)) {
    return Prisma.empty;
  }

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const isValidStart = start && !Number.isNaN(start.getTime());
  const isValidEnd = end && !Number.isNaN(end.getTime());

  if (isValidStart && isValidEnd) {
    end!.setHours(23, 59, 59, 999);
    return Prisma.sql`AND ${Prisma.raw(col)} >= ${start} AND ${Prisma.raw(col)} <= ${end}`;
  }
  if (isValidStart) {
    return Prisma.sql`AND ${Prisma.raw(col)} >= ${start}`;
  }
  if (isValidEnd) {
    end!.setHours(23, 59, 59, 999);
    return Prisma.sql`AND ${Prisma.raw(col)} <= ${end}`;
  }
  return Prisma.empty;
}

export async function listTransactions(userId: string, params: Record<string, unknown> = {}) {
  const {
    page = 1,
    pageSize: pageSizeParam = '50',
    includeTotals = false,
    includeCount = true,
    type: financialCategoryParamRaw,
    financialCategory: financialCategoryAlias,
    categoryId,
    startDate,
    endDate,
    search: searchTermRaw,
    searchTerm: searchTermAlias,
    includeDeleted = false,
    sortField = 'transactionDate',
    sortDirection = 'desc',
    amountPreset,
    minAmount,
    maxAmount,
    range,
  } = params;

  const searchTerm = (searchTermRaw ?? searchTermAlias) as string | undefined;
  const financialCategoryInput = (financialCategoryParamRaw ?? financialCategoryAlias) as string | undefined;

  const cacheKey = `transactions_list:${userId}:${JSON.stringify(params)}`;
  const { globalCache } = await import('@/lib/cache-singleton');
  const cachedResponse = globalCache.get(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  const pageSize =
    pageSizeParam === 'all'
      ? 100
      : Math.min(parseInt(String(pageSizeParam || '50'), 10), 100);
  const skip = (Number(page) - 1) * pageSize;
  const shouldCount = includeCount !== false && Number(page) === 1;
  const normalizedCategory = financialCategoryInput?.toUpperCase() ?? null;
  const financialCategory =
    normalizedCategory && ALLOWED_CATEGORIES.includes(normalizedCategory as (typeof ALLOWED_CATEGORIES)[number])
      ? normalizedCategory
      : null;

  const where: Record<string, unknown> = { userId };
  if (!includeDeleted) where.isDeleted = false;
  if (financialCategory) where.financialCategory = financialCategory;
  if (categoryId) {
    where.categoryId = categoryId === 'uncategorized' ? null : categoryId;
  }

  if (range !== 'all' && (startDate || endDate)) {
    const start = startDate ? parseLocalDateStart(String(startDate)) : null;
    const end = endDate ? parseLocalDateEnd(String(endDate)) : null;
    const isValidStart = start && !isNaN(start.getTime());
    const isValidEnd = end && !isNaN(end.getTime());

    if (isValidStart || isValidEnd) {
      where.transactionDate = {};
      if (isValidStart) (where.transactionDate as Record<string, Date>).gte = start;
      if (isValidEnd) (where.transactionDate as Record<string, Date>).lte = end;
    }
  }

  const validSortFields: Record<string, string> = {
    date: 'transactionDate',
    transactionDate: 'transactionDate',
    amount: 'creditAmount',
    description: 'description',
    category: 'category',
  };
  const dbSortField = validSortFields[String(sortField)] || 'transactionDate';
  const orderBy: Record<string, 'asc' | 'desc'> = {
    [dbSortField]: sortDirection === 'asc' ? 'asc' : 'desc',
  };

  const hasSearchTerm = searchTerm && String(searchTerm).trim().length > 0;
  if (hasSearchTerm) {
    where.OR = [
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { store: { contains: searchTerm, mode: 'insensitive' } },
      { personName: { contains: searchTerm, mode: 'insensitive' } },
      { upiId: { contains: searchTerm, mode: 'insensitive' } },
      { notes: { contains: searchTerm, mode: 'insensitive' } },
      { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
    ];
  }

  let amountRange: { gte?: number; lt?: number; lte?: number } | null = null;
  if (amountPreset) {
    switch (amountPreset) {
      case 'lt1k':
        amountRange = { lt: 1000 };
        break;
      case '1to10k':
        amountRange = { gte: 1000, lt: 10000 };
        break;
      case '10to50k':
        amountRange = { gte: 10000, lt: 50000 };
        break;
      case '50to100k':
        amountRange = { gte: 50000, lt: 100000 };
        break;
      case 'gt100k':
        amountRange = { gte: 100000 };
        break;
    }
  }

  const combinedMin =
    minAmount !== null && minAmount !== undefined ? minAmount : (amountRange?.gte ?? null);
  const combinedMax =
    maxAmount !== null && maxAmount !== undefined
      ? maxAmount
      : (amountRange?.lt ?? amountRange?.lte ?? null);

  if (combinedMin !== null || combinedMax !== null) {
    const amountFilter: Record<string, number> = {};
    if (combinedMin !== null) amountFilter.gte = Number(combinedMin);
    if (combinedMax !== null) {
      if (amountRange?.lt !== undefined && combinedMax === amountRange.lt) {
        amountFilter.lt = Number(combinedMax);
      } else {
        amountFilter.lte = Number(combinedMax);
      }
    }

    const amountCondition = {
      OR: [{ creditAmount: amountFilter }, { debitAmount: amountFilter }],
    };

    if (where.OR) {
      const searchCondition = { OR: where.OR };
      delete where.OR;
      where.AND = [searchCondition, amountCondition];
    } else {
      where.AND = [amountCondition];
    }
  }

  const [transactionsData, totalCountData, totalsData] = await Promise.all([
    (prisma as any).transaction.findMany({
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
      orderBy,
      skip,
      take: pageSize,
    }),
    shouldCount ? (prisma as any).transaction.count({ where }) : Promise.resolve(null),
    includeTotals && shouldCount
      ? (async () => {
          const [incomeRes, expenseRes] = await Promise.all([
            (prisma as any).transaction.aggregate({
              where: { ...where, financialCategory: 'INCOME' },
              _sum: { creditAmount: true },
            }),
            (prisma as any).transaction.aggregate({
              where: { ...where, financialCategory: 'EXPENSE' },
              _sum: { debitAmount: true },
            }),
          ]);
          return {
            income: Number(incomeRes?._sum?.creditAmount || 0),
            expense: Number(expenseRes?._sum?.debitAmount || 0),
          };
        })()
      : Promise.resolve(null),
  ]);

  const transformed = (transactionsData as Record<string, unknown>[]).map(transformTransaction);

  const responseData = {
    transactions: transformed,
    pagination: {
      total: totalCountData ?? undefined,
      page: Number(page),
      pageSize,
      totalPages: totalCountData != null ? Math.ceil(totalCountData / pageSize) : undefined,
    },
    totals: totalsData,
  };

  globalCache.set(cacheKey, responseData, 30000);
  return responseData;
}

export async function getDailySpend(
  userId: string,
  params: { startDate?: string; endDate?: string; range?: string } = {},
) {
  const { startDate, endDate, range } = params;
  const dateFilter = buildDateFilterSql(startDate, endDate, range);

  const rows = await prisma.$queryRaw<Array<{ date: string; expense: number; income: number; count: number }>>`
    SELECT
      to_char("transactionDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
      COALESCE(SUM("debitAmount"), 0)::float AS expense,
      COALESCE(SUM("creditAmount"), 0)::float AS income,
      COUNT(*)::int AS count
    FROM "transactions"
    WHERE "userId" = ${userId}
      AND "isDeleted" = false
      ${dateFilter}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return {
    daily: rows.map((row) => ({
      date: row.date,
      expense: Number(row.expense) || 0,
      income: Number(row.income) || 0,
      count: Number(row.count) || 0,
    })),
  };
}

export async function getCategoryBreakdown(
  userId: string,
  params: { startDate?: string; endDate?: string; range?: string } = {},
) {
  const { startDate, endDate, range } = params;
  const dateFilter = buildDateFilterSql(startDate, endDate, range, 't');

  const rows = await prisma.$queryRaw<Array<{ name: string; expense: number; count: number }>>`
    SELECT
      COALESCE(c.name, 'Uncategorized') AS name,
      COALESCE(SUM(t."debitAmount"), 0)::float AS expense,
      COUNT(*)::int AS count
    FROM "transactions" t
    LEFT JOIN "categories" c ON t."categoryId" = c.id
    WHERE t."userId" = ${userId}
      AND t."isDeleted" = false
      AND t."financialCategory" = 'EXPENSE'
      AND t."debitAmount" > 0
      ${dateFilter}
    GROUP BY COALESCE(c.name, 'Uncategorized')
    ORDER BY expense DESC
    LIMIT 25
  `;

  return {
    categories: rows.map((row) => ({
      name: row.name,
      expense: Number(row.expense) || 0,
      count: Number(row.count) || 0,
    })),
  };
}

export async function createTransaction(userId: string, body: Record<string, unknown> = {}) {
  const {
    description,
    transactionDate,
    creditAmount = 0,
    debitAmount = 0,
    financialCategory = 'EXPENSE',
    categoryId,
    notes,
    store,
    personName,
    upiId,
    receiptUrl,
    bankCode,
    transactionId,
    accountNumber,
    transferType,
    branch,
    rawData,
    balance,
  } = body;

  if (!description || (!creditAmount && !debitAmount)) {
    throw new TransactionServiceError('Description and amount are required', 400);
  }

  let finalStore = store as string | undefined;
  let finalPersonName = personName as string | undefined;
  try {
    if (store) finalStore = await getCanonicalName(userId, String(store), 'STORE');
    if (personName) finalPersonName = await getCanonicalName(userId, String(personName), 'PERSON');
  } catch {
    /* keep originals */
  }

  const transaction = await (prisma as any).transaction.create({
    data: {
      userId,
      description,
      transactionDate: new Date(String(transactionDate || Date.now())),
      creditAmount: parseFloat(String(creditAmount)) || 0,
      debitAmount: parseFloat(String(debitAmount)) || 0,
      financialCategory: String(financialCategory).toUpperCase(),
      categoryId: categoryId || null,
      notes: notes || null,
      store: finalStore || null,
      personName: finalPersonName || null,
      upiId: upiId || null,
      receiptUrl: receiptUrl || null,
      bankCode: bankCode || null,
      transactionId: transactionId || null,
      accountNumber: accountNumber || null,
      transferType: transferType || null,
      branch: branch || null,
      rawData: rawData || null,
      balance: balance ? parseFloat(String(balance)) : null,
      autoCategorized: body.autoCategorized === true,
      isDeleted: false,
    },
    include: { category: true },
  });

  await afterTransactionMutation(userId);

  return {
    ...transaction,
    creditAmount: Number(transaction.creditAmount),
    debitAmount: Number(transaction.debitAmount),
    balance: transaction.balance ? Number(transaction.balance) : null,
  };
}

export async function updateTransaction(userId: string, body: Record<string, unknown> = {}) {
  const { id, ...updateData } = body;
  if (!id) throw new TransactionServiceError('Transaction id is required', 400);

  const existing = await (prisma as any).transaction.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new TransactionServiceError('Transaction not found', 404);

  let finalStore = updateData.store as string | undefined;
  let finalPersonName = updateData.personName as string | undefined;
  if (updateData.store || updateData.personName) {
    try {
      if (updateData.store && updateData.store !== existing.store) {
        finalStore = await getCanonicalName(userId, String(updateData.store), 'STORE');
      }
      if (updateData.personName && updateData.personName !== existing.personName) {
        finalPersonName = await getCanonicalName(userId, String(updateData.personName), 'PERSON');
      }
    } catch {
      /* keep originals */
    }
  }

  const data: Record<string, unknown> = {};
  if (updateData.description !== undefined) data.description = updateData.description;
  if (updateData.transactionDate !== undefined) data.transactionDate = new Date(String(updateData.transactionDate));
  if (updateData.creditAmount !== undefined) data.creditAmount = parseFloat(String(updateData.creditAmount)) || 0;
  if (updateData.debitAmount !== undefined) data.debitAmount = parseFloat(String(updateData.debitAmount)) || 0;
  if (updateData.financialCategory !== undefined) {
    data.financialCategory = String(updateData.financialCategory).toUpperCase();
  }
  if (updateData.categoryId !== undefined) data.categoryId = updateData.categoryId || null;
  if (updateData.notes !== undefined) data.notes = updateData.notes || null;
  if (updateData.store !== undefined) data.store = finalStore || null;
  if (updateData.personName !== undefined) data.personName = finalPersonName || null;
  if (updateData.upiId !== undefined) data.upiId = updateData.upiId || null;
  if (updateData.receiptUrl !== undefined) data.receiptUrl = updateData.receiptUrl || null;
  if (updateData.bankCode !== undefined) data.bankCode = updateData.bankCode || null;
  if (updateData.transactionId !== undefined) data.transactionId = updateData.transactionId || null;
  if (updateData.accountNumber !== undefined) data.accountNumber = updateData.accountNumber || null;
  if (updateData.transferType !== undefined) data.transferType = updateData.transferType || null;
  if (updateData.branch !== undefined) data.branch = updateData.branch || null;
  if (updateData.rawData !== undefined) data.rawData = updateData.rawData || null;
  if (updateData.balance !== undefined) {
    data.balance = updateData.balance ? parseFloat(String(updateData.balance)) : null;
  }
  if (updateData.autoCategorized !== undefined) data.autoCategorized = updateData.autoCategorized === true;

  const updated = await (prisma as any).transaction.update({
    where: { id },
    data,
    include: { category: true },
  });

  await afterTransactionMutation(userId);

  return {
    ...updated,
    creditAmount: Number(updated.creditAmount),
    debitAmount: Number(updated.debitAmount),
    balance: updated.balance ? Number(updated.balance) : null,
    category: updated.category
      ? {
          id: updated.category.id,
          name: updated.category.name,
          type: updated.category.type,
          color: updated.category.color,
          icon: updated.category.icon,
        }
      : null,
  };
}

export async function deleteTransaction(userId: string, params: { id?: string }) {
  const { id } = params;
  if (!id) throw new TransactionServiceError('Transaction id is required', 400);

  const existing = await (prisma as any).transaction.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new TransactionServiceError('Transaction not found', 404);

  const deleted = await (prisma as any).transaction.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  await afterTransactionMutation(userId);

  return {
    id: deleted.id,
    isDeleted: true,
    deletedAt: deleted.deletedAt,
  };
}

export async function deleteTransactionsBulk(
  userId: string,
  params: {
    transactionIds?: string[];
    filters?: {
      bankCode?: string;
      transactionType?: string;
      startDate?: string;
      endDate?: string;
    };
  } = {},
) {
  const { transactionIds, filters } = params;
  let deletedCount = 0;

  if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
    const result = await (prisma as any).transaction.updateMany({
      where: { id: { in: transactionIds }, userId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    deletedCount += result.count;
  }

  if (filters) {
    const where: Record<string, unknown> = { userId, isDeleted: false };
    if (filters.bankCode) where.bankCode = filters.bankCode;
    if (filters.transactionType === 'expense' || filters.transactionType === 'debit') {
      where.financialCategory = 'EXPENSE';
      where.debitAmount = { gt: 0 };
    } else if (filters.transactionType === 'income' || filters.transactionType === 'credit') {
      where.financialCategory = 'INCOME';
      where.creditAmount = { gt: 0 };
    }
    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) {
        (where.transactionDate as Record<string, Date>).gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (where.transactionDate as Record<string, Date>).lte = new Date(filters.endDate);
      }
    }
    const result = await (prisma as any).transaction.updateMany({
      where,
      data: { isDeleted: true, deletedAt: new Date() },
    });
    deletedCount += result.count;
  }

  await afterTransactionMutation(userId);

  return {
    success: true,
    deletedCount,
    message: `Successfully deleted ${deletedCount} transaction(s)`,
  };
}

export async function restoreTransactions(
  userId: string,
  params: {
    transactionIds?: string[];
    filters?: {
      bankCode?: string;
      transactionType?: string;
      startDate?: string;
      endDate?: string;
    };
  } = {},
) {
  const { transactionIds, filters } = params;
  let restoredCount = 0;

  if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
    const result = await (prisma as any).transaction.updateMany({
      where: { id: { in: transactionIds }, userId, isDeleted: true },
      data: { isDeleted: false, deletedAt: null },
    });
    restoredCount += result.count;
  }

  if (filters) {
    const where: Record<string, unknown> = { userId, isDeleted: true };
    if (filters.bankCode) where.bankCode = filters.bankCode;
    if (filters.transactionType === 'expense' || filters.transactionType === 'debit') {
      where.financialCategory = 'EXPENSE';
      where.debitAmount = { gt: 0 };
    } else if (filters.transactionType === 'income' || filters.transactionType === 'credit') {
      where.financialCategory = 'INCOME';
      where.creditAmount = { gt: 0 };
    }
    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) {
        (where.transactionDate as Record<string, Date>).gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (where.transactionDate as Record<string, Date>).lte = new Date(filters.endDate);
      }
    }
    const result = await (prisma as any).transaction.updateMany({
      where,
      data: { isDeleted: false, deletedAt: null },
    });
    restoredCount += result.count;
  }

  return {
    success: true,
    restoredCount,
    message: `Successfully restored ${restoredCount} transaction(s)`,
  };
}

export async function batchUpdateTransactions(
  userId: string,
  params: { updates?: Array<Record<string, unknown>> } = {},
) {
  const { updates } = params;
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new TransactionServiceError('updates array is required', 400);
  }

  const transactionIds = updates.map((u) => u.id as string);
  const existingTransactions = await (prisma as any).transaction.findMany({
    where: { id: { in: transactionIds }, userId, isDeleted: false },
    select: { id: true, store: true, personName: true },
  });

  const existingIds = new Set(existingTransactions.map((t: { id: string }) => t.id));
  const invalidIds = transactionIds.filter((id) => !existingIds.has(id));
  if (invalidIds.length > 0) {
    throw new TransactionServiceError(
      `Some transactions not found or don't belong to user`,
      404,
      { invalidIds },
    );
  }

  const existingMap = new Map<string, { store: string | null; personName: string | null }>(
    existingTransactions.map((t: { id: string; store: string | null; personName: string | null }) => [
      t.id,
      { store: t.store, personName: t.personName },
    ]),
  );

  const BATCH_SIZE = 50;
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (update) => {
      try {
        const updateData: Record<string, unknown> = {};
        if (update.categoryId !== undefined) updateData.categoryId = update.categoryId || null;
        if (update.financialCategory !== undefined) {
          updateData.financialCategory = String(update.financialCategory).toUpperCase();
        }
        if (update.description !== undefined) updateData.description = update.description;
        if (update.notes !== undefined) updateData.notes = update.notes || null;
        if (update.autoCategorized !== undefined) updateData.autoCategorized = update.autoCategorized === true;

        if (update.store !== undefined) {
          const existing = existingMap.get(update.id as string);
          if (update.store && update.store !== existing?.store) {
            try {
              updateData.store = await getCanonicalName(userId, String(update.store), 'STORE');
            } catch {
              updateData.store = update.store;
            }
          } else {
            updateData.store = update.store || null;
          }
        }

        if (update.personName !== undefined) {
          const existing = existingMap.get(update.id as string);
          if (update.personName && update.personName !== existing?.personName) {
            try {
              updateData.personName = await getCanonicalName(userId, String(update.personName), 'PERSON');
            } catch {
              updateData.personName = update.personName;
            }
          } else {
            updateData.personName = update.personName || null;
          }
        }

        await (prisma as any).transaction.update({
          where: { id: update.id },
          data: updateData,
        });

        return { id: update.id as string, success: true };
      } catch (error: unknown) {
        return {
          id: update.id as string,
          success: false,
          error: error instanceof Error ? error.message : 'Update failed',
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    results.push(
      ...batchResults.map((result) =>
        result.status === 'fulfilled'
          ? result.value
          : { id: 'unknown', success: false, error: 'Promise rejected' },
      ),
    );
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return {
    success: true,
    total: updates.length,
    succeeded: successCount,
    failed: failureCount,
    results,
  };
}

export async function autoCategorizeTransactions(userId: string) {
  const allCategories = await (prisma as any).category.findMany({
    where: { OR: [{ userId }, { isDefault: true }] },
  });

  const categoryByName = new Map<string, string>();
  allCategories.forEach((c: { name: string; id: string }) => {
    categoryByName.set(c.name.toLowerCase(), c.id);
  });

  const otherCategoryId = allCategories.find(
    (c: { name: string; id: string }) =>
      c.name.toLowerCase() === 'other' || c.name.toLowerCase() === 'miscellaneous',
  )?.id;

  const findCategoryByPattern = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    const cleanText = lowerText.replace(/[^a-z0-9]/g, '');

    for (const [keywords, categoryName] of PATTERN_RULES) {
      for (const keyword of keywords) {
        const cleanKeyword = keyword.replace(/[^a-z0-9]/g, '');
        if (cleanKeyword.length < 3) continue;

        if (cleanText.includes(cleanKeyword)) {
          for (const [catName, catId] of categoryByName.entries()) {
            if (catName === categoryName.toLowerCase()) {
              if (catId !== otherCategoryId) return catId;
            }
          }

          for (const [catName, catId] of categoryByName.entries()) {
            if (catName.includes(categoryName.toLowerCase()) || categoryName.toLowerCase().includes(catName)) {
              if (catId !== otherCategoryId) return catId;
            }
          }

          const fallbacks = CATEGORY_FALLBACKS[categoryName] || [];
          for (const fallback of fallbacks) {
            for (const [catName, catId] of categoryByName.entries()) {
              if (catName.includes(fallback) || fallback.includes(catName)) {
                if (catId !== otherCategoryId) return catId;
              }
            }
          }
        }
      }
    }
    return null;
  };

  const batchSize = 100;
  const transactions = await (prisma as any).transaction.findMany({
    where: { userId, categoryId: null, isDeleted: false },
    take: batchSize,
    select: {
      id: true,
      description: true,
      debitAmount: true,
      creditAmount: true,
      store: true,
      upiId: true,
      personName: true,
    },
  });

  const totalRemaining = await (prisma as any).transaction.count({
    where: { userId, categoryId: null, isDeleted: false },
  });

  if (transactions.length === 0) {
    const totalTx = await (prisma as any).transaction.count({
      where: { userId, isDeleted: false },
    });
    const categorizedTx = await (prisma as any).transaction.count({
      where: { userId, isDeleted: false, categoryId: { not: null } },
    });

    return {
      processed: 0,
      updated: 0,
      rulesMatched: 0,
      aiMatched: 0,
      remaining: 0,
      message: 'No uncategorized transactions found for this user',
      debug: {
        userId,
        userTransactions: totalTx,
        userCategorized: categorizedTx,
        userUncategorized: totalTx - categorizedTx,
        categories: Array.from(categoryByName.keys()).slice(0, 10),
      },
    };
  }

  const aiBatch: Array<Record<string, unknown>> = [];
  const updates: Array<{
    id: string;
    categoryId: string;
    notes?: string | null;
    method: 'HISTORY' | 'RULE' | 'AI';
  }> = [];

  const upiIds = transactions.map((t: { upiId?: string | null }) => t.upiId).filter(Boolean) as string[];
  const stores = transactions.map((t: { store?: string | null }) => t.store).filter(Boolean) as string[];
  const personNames = transactions
    .map((t: { personName?: string | null }) => t.personName)
    .filter(Boolean) as string[];

  const [upiHistory, storeHistory, personHistory] = await Promise.all([
    upiIds.length > 0
      ? (prisma as any).transaction.findMany({
          where: { userId, upiId: { in: upiIds }, categoryId: { not: null }, isDeleted: false },
          orderBy: { transactionDate: 'desc' },
          select: { upiId: true, categoryId: true, notes: true },
        })
      : [],
    stores.length > 0
      ? (prisma as any).transaction.findMany({
          where: { userId, store: { in: stores }, categoryId: { not: null }, isDeleted: false },
          orderBy: { transactionDate: 'desc' },
          select: { store: true, categoryId: true, notes: true },
        })
      : [],
    personNames.length > 0
      ? (prisma as any).transaction.findMany({
          where: { userId, personName: { in: personNames }, categoryId: { not: null }, isDeleted: false },
          orderBy: { transactionDate: 'desc' },
          select: { personName: true, categoryId: true, notes: true },
        })
      : [],
  ]);

  const upiMap = new Map<string, { categoryId: string; notes?: string | null }>();
  upiHistory.forEach((h: { upiId: string; categoryId: string; notes?: string | null }) => {
    if (!upiMap.has(h.upiId)) upiMap.set(h.upiId, h);
  });

  const storeMap = new Map<string, { categoryId: string; notes?: string | null }>();
  storeHistory.forEach((h: { store: string; categoryId: string; notes?: string | null }) => {
    if (!storeMap.has(h.store)) storeMap.set(h.store, h);
  });

  const personMap = new Map<string, { categoryId: string; notes?: string | null }>();
  personHistory.forEach((h: { personName: string; categoryId: string; notes?: string | null }) => {
    if (!personMap.has(h.personName)) personMap.set(h.personName, h);
  });

  for (const t of transactions) {
    let historicalMatch: { categoryId: string; notes?: string | null } | null = null;
    if (t.upiId) historicalMatch = upiMap.get(t.upiId) ?? null;
    if (!historicalMatch && t.store) historicalMatch = storeMap.get(t.store) ?? null;
    if (!historicalMatch && t.personName) historicalMatch = personMap.get(t.personName) ?? null;

    if (historicalMatch) {
      updates.push({
        id: t.id,
        categoryId: historicalMatch.categoryId,
        notes: historicalMatch.notes,
        method: 'HISTORY',
      });
      continue;
    }

    const fullText = `${t.description || ''} ${t.store || ''} ${t.personName || ''}`.toLowerCase();
    const matchedCategoryId = findCategoryByPattern(fullText);

    if (matchedCategoryId) {
      updates.push({ id: t.id, categoryId: matchedCategoryId, method: 'RULE' });
    } else {
      aiBatch.push(t);
    }
  }

  if (aiBatch.length > 0) {
    const aiProcessBatch = aiBatch.slice(0, 40);
    const categories = allCategories.filter(
      (c: { id: string; name: string }) =>
        c.id !== otherCategoryId && !c.name.toLowerCase().includes('miscellaneous'),
    );

    const mappedForAi = aiProcessBatch.map((t) => ({
      id: t.id as string,
      description: t.description as string,
      amount: Number(t.debitAmount || t.creditAmount),
      store: (t.store as string) || undefined,
    }));

    try {
      const aiResults = await categorizeTransactionsBatch(
        mappedForAi,
        categories.map((c: { id: string; name: string; type: string }) => ({
          id: c.id,
          name: c.name,
          type: c.type,
        })),
      );

      for (const res of aiResults) {
        if (res.categoryId && res.confidence > 0.5 && res.categoryId !== otherCategoryId) {
          updates.push({ id: res.id, categoryId: res.categoryId, method: 'AI' });
        }
      }
    } catch (e) {
      console.error('AI Batch failed (exception)', e);
    }
  }

  let updatedCount = 0;
  let rulesCount = 0;
  let aiCount = 0;

  await Promise.all(
    updates.map(async (u) => {
      try {
        await (prisma as any).transaction.update({
          where: { id: u.id },
          data: {
            category: u.categoryId ? { connect: { id: u.categoryId } } : undefined,
            notes: u.notes !== undefined ? u.notes : undefined,
          },
        });
        updatedCount++;
        if (u.method === 'HISTORY' || u.method === 'RULE') rulesCount++;
        else aiCount++;
      } catch {
        /* skip failed update */
      }
    }),
  );

  await afterTransactionMutation(userId);

  return {
    message: 'Categorization complete',
    processed: transactions.length,
    updated: updatedCount,
    rulesMatched: rulesCount,
    aiMatched: aiCount,
    remaining: Math.max(0, totalRemaining - transactions.length),
    unmatched: aiBatch.length - aiCount,
    debug: {
      categoriesAvailable: Array.from(categoryByName.keys()),
      patternsActive: PATTERN_RULES.length,
      sampleUnmatched: aiBatch.slice(0, 3).map((t) => ({
        id: String(t.id).substring(0, 10),
        desc: String(t.description || '').substring(0, 80),
        store: t.store,
      })),
    },
  };
}

export async function categorizeTransactionsForUser(
  userId: string,
  transactionsToCategorize: TransactionToCategorize[],
) {
  if (!Array.isArray(transactionsToCategorize) || transactionsToCategorize.length === 0) {
    throw new TransactionServiceError('transactions array is required', 400);
  }
  return categorizeTransactions(userId, transactionsToCategorize);
}

export async function getCategorizeBackgroundStatus(
  userId: string,
  transactionIds: string[],
) {
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    throw new TransactionServiceError('transactionIds array is required', 400);
  }
  return {
    progress: 0,
    categorized: 0,
    total: transactionIds.length,
    remaining: transactionIds.length,
  };
}

export const TransactionService = {
  listTransactions,
  getDailySpend,
  getCategoryBreakdown,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteTransactionsBulk,
  restoreTransactions,
  batchUpdateTransactions,
  autoCategorizeTransactions,
  categorizeTransactionsForUser,
  getCategorizeBackgroundStatus,
};
