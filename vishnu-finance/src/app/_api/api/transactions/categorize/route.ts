import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { categorizeTransactions } from '@/lib/transaction-categorization-service';
import { multiPassCategorization } from '@/lib/multi-pass-categorization';

/**
 * Consolidated categorization API
 * Supports both manual (synchronous) and background (asynchronous) categorization
 * 
 * Manual mode: POST with { userId, transactions } - returns results immediately
 * Background mode: POST with { userId, transactionIds, background: true } - returns job info
 * Status check: GET with ?userId=...&transactionIds=... - returns progress
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      transactions, 
      transactionIds, 
      background = false,
      batchSize = 100 
    } = body as {
      userId: string;
      transactions?: Array<{
        description: string;
        store?: string;
        commodity?: string;
        amount: number;
        date: string;
        financialCategory: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER';
        personName?: string;
        upiId?: string;
        accountNumber?: string;
        accountHolderName?: string;
      }>;
      transactionIds?: string[];
      background?: boolean;
      batchSize?: number;
    };

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const authToken = request.cookies.get('auth-token');
    const actorRecord = authToken ? (await AuthService.getUserFromToken(authToken.value)) as any : null;
    const actorRole = (actorRecord as { role?: 'USER' | 'SUPERUSER' } | null)?.role;

    if (!actorRecord || !actorRecord.isActive || (actorRole !== 'SUPERUSER' && actorRecord.id !== userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Background mode: process transaction IDs asynchronously
    if (background && transactionIds) {
      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return NextResponse.json(
          { error: 'transactionIds array is required for background mode' },
          { status: 400 }
        );
      }

      // Process in background (don't wait for completion)
      processCategorizationInBackground(userId, transactionIds, batchSize).catch((error) => {
        console.error('Background categorization error:', error);
      });

      // Return immediately with job info
      return NextResponse.json({
        success: true,
        message: 'Categorization job started',
        totalTransactions: transactionIds.length,
        estimatedTime: Math.ceil(transactionIds.length / batchSize) * 2, // ~2 seconds per batch
      });
    }

    // Manual mode: process transactions synchronously
    if (transactions) {
      if (!Array.isArray(transactions) || transactions.length === 0) {
        return NextResponse.json(
          { error: 'transactions array is required for manual mode' },
          { status: 400 }
        );
      }

      console.log(`🤖 Manual categorization: Processing ${transactions.length} transactions for user ${userId}`);

      // Use the full categorization service
      const results = await categorizeTransactions(userId, transactions);

      console.log(`✅ Manual categorization complete: ${results.filter(r => r.categoryId).length}/${transactions.length} categorized`);

      return NextResponse.json(results);
    }

    return NextResponse.json(
      { error: 'Either transactions (manual) or transactionIds with background=true (background) is required' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in categorization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to categorize transactions' },
      { status: 500 }
    );
  }
}

/**
 * Process categorization in background using multi-pass system
 */
async function processCategorizationInBackground(
  userId: string,
  transactionIds: string[],
  batchSize: number,
  useMultiPass: boolean = true
): Promise<void> {
  const totalBatches = Math.ceil(transactionIds.length / batchSize);
  let processed = 0;
  let categorized = 0;

  console.log(`🔄 Starting background categorization for ${transactionIds.length} transactions (${totalBatches} batches) for user ${userId}`);

  // Use multi-pass categorization if enabled (default)
  if (useMultiPass) {
    console.log(`🔄 Using multi-pass categorization system...`);
    try {
      const result = await multiPassCategorization(userId, transactionIds);
      console.log(
        `✅ Multi-pass categorization complete: ` +
        `${result.categorized} categorized, ${result.updated} updated, ` +
        `${result.consistencyFixes} consistency fixes, ${result.integrityFixes} integrity fixes`
      );
      return;
    } catch (error) {
      console.error('❌ Multi-pass categorization failed, falling back to batch processing:', error);
      // Fall through to batch processing
    }
  }

  // Process in batches (fallback)
  for (let i = 0; i < transactionIds.length; i += batchSize) {
    const batch = transactionIds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    try {
      // Fetch transactions
      const transactions = await prisma.transaction.findMany({
        where: {
          id: { in: batch },
          userId,
          isDeleted: false,
        },
        select: {
          id: true,
          description: true,
          transactionDate: true,
          creditAmount: true,
          debitAmount: true,
          store: true,
          personName: true,
          upiId: true,
          notes: true,
          financialCategory: true,
        },
      });

      if (transactions.length === 0) {
        processed += batch.length;
        continue;
      }

      // Prepare for categorization
      const transactionsToCategorize = transactions.map((t) => {
        // Handle transactionDate - could be Date object or string (from Prisma)
        let dateStr = '';
        if (t.transactionDate) {
          const dateValue = t.transactionDate as Date | string;
          if (dateValue instanceof Date) {
            dateStr = dateValue.toISOString().split('T')[0];
          } else if (typeof dateValue === 'string') {
            // Already a string, extract date part if needed
            dateStr = dateValue.split('T')[0].substring(0, 10);
          } else {
            // Try to convert to Date
            const date = new Date(dateValue as any);
            if (!isNaN(date.getTime())) {
              dateStr = date.toISOString().split('T')[0];
            }
          }
        }
        
        // Convert Prisma Decimal to number
        const creditAmount = typeof t.creditAmount === 'object' && 'toNumber' in t.creditAmount 
          ? (t.creditAmount as any).toNumber() 
          : Number(t.creditAmount || 0);
        const debitAmount = typeof t.debitAmount === 'object' && 'toNumber' in t.debitAmount 
          ? (t.debitAmount as any).toNumber() 
          : Number(t.debitAmount || 0);
        
        return {
          description: t.description || '',
          store: t.store || undefined,
          commodity: t.notes || undefined,
          amount: (creditAmount > 0 ? creditAmount : debitAmount) || 0,
          date: dateStr || new Date().toISOString().split('T')[0], // Fallback to today if invalid
          financialCategory: t.financialCategory as 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER',
          personName: t.personName || undefined,
          upiId: t.upiId || undefined,
        };
      });

      // Categorize batch
      console.log(`🔄 Categorizing batch ${batchNum}/${totalBatches} (${transactions.length} transactions)...`);
      const results = await categorizeTransactions(userId, transactionsToCategorize);
      
      // Log categorization results
      const foundCategories = results.filter(r => r.categoryId || r.categoryName).length;
      console.log(`📊 Batch ${batchNum}: Found categories for ${foundCategories}/${transactions.length} transactions`);

      // Update transactions in batch
      const updates = transactions.map(async (t, idx) => {
        const result = results[idx];
        if (result && result.categoryId) {
          return prisma.transaction.update({
            where: { id: t.id },
            data: {
              categoryId: result.categoryId,
              // Keep existing financialCategory, categorization doesn't change it
            },
          });
        } else if (result && result.categoryName && !result.categoryId) {
          // Look up category ID by name
          try {
            // Use raw query for case-insensitive search, or cast to any for Prisma compatibility
            const category = await (prisma as any).category.findFirst({
              where: {
                name: result.categoryName,
                OR: [
                  { userId: userId },
                  { isDefault: true, userId: null },
                ],
              },
              select: { id: true },
            });
            
            if (category) {
              return prisma.transaction.update({
                where: { id: t.id },
                data: {
                  categoryId: category.id,
                  // Keep existing financialCategory, categorization doesn't change it
                },
              });
            } else {
              console.warn(`⚠️ Batch ${batchNum}: Transaction ${t.id} has category name "${result.categoryName}" but category not found in database`);
            }
          } catch (error) {
            console.error(`Error looking up category for transaction ${t.id}:`, error);
          }
        }
        return null;
      });

      const updateResults = await Promise.all(updates);
      const batchCategorized = updateResults.filter((r) => r !== null).length;
      categorized += batchCategorized;
      processed += transactions.length;

      // Retroactive update: When we learn a new pattern, update previous uncategorized transactions
      // with the same store/personName/upiId
      try {
        const newlyCategorized = transactions.filter((t, idx) => {
          const result = results[idx];
          return result && result.categoryId && updateResults[idx] !== null;
        });

        for (const txn of newlyCategorized) {
          const txnIdx = transactions.indexOf(txn);
          const result = results[txnIdx];
          if (!result || !result.categoryId) continue;

          // Find previous uncategorized transactions with same store/personName/upiId
          const whereClause: any = {
            userId,
            categoryId: null,
            isDeleted: false,
            id: { not: txn.id }, // Don't update the current transaction
          };

          // Match by store, personName, or upiId (normalize for matching)
          const store = txn.store?.trim().toLowerCase();
          const personName = txn.personName?.trim().toLowerCase();
          const upiId = txn.upiId?.trim().toLowerCase();

          if (store) {
            whereClause.store = { equals: txn.store, mode: 'insensitive' };
          } else if (personName) {
            whereClause.personName = { equals: txn.personName, mode: 'insensitive' };
          } else if (upiId) {
            whereClause.upiId = { equals: txn.upiId, mode: 'insensitive' };
          } else {
            continue; // No identifier to match on
          }

          // Update previous transactions
          const updated = await prisma.transaction.updateMany({
            where: whereClause,
            data: {
              categoryId: result.categoryId,
            },
          });

          if (updated.count > 0) {
            console.log(
              `🔄 Retroactive update: Updated ${updated.count} previous transactions ` +
              `for ${txn.store || txn.personName || txn.upiId} with category ${result.categoryId}`
            );
          }
        }
      } catch (error) {
        console.error('Error in retroactive update:', error);
        // Don't fail the whole batch if retroactive update fails
      }

      console.log(
        `✅ Batch ${batchNum}/${totalBatches}: Categorized ${batchCategorized}/${transactions.length} transactions ` +
        `(Total: ${categorized}/${processed})`
      );

      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < transactionIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ Error processing batch ${batchNum}:`, error);
      processed += batch.length;
      // Continue with next batch
    }
  }

  console.log(`✅ Background categorization complete: ${categorized}/${processed} transactions categorized`);
}

/**
 * Get categorization job status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const transactionIdsParam = searchParams.get('transactionIds');

    if (!userId || !transactionIdsParam) {
      return NextResponse.json(
        { error: 'userId and transactionIds are required' },
        { status: 400 }
      );
    }

    const authToken = request.cookies.get('auth-token');
    const actorRecord = authToken ? (await AuthService.getUserFromToken(authToken.value)) as any : null;
    const actorRole = (actorRecord as { role?: 'USER' | 'SUPERUSER' } | null)?.role;

    if (!actorRecord || !actorRecord.isActive || (actorRole !== 'SUPERUSER' && actorRecord.id !== userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactionIds = transactionIdsParam.split(',');
    
    // Check how many are already categorized
    const categorizedCount = await prisma.transaction.count({
      where: {
        id: { in: transactionIds },
        userId,
        categoryId: { not: null },
        isDeleted: false,
      },
    });

    return NextResponse.json({
      total: transactionIds.length,
      categorized: categorizedCount,
      remaining: transactionIds.length - categorizedCount,
      progress: transactionIds.length > 0 
        ? Math.round((categorizedCount / transactionIds.length) * 100) 
        : 0,
    });
  } catch (error: any) {
    console.error('Error getting categorization status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    );
  }
}
