import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
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

    let restoredCount = 0;

    // Restore by IDs
    if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
      // First, find which IDs belong to expenses and which to income
      // by querying both tables (only deleted ones)
      const existingExpenses = await (prisma as any).expense.findMany({
        where: {
          id: { in: transactionIds },
          userId: user.id,
          isDeleted: true,
        },
        select: { id: true },
      });

      const existingIncome = await (prisma as any).incomeSource.findMany({
        where: {
          id: { in: transactionIds },
          userId: user.id,
          isDeleted: true,
        },
        select: { id: true },
      });

      const expenseIds = existingExpenses.map((e: any) => e.id);
      const incomeIds = existingIncome.map((i: any) => i.id);

      if (expenseIds.length > 0) {
        const expenseResult = await (prisma as any).expense.updateMany({
          where: {
            id: { in: expenseIds },
            userId: user.id, // Ensure user owns these transactions
            isDeleted: true, // Only restore if already deleted
          },
          data: {
            isDeleted: false,
            deletedAt: null,
          },
        });
        restoredCount += expenseResult.count;
      }

      if (incomeIds.length > 0) {
        const incomeResult = await (prisma as any).incomeSource.updateMany({
          where: {
            id: { in: incomeIds },
            userId: user.id,
            isDeleted: true,
          },
          data: {
            isDeleted: false,
            deletedAt: null,
          },
        });
        restoredCount += incomeResult.count;
      }
    }

    // Bulk restore by filters
    if (filters) {
      const whereExpense: any = {
        userId: user.id,
        isDeleted: true,
      };

      const whereIncome: any = {
        userId: user.id,
        isDeleted: true,
      };

      // Apply filters
      if (filters.bankCode) {
        whereExpense.bankCode = filters.bankCode;
        whereIncome.bankCode = filters.bankCode;
      }

      if (filters.transactionType === 'expense') {
        const result = await (prisma as any).expense.updateMany({
          where: whereExpense,
          data: {
            isDeleted: false,
            deletedAt: null,
          },
        });
        restoredCount += result.count;
      } else if (filters.transactionType === 'income') {
        const result = await (prisma as any).incomeSource.updateMany({
          where: whereIncome,
          data: {
            isDeleted: false,
            deletedAt: null,
          },
        });
        restoredCount += result.count;
      } else {
        // Restore both types
        const expenseResult = await (prisma as any).expense.updateMany({
          where: whereExpense,
          data: {
            isDeleted: false,
            deletedAt: null,
          },
        });
        restoredCount += expenseResult.count;

        const incomeResult = await (prisma as any).incomeSource.updateMany({
          where: whereIncome,
          data: {
            isDeleted: false,
            deletedAt: null,
          },
        });
        restoredCount += incomeResult.count;
      }
    }

    return NextResponse.json({
      success: true,
      restoredCount,
      message: `Successfully restored ${restoredCount} transaction(s)`,
    });
  } catch (error) {
    console.error('Error restoring transactions:', error);
    return NextResponse.json(
      { error: 'Failed to restore transactions' },
      { status: 500 }
    );
  }
}

