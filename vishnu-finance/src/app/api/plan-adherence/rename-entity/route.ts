import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { clearUserCache } from '@/lib/api-cache';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { prisma } from '@/lib/db';
import { upsertEntityMapping } from '@/lib/entity-mapping-service';
import { getEntityUpdateField } from '@/lib/transaction-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const transactionIds = Array.isArray(body.transactionIds) ? body.transactionIds : [];
    const newName = typeof body.newName === 'string' ? body.newName.trim() : '';

    if (!transactionIds.length) {
      return NextResponse.json({ error: 'transactionIds is required' }, { status: 400 });
    }
    if (!newName) {
      return NextResponse.json({ error: 'newName is required' }, { status: 400 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: user.id,
        isDeleted: false,
      },
      select: {
        id: true,
        store: true,
        personName: true,
      },
    });

    if (transactions.length !== transactionIds.length) {
      return NextResponse.json({ error: 'Some transactions were not found' }, { status: 404 });
    }

    const personUpdates: string[] = [];
    const storeUpdates: string[] = [];
    const personOldNames = new Set<string>();
    const storeOldNames = new Set<string>();

    for (const tx of transactions) {
      const field = getEntityUpdateField(tx);
      const oldValue = (field === 'personName' ? tx.personName : tx.store)?.trim();

      if (field === 'personName') {
        personUpdates.push(tx.id);
        if (oldValue) personOldNames.add(oldValue);
      } else {
        storeUpdates.push(tx.id);
        if (oldValue) storeOldNames.add(oldValue);
      }
    }

    if (personUpdates.length > 0) {
      await prisma.transaction.updateMany({
        where: { id: { in: personUpdates }, userId: user.id },
        data: { personName: newName },
      });
      await upsertEntityMapping(user.id, newName, [...personOldNames], 'PERSON');
    }

    if (storeUpdates.length > 0) {
      await prisma.transaction.updateMany({
        where: { id: { in: storeUpdates }, userId: user.id },
        data: { store: newName },
      });
      await upsertEntityMapping(user.id, newName, [...storeOldNames], 'STORE');
    }

    await clearUserCache(user.id);
    invalidateUserAppData(user.id);

    return NextResponse.json({
      updated: transactions.length,
      newName,
      personUpdates: personUpdates.length,
      storeUpdates: storeUpdates.length,
    });
  } catch (error) {
    console.error('rename-entity POST error:', error);
    return NextResponse.json({ error: 'Failed to rename' }, { status: 500 });
  }
}
