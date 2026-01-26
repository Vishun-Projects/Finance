import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCanonicalName, getCanonicalNamesBatch } from '@/lib/entity-mapping-service';
import { rateLimitMiddleware, getRouteType } from '@/lib/rate-limit';
import { TransactionCategory } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every minute

/**
 * GET /api/transactions
 * Unified endpoint for fetching transactions with advanced filtering
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const routeType = getRouteType(request.nextUrl.pathname);
  const rateLimitResponse = rateLimitMiddleware(routeType, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token');

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from token
    const user = await AuthService.getUserFromToken(authToken.value);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized or account deactivated' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSizeParam = searchParams.get('pageSize');
    // Allow larger page sizes for "all time" queries, but cap at 5000 for safety
    const pageSize = pageSizeParam === 'all' ? 5000 : Math.min(parseInt(pageSizeParam || '50'), 5000);
    const skip = (page - 1) * pageSize;

    // Check if we need totals (for summary cards)
    const includeTotals = searchParams.get('includeTotals') === 'true';

    // Filters
    // Accept both 'type' (from URL) and 'financialCategory' (from API calls) for compatibility
    const financialCategoryParamRaw = searchParams.get('type') || searchParams.get('financialCategory');
    const allowedCategories: TransactionCategory[] = ['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'OTHER'];
    const normalizedCategory = financialCategoryParamRaw?.toUpperCase() ?? null;
    const financialCategory = normalizedCategory && allowedCategories.includes(normalizedCategory as TransactionCategory)
      ? (normalizedCategory as TransactionCategory)
      : null;
    const categoryId = searchParams.get('categoryId');
    const categoryName = searchParams.get('categoryName');
    const store = searchParams.get('store');
    const personName = searchParams.get('personName');
    const upiId = searchParams.get('upiId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minAmount = searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : null;
    const maxAmount = searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : null;
    const amountPreset = searchParams.get('amountPreset') as 'lt1k' | '1to10k' | '10to50k' | '50to100k' | 'gt100k' | null;
    const entityType = searchParams.get('entityType') as 'STORE' | 'PERSON' | null;
    const searchTerm = searchParams.get('search');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    // Sorting
    const sortField = searchParams.get('sortField') || 'transactionDate';
    const sortDirectionParam = searchParams.get('sortDirection');
    const sortDirection: 'asc' | 'desc' = sortDirectionParam === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where: any = {
      userId: user.id,
    };

    // Deleted filter
    if (!includeDeleted) {
      where.isDeleted = false;
    }

    // Financial category filter
    if (financialCategory) {
      where.financialCategory = financialCategory;
    }

    // Category filter (handle "uncategorized" special case)
    if (categoryId) {
      if (categoryId === 'uncategorized') {
        where.categoryId = null;
      } else {
        where.categoryId = categoryId;
      }
    }

    // Date range filter
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      const isValidStart = start && !isNaN(start.getTime());
      const isValidEnd = end && !isNaN(end.getTime());

      if (isValidStart || isValidEnd) {
        where.transactionDate = {};
        if (isValidStart) where.transactionDate.gte = start;
        if (isValidEnd) {
          end!.setHours(23, 59, 59, 999);
          where.transactionDate.lte = end;
        }
      }
    }

    // Store/Person filters
    if (store) {
      where.store = store;
    }
    if (personName) {
      where.personName = personName;
    }
    if (upiId) {
      where.upiId = upiId;
    }

    // Entity type filter
    if (entityType === 'STORE') {
      where.store = { not: null };
      where.personName = null;
    } else if (entityType === 'PERSON') {
      where.personName = { not: null };
      where.store = null;
    }

    // Amount filters (will be applied in-memory after fetching for amount presets)
    if ((minAmount !== null || maxAmount !== null) && !amountPreset) {
      const amountConditions = [];
      if (minAmount !== null) amountConditions.push({ creditAmount: { gte: minAmount } }, { debitAmount: { gte: minAmount } });
      if (maxAmount !== null) amountConditions.push({ creditAmount: { lte: maxAmount } }, { debitAmount: { lte: maxAmount } });

      if (amountConditions.length > 0) {
        where.OR = amountConditions;
      }
    }

    // Search term filter (now applied at DB level for full pagination support)
    const hasSearchTerm = searchTerm && searchTerm.trim().length > 0;
    if (hasSearchTerm) {
      const searchOR = [
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { store: { contains: searchTerm, mode: 'insensitive' } },
        { personName: { contains: searchTerm, mode: 'insensitive' } },
        { upiId: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } },
        { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ];

      if (where.OR) {
        // Combine existing amount filters with search filters
        const existingOR = where.OR;
        delete where.OR;
        where.AND = [
          { OR: existingOR },
          { OR: searchOR }
        ];
      } else {
        where.OR = searchOR;
      }
    }

    // Build orderBy
    const validSortFields: Record<string, string> = {
      date: 'transactionDate',
      transactionDate: 'transactionDate',
      amount: 'creditAmount', // Will sort by creditAmount (or debitAmount in memory if needed)
      description: 'description',
      category: 'category',
    };

    const dbSortField = validSortFields[sortField] || 'transactionDate';
    const orderBy: Record<string, 'asc' | 'desc'> = { [dbSortField]: sortDirection };

    // Fetch transactions
    let transactions: any[] = [];
    let totalCount = 0;
    let totals: { income: number; expense: number } | null = null;

    try {
      // Fetch with category relation
      transactions = await (prisma as any).transaction.findMany({
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
      });

      // Get total count
      totalCount = await (prisma as any).transaction.count({ where });

      // Calculate totals if requested (for summary cards)
      if (includeTotals) {
        const totalsQuery = await (prisma as any).transaction.aggregate({
          where,
          _sum: {
            creditAmount: true,
            debitAmount: true,
          },
        });
        totals = {
          income: Number(totalsQuery._sum.creditAmount || 0),
          expense: Number(totalsQuery._sum.debitAmount || 0),
        };
      }

    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({
        transactions: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: pageSize,
          totalPages: 0,
        },
        message: 'Transaction table not available. Please run Prisma migration first.'
      });
    }

    // Apply in-memory filters (amount presets, search term, category name)
    let filteredTransactions = transactions;

    // Amount preset filter
    if (amountPreset) {
      filteredTransactions = filteredTransactions.filter((t: any) => {
        const amount = Number(t.creditAmount) || Number(t.debitAmount);
        switch (amountPreset) {
          case 'lt1k':
            return amount < 1000;
          case '1to10k':
            return amount >= 1000 && amount < 10000;
          case '10to50k':
            return amount >= 10000 && amount < 50000;
          case '50to100k':
            return amount >= 50000 && amount < 100000;
          case 'gt100k':
            return amount >= 100000;
          default:
            return true;
        }
      });
    }

    // Category name filter
    if (categoryName) {
      filteredTransactions = filteredTransactions.filter((t: any) =>
        t.category?.name === categoryName
      );
    }

    // Note: Search term is now handled at DB level

    // Apply entity mappings (batch processing for performance)
    if (filteredTransactions.length > 0) {
      try {
        const personNames = new Set<string>();
        const storeNames = new Set<string>();

        filteredTransactions.forEach((t: any) => {
          if (t.personName) personNames.add(t.personName);
          if (t.store) storeNames.add(t.store);
        });

        const [personMappings, storeMappings] = await Promise.all<Record<string, string>>([
          personNames.size > 0
            ? getCanonicalNamesBatch(user.id, Array.from(personNames), ['PERSON'])
            : Promise.resolve<Record<string, string>>({}),
          storeNames.size > 0
            ? getCanonicalNamesBatch(user.id, Array.from(storeNames), ['STORE'])
            : Promise.resolve<Record<string, string>>({})
        ]);

        filteredTransactions = filteredTransactions.map((t: any) => ({
          ...t,
          personName: t.personName && personMappings[t.personName] ? personMappings[t.personName] : t.personName,
          store: t.store && storeMappings[t.store] ? storeMappings[t.store] : t.store,
        }));
      } catch (mappingError) {
        console.warn('⚠️ Entity mapping failed, continuing without mapping:', mappingError);
      }
    }

    // Transform to API response format
    const transformedTransactions = filteredTransactions.map((t: any) => ({
      id: t.id,
      userId: t.userId,
      transactionDate: t.transactionDate,
      description: t.description,
      creditAmount: Number(t.creditAmount),
      debitAmount: Number(t.debitAmount),
      financialCategory: t.financialCategory,
      categoryId: t.categoryId,
      category: t.category ? {
        id: t.category.id,
        name: t.category.name,
        type: t.category.type,
        color: t.category.color,
        icon: t.category.icon,
      } : null,
      accountStatementId: t.accountStatementId,
      bankCode: t.bankCode,
      transactionId: t.transactionId,
      accountNumber: t.accountNumber,
      transferType: t.transferType,
      personName: t.personName,
      upiId: t.upiId,
      branch: t.branch,
      store: t.store,
      rawData: t.rawData,
      balance: t.balance ? Number(t.balance) : null,
      notes: t.notes,
      receiptUrl: t.receiptUrl,
      isDeleted: t.isDeleted,
      deletedAt: t.deletedAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      document: t.document
        ? {
          id: t.document.id,
          originalName: t.document.originalName,
          isDeleted: t.document.isDeleted,
          deletedAt: t.document.deletedAt,
          mimeType: t.document.mimeType,
          fileSize: t.document.fileSize,
          visibility: t.document.visibility,
          sourceType: t.document.sourceType,
          bankCode: t.document.bankCode,
        }
        : null,
    }));

    const response: any = {
      transactions: transformedTransactions,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };

    // Include totals if requested and calculated
    if (includeTotals && totals !== null) {
      response.totals = totals;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in transactions GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions
 * Create a new transaction
 */
export async function POST(request: NextRequest) {
  const routeType = getRouteType(request.nextUrl.pathname);
  const rateLimitResponse = rateLimitMiddleware(routeType, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const authToken = request.cookies.get('auth-token');

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized or account deactivated' }, { status: 401 });
    }

    const body = await request.json();
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

    // Validation
    if (!description || (!creditAmount && !debitAmount)) {
      return NextResponse.json({ error: 'Description and amount are required' }, { status: 400 });
    }

    // Apply entity mappings
    let finalStore = store;
    let finalPersonName = personName;

    try {
      if (store) {
        finalStore = await getCanonicalName(user.id, store, 'STORE');
      }
      if (personName) {
        finalPersonName = await getCanonicalName(user.id, personName, 'PERSON');
      }
    } catch (mappingError) {
      console.warn('⚠️ Entity mapping failed, using original values:', mappingError);
    }

    // Create transaction
    const transaction = await (prisma as any).transaction.create({
      data: {
        userId: user.id,
        description,
        transactionDate: new Date(transactionDate || Date.now()),
        creditAmount: parseFloat(String(creditAmount)) || 0,
        debitAmount: parseFloat(String(debitAmount)) || 0,
        financialCategory: financialCategory.toUpperCase(),
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
        isDeleted: false,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      ...transaction,
      creditAmount: Number(transaction.creditAmount),
      debitAmount: Number(transaction.debitAmount),
      balance: transaction.balance ? Number(transaction.balance) : null,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in transactions POST:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
