import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { detectRecurringBills } from '@/lib/recurring-detection';

export type { DetectedRecurringBill, RecurringBillKind } from '@/lib/recurring-detection';
export { detectRecurringBills } from '@/lib/recurring-detection';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const patterns = await detectRecurringBills(user.id);
    const mandates = patterns.filter((p) => p.kind === 'mandate');
    const habits = patterns.filter((p) => p.kind === 'habit');

    return NextResponse.json({ patterns, mandates, habits });
  } catch (error) {
    console.error('[recurring/detect]', error);
    return NextResponse.json({ error: 'Failed to detect recurring bills' }, { status: 500 });
  }
}
