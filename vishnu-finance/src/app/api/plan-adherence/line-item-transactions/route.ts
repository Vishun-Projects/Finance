import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { getLineItemTransactions } from '@/lib/plan-adherence-service';
import { loadDashboard } from '@/features/dashboard/loaders';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const label = request.nextUrl.searchParams.get('label');
    if (!label) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }

    const dashboard = await loadDashboard(user.id);
    const { adherence } = dashboard;
    const lineItem = adherence.lineItems.find((item) => item.label === label);
    const transactions = await getLineItemTransactions(user.id, label);

    return NextResponse.json({
      label,
      planned: lineItem?.planned ?? 0,
      actual: lineItem?.actual ?? 0,
      remaining: lineItem?.remaining ?? 0,
      status: lineItem?.status ?? 'on_track',
      monthLabel: adherence.monthLabel,
      transactions,
      transactionIds: transactions.map((tx) => tx.id),
    });
  } catch (error) {
    console.error('line-item-transactions GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
