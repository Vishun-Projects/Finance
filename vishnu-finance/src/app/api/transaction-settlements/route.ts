import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { clearUserCache } from '@/lib/api-cache';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { createSettlement, listSettlements } from '@/lib/transaction-settlement-service';
import type { SettlementType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_TYPES: SettlementType[] = ['LEND_RETURN', 'BORROW_REPAY', 'EXPENSE_REFUND', 'OTHER'];

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start, end } = getCurrentMonthRange();
    const lookup = await listSettlements(user.id, start, end);

    return NextResponse.json({
      settlements: lookup.groups.map((group) => ({
        id: group.id,
        label: group.label,
        type: group.type,
        transactionIds: group.members.map((member) => member.id),
        netExpense: lookup.byTransactionId.get(group.members[0]?.id || '')?.netExpense ?? 0,
        netIncome: lookup.byTransactionId.get(group.members[0]?.id || '')?.netIncome ?? 0,
        members: group.members.map((member) => ({
          id: member.id,
          description: member.description,
          personName: member.personName,
          creditAmount: member.creditAmount,
          debitAmount: member.debitAmount,
          transactionDate: member.transactionDate?.toISOString() ?? null,
        })),
      })),
    });
  } catch (error) {
    console.error('GET /api/transaction-settlements failed:', error);
    return NextResponse.json({ error: 'Failed to load settlements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const transactionIds = Array.isArray(body.transactionIds) ? body.transactionIds : [];
    const type = body.type as SettlementType;
    const label = typeof body.label === 'string' ? body.label : null;

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid settlement type' }, { status: 400 });
    }

    const settlement = await createSettlement({
      userId: user.id,
      transactionIds,
      type,
      label,
    });

    await clearUserCache(user.id);
    invalidateUserAppData(user.id);

    return NextResponse.json({ settlement });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create settlement';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
