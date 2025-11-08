import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Get auth token from cookies
    const authToken = req.cookies.get('auth-token');
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from token
    const user = await AuthService.getUserFromToken(authToken.value);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized or account deactivated' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const bankCode = searchParams.get('bankCode');
    const transactionType = searchParams.get('type'); // Legacy: 'expense' or 'income' - maps to financialCategory
    const financialCategory = searchParams.get('financialCategory'); // New: INCOME, EXPENSE, TRANSFER, etc.
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const rawLimit = (searchParams.get('limit') || '').toLowerCase();
    // Allowed: 100, 200, 500, 1000, 'all' (default 200)
    const allowed = new Set(['100', '200', '500', '1000', 'all']);
    const normalizedLimit = allowed.has(rawLimit) ? rawLimit : '200';
    let limit = normalizedLimit === 'all' ? 0 : parseInt(normalizedLimit);
    let skip = (page - 1) * (limit || 0);

    // Build where clause for Transaction model
    const where: any = {
      userId: user.id,
    };

    // Filter by deleted status
    if (!includeDeleted) {
      where.isDeleted = false;
    }

    // Filter by bank
    if (bankCode) {
      where.bankCode = bankCode;
    }

    // Filter by date range
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.transactionDate = dateFilter;
    }

    // Filter by financial category
    // Support legacy 'type' parameter for backward compatibility
    if (financialCategory) {
      where.financialCategory = financialCategory.toUpperCase();
    } else if (transactionType) {
      // Map legacy type to financialCategory
      if (transactionType === 'expense') {
        where.financialCategory = 'EXPENSE';
      } else if (transactionType === 'income') {
        where.financialCategory = 'INCOME';
      }
    }

    // Fetch transactions
    let transactions: any[] = [];
    let totalCount = 0;
    
    try {
      // Check if transaction table exists
      await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
      
      // If requesting all, compute total first and then fetch without pagination
      if (normalizedLimit === 'all') {
        totalCount = await (prisma as any).transaction.count({ where });
        // Override pagination to return all
        skip = 0;
        limit = totalCount || 0;
        transactions = await (prisma as any).transaction.findMany({
          where,
          include: { category: true },
          orderBy: { transactionDate: 'desc' },
        });
      } else {
        transactions = await (prisma as any).transaction.findMany({
          where,
          include: { category: true },
          orderBy: { transactionDate: 'desc' },
          skip,
          take: limit,
        });
        // Get total count
        totalCount = await (prisma as any).transaction.count({ where });
      }
    } catch (error: any) {
      // Transaction table doesn't exist yet
      console.log('⚠️ Transaction table not available');
      return NextResponse.json({
        transactions: [],
        pagination: {
          total: 0,
          page: 1,
          limit: limit,
          totalPages: 0,
        },
        message: 'Transaction table not migrated yet. Please run Prisma migration first.'
      });
    }

    // Transform data for unified format
    const allTransactions = transactions.map((t: any) => ({
      id: t.id,
      type: t.creditAmount > 0 ? 'credit' : 'debit', // For backward compatibility
      date: t.transactionDate,
      transactionDate: t.transactionDate,
      description: t.description,
      creditAmount: Number(t.creditAmount),
      debitAmount: Number(t.debitAmount),
      amount: t.creditAmount > 0 ? Number(t.creditAmount) : Number(t.debitAmount), // For backward compatibility
      financialCategory: t.financialCategory,
      category: t.category?.name,
      bankCode: t.bankCode,
      store: t.store,
      rawData: t.rawData,
      isDeleted: t.isDeleted,
      deletedAt: t.deletedAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json({
      transactions: allTransactions,
      pagination: {
        total: totalCount,
        page,
        limit: normalizedLimit === 'all' ? totalCount : limit,
        totalPages: normalizedLimit === 'all' ? 1 : Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

