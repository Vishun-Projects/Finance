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
    const transactionType = searchParams.get('type'); // 'expense' or 'income'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    // Build where clause
    const whereExpense: any = {
      userId: user.id,
    };

    const whereIncome: any = {
      userId: user.id,
    };

    // Filter by deleted status
    if (!includeDeleted) {
      whereExpense.isDeleted = false;
      whereIncome.isDeleted = false;
    }

    // Filter by bank
    if (bankCode) {
      whereExpense.bankCode = bankCode;
      whereIncome.bankCode = bankCode;
    }

    // Filter by date range
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      
      whereExpense.date = dateFilter;
      whereIncome.startDate = dateFilter;
    }

    // Fetch expenses and income based on type filter
    let expenses: any[] = [];
    let income: any[] = [];

    if (!transactionType || transactionType === 'expense') {
      expenses = await (prisma as any).expense.findMany({
        where: whereExpense,
        include: {
          category: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      });
    }

    if (!transactionType || transactionType === 'income') {
      income = await (prisma as any).incomeSource.findMany({
        where: whereIncome,
        include: {
          category: true,
        },
        orderBy: {
          startDate: 'desc',
        },
        skip,
        take: limit,
      });
    }

    // Get counts
    const expenseCount = !transactionType || transactionType === 'expense'
      ? await (prisma as any).expense.count({ where: whereExpense })
      : 0;
    
    const incomeCount = !transactionType || transactionType === 'income'
      ? await (prisma as any).incomeSource.count({ where: whereIncome })
      : 0;

    // Transform data for unified format
    const allTransactions = [
      ...expenses.map(exp => ({
        id: exp.id,
        type: 'expense',
        date: exp.date,
        description: exp.description,
        amount: exp.amount,
        category: exp.category?.name,
        bankCode: exp.bankCode,
        store: exp.store,
        rawData: exp.rawData,
        isDeleted: exp.isDeleted,
        deletedAt: exp.deletedAt,
        createdAt: exp.createdAt,
        updatedAt: exp.updatedAt,
      })),
      ...income.map(inc => ({
        id: inc.id,
        type: 'income',
        date: inc.startDate,
        description: inc.name,
        amount: inc.amount,
        category: inc.category?.name,
        bankCode: inc.bankCode,
        store: inc.store,
        rawData: inc.rawData,
        isDeleted: inc.isDeleted,
        deletedAt: inc.deletedAt,
        createdAt: inc.createdAt,
        updatedAt: inc.updatedAt,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      transactions: allTransactions,
      pagination: {
        total: expenseCount + incomeCount,
        page,
        limit,
        totalPages: Math.ceil((expenseCount + incomeCount) / limit),
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

