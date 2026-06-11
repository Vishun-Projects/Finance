import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCurrentAccountBalance } from '@/lib/account-balance-service';

async function requireUser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) return null;
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [statements, currentBalance] = await Promise.all([
      (prisma as any).accountStatement.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { importedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          bankCode: true,
          accountNumber: true,
          statementStartDate: true,
          statementEndDate: true,
          openingBalance: true,
          closingBalance: true,
          transactionCount: true,
          importedAt: true,
        },
      }),
      getCurrentAccountBalance(user.id),
    ]);

    return NextResponse.json({
      currentBalance,
      statements: statements.map((s: any) => ({
        id: s.id,
        bankCode: s.bankCode,
        accountNumber: s.accountNumber,
        statementStartDate: s.statementStartDate.toISOString(),
        statementEndDate: s.statementEndDate.toISOString(),
        openingBalance: Number(s.openingBalance),
        closingBalance: Number(s.closingBalance),
        transactionCount: s.transactionCount,
        importedAt: s.importedAt.toISOString(),
        isCurrentBalanceSource: s.id === currentBalance.statementId,
      })),
    });
  } catch (error) {
    console.error('[account-statements]', error);
    return NextResponse.json({ error: 'Failed to load statements' }, { status: 500 });
  }
}
