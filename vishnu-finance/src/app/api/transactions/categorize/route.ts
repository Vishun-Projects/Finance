import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { categorizeTransactions } from '@/lib/transaction-categorization-service';

/**
 * Manual categorization API
 * Categorizes transactions using full categorization service (rules + AI + patterns)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, transactions } = body as {
      userId: string;
      transactions: Array<{
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
    };

    if (!userId || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'userId and transactions array are required' },
        { status: 400 }
      );
    }

    const authToken = request.cookies.get('auth-token');
    const actorRecord = authToken ? (await AuthService.getUserFromToken(authToken.value)) as any : null;
    const actorRole = (actorRecord as { role?: 'USER' | 'SUPERUSER' } | null)?.role;

    if (!actorRecord || !actorRecord.isActive || (actorRole !== 'SUPERUSER' && actorRecord.id !== userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🤖 Manual categorization: Processing ${transactions.length} transactions for user ${userId}`);

    // Use the full categorization service
    const results = await categorizeTransactions(userId, transactions);

    console.log(`✅ Manual categorization complete: ${results.filter(r => r.categoryId).length}/${transactions.length} categorized`);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error in manual categorization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to categorize transactions' },
      { status: 500 }
    );
  }
}

