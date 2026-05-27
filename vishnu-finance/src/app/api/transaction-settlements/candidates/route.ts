import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { prisma } from '@/lib/db';
import { isSettlementSchemaMissingError } from '@/lib/transaction-settlement-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const excludeId = searchParams.get('excludeId');
    const query = searchParams.get('q')?.trim() ?? '';
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const baseWhere = {
      userId: user.id,
      isDeleted: false,
      id: excludeId ? { not: excludeId } : undefined,
      transactionDate: { gte: start, lte: end },
      ...(query
        ? {
            OR: [
              { description: { contains: query, mode: 'insensitive' as const } },
              { personName: { contains: query, mode: 'insensitive' as const } },
              { store: { contains: query, mode: 'insensitive' as const } },
              { notes: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    let transactions;
    try {
      transactions = await prisma.transaction.findMany({
        where: { ...baseWhere, settlementMember: null },
        select: {
          id: true,
          description: true,
          personName: true,
          store: true,
          creditAmount: true,
          debitAmount: true,
          financialCategory: true,
          transactionDate: true,
          category: { select: { name: true } },
        },
        orderBy: { transactionDate: 'desc' },
        take: limit,
      });
    } catch (error) {
      if (!isSettlementSchemaMissingError(error)) {
        throw error;
      }
      transactions = await prisma.transaction.findMany({
        where: baseWhere,
        select: {
          id: true,
          description: true,
          personName: true,
          store: true,
          creditAmount: true,
          debitAmount: true,
          financialCategory: true,
          transactionDate: true,
          category: { select: { name: true } },
        },
        orderBy: { transactionDate: 'desc' },
        take: limit,
      });
    }

    return NextResponse.json({
      transactions: transactions.map((tx) => ({
        id: tx.id,
        description: tx.description,
        personName: tx.personName,
        store: tx.store,
        creditAmount: Number(tx.creditAmount) || 0,
        debitAmount: Number(tx.debitAmount) || 0,
        financialCategory: tx.financialCategory,
        transactionDate: tx.transactionDate.toISOString(),
        categoryName: tx.category?.name ?? null,
      })),
    });
  } catch (error) {
    console.error('GET /api/transaction-settlements/candidates failed:', error);
    return NextResponse.json({ error: 'Failed to load candidates' }, { status: 500 });
  }
}
