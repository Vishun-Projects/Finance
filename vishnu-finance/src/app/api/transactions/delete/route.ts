import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(req: NextRequest) {
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

    const body = await req.json();
    const { transactionIds, filters } = body;

    let deletedCount = 0;

    // Check if Transaction table exists
    let transactionTableExists = false;
    try {
      await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
      transactionTableExists = true;
    } catch {
      // Transaction table doesn't exist, fall back to Expense/IncomeSource
      transactionTableExists = false;
    }

    if (transactionTableExists) {
      // Use Transaction model (primary path)
      
      // Soft delete by IDs
      if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
        const result = await (prisma as any).transaction.updateMany({
          where: {
            id: { in: transactionIds },
            userId: user.id,
            isDeleted: false,
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
        deletedCount += result.count;
      }

      // Bulk delete by filters
      if (filters) {
        const where: any = {
          userId: user.id,
          isDeleted: false,
        };

        // Apply filters
        if (filters.bankCode) {
          where.bankCode = filters.bankCode;
        }

        if (filters.transactionType === 'expense' || filters.transactionType === 'debit') {
          where.financialCategory = 'EXPENSE';
          where.debitAmount = { gt: 0 };
        } else if (filters.transactionType === 'income' || filters.transactionType === 'credit') {
          where.financialCategory = 'INCOME';
          where.creditAmount = { gt: 0 };
        }

        if (filters.startDate || filters.endDate) {
          where.transactionDate = {};
          if (filters.startDate) where.transactionDate.gte = new Date(filters.startDate);
          if (filters.endDate) where.transactionDate.lte = new Date(filters.endDate);
        }

        const result = await (prisma as any).transaction.updateMany({
          where,
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
        deletedCount += result.count;
      }
    } else {
      // Fallback to Expense/IncomeSource (backward compatibility)
      
      // Soft delete by IDs
      if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
        const existingExpenses = await (prisma as any).expense.findMany({
          where: {
            id: { in: transactionIds },
            userId: user.id,
            isDeleted: false,
          },
          select: { id: true },
        });

        const existingIncome = await (prisma as any).incomeSource.findMany({
          where: {
            id: { in: transactionIds },
            userId: user.id,
            isDeleted: false,
          },
          select: { id: true },
        });

        const expenseIds = existingExpenses.map((e: any) => e.id);
        const incomeIds = existingIncome.map((i: any) => i.id);

        if (expenseIds.length > 0) {
          const expenseResult = await (prisma as any).expense.updateMany({
            where: {
              id: { in: expenseIds },
              userId: user.id,
              isDeleted: false,
            },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
          deletedCount += expenseResult.count;
        }

        if (incomeIds.length > 0) {
          const incomeResult = await (prisma as any).incomeSource.updateMany({
            where: {
              id: { in: incomeIds },
              userId: user.id,
              isDeleted: false,
            },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
          deletedCount += incomeResult.count;
        }
      }

      // Bulk delete by filters (legacy)
      if (filters) {
        const whereExpense: any = {
          userId: user.id,
          isDeleted: false,
        };

        const whereIncome: any = {
          userId: user.id,
          isDeleted: false,
        };

        if (filters.bankCode) {
          whereExpense.bankCode = filters.bankCode;
          whereIncome.bankCode = filters.bankCode;
        }

        if (filters.transactionType === 'expense') {
          const result = await (prisma as any).expense.updateMany({
            where: whereExpense,
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
          deletedCount += result.count;
        } else if (filters.transactionType === 'income') {
          const result = await (prisma as any).incomeSource.updateMany({
            where: whereIncome,
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
          deletedCount += result.count;
        } else {
          const expenseResult = await (prisma as any).expense.updateMany({
            where: whereExpense,
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
          deletedCount += expenseResult.count;

          const incomeResult = await (prisma as any).incomeSource.updateMany({
            where: whereIncome,
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
          deletedCount += incomeResult.count;
        }
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} transaction(s)`,
    });
  } catch (error) {
    console.error('Error deleting transactions:', error);
    return NextResponse.json(
      { error: 'Failed to delete transactions' },
      { status: 500 }
    );
  }
}

