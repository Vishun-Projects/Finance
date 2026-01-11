import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/transactions/categories-used
 * Returns list of category IDs that have transactions
 */
export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token');
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = request.nextUrl.searchParams.get('userId') || user.id;

    // Get distinct category IDs that have transactions
    const categoriesWithTransactions = await (prisma as any).transaction.findMany({
      where: {
        userId,
        isDeleted: false,
        categoryId: {
          not: null,
        },
      },
      select: {
        categoryId: true,
      },
      distinct: ['categoryId'],
    });

    const categoryIds = categoriesWithTransactions
      .map((t: any) => t.categoryId)
      .filter((id: string | null): id is string => id !== null);

    return NextResponse.json(categoryIds);
  } catch (error: any) {
    console.error('Error fetching used categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

