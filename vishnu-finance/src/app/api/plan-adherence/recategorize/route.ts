import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { clearUserCache } from '@/lib/api-cache';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { prisma } from '@/lib/db';
import {
  OTHER_EXPENSE_CATEGORIES,
  PLAN_EXPENSE_CATEGORIES,
} from '@/features/dashboard/config/plan-expense-categories';

export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORY_NAMES = new Set([
  ...PLAN_EXPENSE_CATEGORIES.map((c) => c.name.toLowerCase()),
  ...OTHER_EXPENSE_CATEGORIES.map((c) => c.name.toLowerCase()),
  // legacy names still in DB until user recategorizes
  'groceries',
  'housing',
  'transportation',
  'travel',
  'food & dining',
  'utilities',
  'subscriptions',
  'shopping',
  'entertainment',
  'debt payment',
  'investment',
  'insurance',
  'healthcare',
  'miscellaneous',
  'uncategorized',
]);

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const transactionIds = Array.isArray(body.transactionIds) ? body.transactionIds : [];
    const categoryName = typeof body.categoryName === 'string' ? body.categoryName.trim() : '';

    if (!transactionIds.length) {
      return NextResponse.json({ error: 'transactionIds is required' }, { status: 400 });
    }
    if (!categoryName || !ALLOWED_CATEGORY_NAMES.has(categoryName.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid categoryName' }, { status: 400 });
    }

    const category = await prisma.category.findFirst({
      where: {
        type: 'EXPENSE',
        name: { equals: categoryName, mode: 'insensitive' },
        OR: [{ isDefault: true, userId: null }, { userId: user.id }],
      },
    });

    if (!category) {
      return NextResponse.json({ error: `Category "${categoryName}" not found` }, { status: 404 });
    }

    const owned = await prisma.transaction.count({
      where: {
        id: { in: transactionIds },
        userId: user.id,
        isDeleted: false,
      },
    });

    if (owned !== transactionIds.length) {
      return NextResponse.json({ error: 'Some transactions were not found' }, { status: 404 });
    }

    await prisma.transaction.updateMany({
      where: { id: { in: transactionIds }, userId: user.id },
      data: {
        categoryId: category.id,
        autoCategorized: false,
      },
    });

    await clearUserCache(user.id);
    invalidateUserAppData(user.id);

    return NextResponse.json({
      updated: transactionIds.length,
      categoryName: category.name,
      categoryId: category.id,
    });
  } catch (error) {
    console.error('recategorize POST error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}
