import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimitMiddleware, getRouteType } from '@/lib/rate-limit';
import { getCanonicalName } from '@/lib/entity-mapping-service';

export const dynamic = 'force-static';

/**
 * PUT /api/transactions/batch-update
 * Batch update multiple transactions at once to avoid rate limiting
 * Body: { userId: string, updates: Array<{ id: string, categoryId?: string, financialCategory?: string, ... }> }
 */
export async function PUT(request: NextRequest) {
  const routeType = getRouteType(request.nextUrl.pathname);
  const rateLimitResponse = rateLimitMiddleware(routeType, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const authToken = request.cookies.get('auth-token');
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized or account deactivated' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, updates } = body as {
      userId: string;
      updates: Array<{
        id: string;
        categoryId?: string | null;
        financialCategory?: string;
        description?: string;
        store?: string;
        personName?: string;
        notes?: string;
        [key: string]: any;
      }>;
    };

    if (!userId || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'userId and updates array are required' }, { status: 400 });
    }

    // Verify user owns the transactions
    if (user.id !== userId && user.role !== 'SUPERUSER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify all transactions belong to user
    const transactionIds = updates.map(u => u.id);
    const existingTransactions = await (prisma as any).transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId,
        isDeleted: false,
      },
      select: { id: true, store: true, personName: true },
    });

    const existingIds = new Set(existingTransactions.map((t: any) => t.id));
    const invalidIds = transactionIds.filter(id => !existingIds.has(id));
    
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Some transactions not found or don't belong to user`, invalidIds },
        { status: 404 }
      );
    }

    // Build a map of existing transactions for entity mapping
    type ExistingTransaction = {
      store: string | null;
      personName: string | null;
    };
    const existingMap = new Map<string, ExistingTransaction>(
      existingTransactions.map((t: any) => [t.id, { store: t.store, personName: t.personName }])
    );

    // Process updates in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (update) => {
        try {
          const updateData: any = {};
          
          if (update.categoryId !== undefined) updateData.categoryId = update.categoryId || null;
          if (update.financialCategory !== undefined) {
            updateData.financialCategory = update.financialCategory.toUpperCase();
          }
          if (update.description !== undefined) updateData.description = update.description;
          if (update.notes !== undefined) updateData.notes = update.notes || null;
          
          // Handle entity mappings for store/personName
          if (update.store !== undefined) {
            const existing = existingMap.get(update.id);
            if (update.store && update.store !== existing?.store) {
              try {
                updateData.store = await getCanonicalName(userId, update.store, 'STORE');
              } catch {
                updateData.store = update.store;
              }
            } else {
              updateData.store = update.store || null;
            }
          }
          
          if (update.personName !== undefined) {
            const existing = existingMap.get(update.id);
            if (update.personName && update.personName !== existing?.personName) {
              try {
                updateData.personName = await getCanonicalName(userId, update.personName, 'PERSON');
              } catch {
                updateData.personName = update.personName;
              }
            } else {
              updateData.personName = update.personName || null;
            }
          }

          // Update transaction
          await (prisma as any).transaction.update({
            where: { id: update.id },
            data: updateData,
          });

          return { id: update.id, success: true };
        } catch (error: any) {
          console.error(`Error updating transaction ${update.id}:`, error);
          return {
            id: update.id,
            success: false,
            error: error.message || 'Update failed',
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(
        ...batchResults.map((result) =>
          result.status === 'fulfilled' ? result.value : { id: 'unknown', success: false, error: 'Promise rejected' }
        )
      );
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      total: updates.length,
      succeeded: successCount,
      failed: failureCount,
      results,
    });
  } catch (error: any) {
    console.error('Error in batch update:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to batch update transactions' },
      { status: 500 }
    );
  }
}

