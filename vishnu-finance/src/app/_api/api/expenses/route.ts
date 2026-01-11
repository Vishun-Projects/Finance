import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getCanonicalNamesBatch } from '@/lib/entity-mapping-service';
import { rateLimitMiddleware, getRouteType } from '../../../../lib/rate-limit';

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-static';
export const revalidate = 60; // Revalidate every minute

export async function GET(request: NextRequest) {
  // Rate limiting
  const routeType = getRouteType(request.nextUrl.pathname);
  const rateLimitResponse = rateLimitMiddleware(routeType, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  console.log('🔍 EXPENSES GET - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // PERFORMANCE: Add pagination support
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '100'), 200); // Max 200 per page
    const skip = (page - 1) * pageSize;

    console.log('🔍 EXPENSES GET - User ID:', userId, 'Page:', page, 'PageSize:', pageSize);

    if (!userId) {
      console.log('❌ EXPENSES GET - No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 EXPENSES GET - Fetching from database for user:', userId);
    const dateFilter = start && end ? {
      gte: new Date(start),
      lte: new Date(new Date(end).setHours(23, 59, 59, 999))
    } : undefined;

    // PERFORMANCE: Get total count for pagination (only if needed)
    // Fetch expenses from Transaction model (financialCategory=EXPENSE and debitAmount > 0)
    // Also include legacy Expense records for backward compatibility
    const getTotalCount = page === 1 || searchParams.get('includeTotal') === 'true';
    const [transactionCount, expenseCount, expensesResult] = await Promise.all([
      // Count transactions with EXPENSE category
      getTotalCount ? (prisma as any).transaction.count({
        where: {
          userId,
          isDeleted: false,
          financialCategory: 'EXPENSE',
          debitAmount: { gt: 0 },
          ...(dateFilter ? { transactionDate: dateFilter } : {})
        }
      }) : Promise.resolve(0),
      // Count legacy expenses
      getTotalCount ? (prisma as any).expense.count({
        where: {
          userId,
          isDeleted: false,
          ...(dateFilter ? { date: dateFilter } : {})
        }
      }) : Promise.resolve(0),
      // Fetch expenses from database with pagination
      (async () => {
        let expenses: any[] = [];

        try {
          // Fetch from Transaction model (primary source)
          try {
            const transactions = await (prisma as any).transaction.findMany({
              where: {
                userId,
                isDeleted: false,
                financialCategory: 'EXPENSE',
                debitAmount: { gt: 0 },
                ...(dateFilter ? { transactionDate: dateFilter } : {})
              },
              include: {
                category: true,
              },
              orderBy: { transactionDate: 'desc' },
              skip,
              take: pageSize
            });

            // Transform Transaction to Expense format for backward compatibility
            expenses = transactions.map((t: any) => ({
              id: t.id,
              amount: Number(t.debitAmount),
              description: t.description || '',
              date: t.transactionDate,
              categoryId: t.categoryId,
              isRecurring: false,
              frequency: null,
              notes: t.notes,
              receiptUrl: t.receiptUrl,
              userId: t.userId,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
              // Bank fields
              store: t.store,
              upiId: t.upiId,
              branch: t.branch,
              personName: t.personName,
              rawData: t.rawData,
              bankCode: t.bankCode,
              transactionId: t.transactionId,
              accountNumber: t.accountNumber,
              transferType: t.transferType,
              // Additional Transaction fields
              creditAmount: Number(t.creditAmount),
              debitAmount: Number(t.debitAmount),
              financialCategory: t.financialCategory,
            }));
          } catch (error) {
            console.warn('⚠️ Failed to fetch from Transaction model, falling back to Expense', error);
          }

          // Also fetch legacy Expense records if Transaction model doesn't have enough
          if (expenses.length < pageSize) {
            try {
              const legacyExpenses = await (prisma as any).expense.findMany({
                where: {
                  userId,
                  isDeleted: false,
                  ...(dateFilter ? { date: dateFilter } : {})
                },
                select: {
                  id: true,
                  amount: true,
                  description: true,
                  date: true,
                  categoryId: true,
                  isRecurring: true,
                  frequency: true,
                  notes: true,
                  receiptUrl: true,
                  userId: true,
                  createdAt: true,
                  updatedAt: true,
                  store: true,
                  upiId: true,
                  branch: true,
                  personName: true,
                  rawData: true
                },
                orderBy: { date: 'desc' },
                skip: 0,
                take: pageSize - expenses.length
              });

              // Add bank fields from raw SQL
              if (legacyExpenses.length > 0) {
                const ids = legacyExpenses.map((e: any) => e.id);
                const bankFields = await (prisma as any).$queryRawUnsafe(`
                SELECT id, bankCode, transactionId, accountNumber, transferType
                FROM expenses
                WHERE id IN (${ids.map(() => '?').join(',')})
              `, ...ids);
                const bankMap = new Map(bankFields.map((bf: any) => [bf.id, bf]));
                legacyExpenses.forEach((exp: any) => {
                  const bankData = bankMap.get(exp.id) || {};
                  Object.assign(exp, bankData);
                });
              }

              // Merge with transaction expenses (avoid duplicates by ID)
              const existingIds = new Set(expenses.map((e: any) => e.id));
              const newLegacy = legacyExpenses.filter((exp: any) => !existingIds.has(exp.id));
              expenses = [...expenses, ...newLegacy].slice(0, pageSize);
            } catch (error) {
              console.warn('⚠️ Failed to fetch legacy Expense records', error);
            }
          }

          return expenses;
        } catch (error: any) {
          // Use raw SQL fallback if Prisma validation fails (new fields not recognized)
          console.log('⚠️ EXPENSES GET - Using raw SQL fallback', error);
          const params: any[] = [userId];
          let query = `
          SELECT id, amount, description, date, categoryId, isRecurring, frequency,
                 notes, receiptUrl, userId, createdAt, updatedAt`;

          // Include all optional columns including bank fields
          query += `, COALESCE(store, '') as store,
                   COALESCE(upiId, '') as upiId,
                   COALESCE(branch, '') as branch,
                   COALESCE(personName, '') as personName,
                   COALESCE(rawData, '') as rawData,
                   COALESCE(bankCode, '') as bankCode,
                   COALESCE(transactionId, '') as transactionId,
                   COALESCE(accountNumber, '') as accountNumber,
                   COALESCE(transferType, '') as transferType`;

          query += ` FROM expenses WHERE userId = ? AND (isDeleted = 0 OR isDeleted IS NULL)`;

          if (dateFilter) {
            query += ` AND date >= ? AND date <= ?`;
            params.push(dateFilter.gte);
            params.push(dateFilter.lte);
          }

          query += ` ORDER BY date DESC LIMIT ? OFFSET ?`;
          params.push(pageSize, skip);

          return await (prisma as any).$queryRawUnsafe(query, ...params);
        }
      })()
    ]);

    let expenses: any[] = expensesResult || [];

    console.log('✅ EXPENSES GET - Found expenses:', expenses.length, 'records');

    // PERFORMANCE OPTIMIZATION: Batch entity mapping lookups instead of N+1 queries
    if (userId && expenses.length > 0) {
      // Collect all unique person names and stores
      const personNames = new Set<string>();
      const storeNames = new Set<string>();

      expenses.forEach((expense: any) => {
        if (expense.personName && expense.personName.trim()) {
          personNames.add(expense.personName);
        }
        if (expense.store && expense.store.trim()) {
          storeNames.add(expense.store);
        }
      });

      // Batch fetch all entity mappings in 2 queries (instead of N queries)
      // Gracefully handle if entity_mappings table doesn't exist
      try {
        const [personMappingsResult, storeMappingsResult] = await Promise.all([
          personNames.size > 0 ? getCanonicalNamesBatch(userId, Array.from(personNames), ['PERSON']) : Promise.resolve({}),
          storeNames.size > 0 ? getCanonicalNamesBatch(userId, Array.from(storeNames), ['STORE']) : Promise.resolve({})
        ]);

        const personMappings: Record<string, string> = personMappingsResult || {};
        const storeMappings: Record<string, string> = storeMappingsResult || {};

        // Apply mappings in memory (no database queries)
        expenses = expenses.map((expense: any) => {
          if (expense.personName && personMappings[expense.personName]) {
            expense.personName = personMappings[expense.personName];
          }
          if (expense.store && storeMappings[expense.store]) {
            expense.store = storeMappings[expense.store];
          }
          return expense;
        });
      } catch (mappingError) {
        // Gracefully continue without mappings if table doesn't exist
        console.warn('⚠️ Entity mapping feature not available (table may not exist). Continuing without name mapping.', mappingError);
        // Expenses remain unchanged (original names kept)
      }
    }

    console.log('📊 EXPENSES GET - Expenses data:', expenses.length, 'records');

    // Return paginated response with metadata
    const totalCount = transactionCount + expenseCount;
    const response: any = {
      data: expenses,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNextPage: skip + pageSize < totalCount,
        hasPreviousPage: page > 1
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ EXPENSES GET - Error:', error);
    console.error('❌ EXPENSES GET - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('➕ EXPENSES POST - Starting request');
  try {
    const body = await request.json();
    console.log('➕ EXPENSES POST - Request body:', JSON.stringify(body, null, 2));

    const {
      title,
      amount,
      category,
      date,
      description,
      paymentMethod,
      notes,
      store,
      userId
    } = body;

    console.log('➕ EXPENSES POST - Extracted data:', {
      title,
      amount,
      category,
      date,
      description,
      paymentMethod,
      notes,
      userId
    });

    // Validate required fields
    if (!title || !amount || !userId) {
      console.log('❌ EXPENSES POST - Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('➕ EXPENSES POST - Creating expense as Transaction in database...');
    // Create new expense as Transaction record with EXPENSE category
    const newExpense = await (prisma as any).transaction.create({
      data: {
        userId: userId,
        transactionDate: new Date(date),
        description: title,
        creditAmount: 0,
        debitAmount: parseFloat(amount),
        financialCategory: 'EXPENSE',
        categoryId: null,
        notes: description || notes,
        receiptUrl: null,
        store: store || null,
      }
    });

    // Transform to Expense format for backward compatibility
    const transformedExpense = {
      id: newExpense.id,
      amount: Number(newExpense.debitAmount),
      description: newExpense.description,
      date: newExpense.transactionDate,
      categoryId: newExpense.categoryId,
      isRecurring: false,
      frequency: null,
      notes: newExpense.notes,
      receiptUrl: newExpense.receiptUrl,
      userId: newExpense.userId,
      createdAt: newExpense.createdAt,
      updatedAt: newExpense.updatedAt,
      store: newExpense.store,
      creditAmount: 0,
      debitAmount: Number(newExpense.debitAmount),
      financialCategory: newExpense.financialCategory,
    };

    console.log('✅ EXPENSES POST - Successfully created expense:', JSON.stringify(transformedExpense, null, 2));
    return NextResponse.json(transformedExpense);
  } catch (error) {
    console.error('❌ EXPENSES POST - Error:', error);
    console.error('❌ EXPENSES POST - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  console.log('✏️ EXPENSES PUT - Starting request');
  try {
    const body = await request.json();
    console.log('✏️ EXPENSES PUT - Request body:', JSON.stringify(body, null, 2));

    const {
      id,
      title,
      amount,
      category,
      date,
      description,
      paymentMethod,
      notes,
      userId
    } = body;

    console.log('✏️ EXPENSES PUT - Extracted data:', {
      id,
      title,
      amount,
      category,
      date,
      description,
      paymentMethod,
      notes,
      userId
    });

    // Validate required fields
    if (!id || !title || !amount || !userId) {
      console.log('❌ EXPENSES PUT - Missing required fields');
      return NextResponse.json({ error: 'Missing required fields (id, title, amount, userId)' }, { status: 400 });
    }

    console.log('✏️ EXPENSES PUT - Updating expense in database...');
    // Update expense in database using correct field mappings
    const updatedExpense = await (prisma as any).expense.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        description: title, // Map title to description field
        date: new Date(date),
        notes: description || notes,
        isRecurring: false,
        userId: userId,
        categoryId: null // We'll handle categories later
      }
    });

    console.log('✅ EXPENSES PUT - Successfully updated expense:', JSON.stringify(updatedExpense, null, 2));
    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('❌ EXPENSES PUT - Error:', error);
    console.error('❌ EXPENSES PUT - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ EXPENSES DELETE - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('🗑️ EXPENSES DELETE - ID to delete:', id);

    if (!id) {
      console.log('❌ EXPENSES DELETE - No ID provided');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('🗑️ EXPENSES DELETE - Deleting from database...');
    // Delete from database
    await (prisma as any).expense.delete({
      where: { id }
    });

    console.log('✅ EXPENSES DELETE - Successfully deleted expense');
    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('❌ EXPENSES DELETE - Error:', error);
    console.error('❌ EXPENSES DELETE - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
