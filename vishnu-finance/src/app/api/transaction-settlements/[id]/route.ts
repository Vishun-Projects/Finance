import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { clearUserCache } from '@/lib/api-cache';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { deleteSettlement } from '@/lib/transaction-settlement-service';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteSettlement(user.id, id);
    await clearUserCache(user.id);
    invalidateUserAppData(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete settlement';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
