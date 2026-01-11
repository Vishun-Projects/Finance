import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getCanonicalNamesBatch } from '@/lib/entity-mapping-service';
import { rateLimitMiddleware, getRouteType } from '../../../lib/rate-limit';

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-static';
export const revalidate = 300; // Revalidate every 5 minutes (income sources change less frequently)

export async function GET(request: NextRequest) {
  // Rate limiting
  const routeType = getRouteType(request.nextUrl.pathname);
  const rateLimitResponse = rateLimitMiddleware(routeType, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  console.log('🔍 INCOME GET - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    console.log('🔍 INCOME GET - User ID:', userId);

    if (!userId) {
      console.log('❌ INCOME GET - No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 INCOME GET - Fetching from database for user:', userId);
    const dateFilter = start && end ? {
      gte: new Date(start),
      lte: new Date(new Date(end).setHours(23,59,59,999))
    } : undefined;

    // PERFORMANCE: Add pagination support
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '100'), 200); // Max 200 per page
    const skip = (page - 1) * pageSize;

    // Fetch incomes from Transaction model (financialCategory=INCOME and creditAmount > 0)
    // Also include legacy IncomeSource records for backward compatibility
    const getTotalCount = page === 1 || searchParams.get('includeTotal') === 'true';
    const [transactionCount, incomeSourceCount, incomesResult] = await Promise.all([
      // Count transactions with INCOME category
      getTotalCount ? (prisma as any).transaction.count({
        where: {
          userId,
          isDeleted: false,
          financialCategory: 'INCOME',
          creditAmount: { gt: 0 },
          ...(dateFilter ? { transactionDate: dateFilter } : {})
        }
      }) : Promise.resolve(0),
      // Count legacy income sources
      getTotalCount ? (prisma as any).incomeSource.count({
        where: {
          userId,
          isActive: true,
          isDeleted: false,
          ...(dateFilter ? { startDate: dateFilter } : {})
        }
      }) : Promise.resolve(0),
      (async () => {
        let incomes: any[] = [];
        
        try {
          // Fetch from Transaction model (primary source)
          try {
          const transactions = await (prisma as any).transaction.findMany({
            where: {
              userId,
              isDeleted: false,
              financialCategory: 'INCOME',
              creditAmount: { gt: 0 },
              ...(dateFilter ? { transactionDate: dateFilter } : {})
            },
            include: {
              category: true,
            },
            orderBy: { transactionDate: 'desc' },
            skip,
            take: pageSize
          });
          
          // Transform Transaction to IncomeSource format for backward compatibility
          incomes = transactions.map((t: any) => ({
            id: t.id,
            name: t.description || '',
            amount: Number(t.creditAmount),
            frequency: 'ONE_TIME', // Transactions are one-time
            categoryId: t.categoryId,
            startDate: t.transactionDate,
            endDate: null,
            notes: t.notes,
            isActive: true,
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
          console.warn('⚠️ Failed to fetch from Transaction model, falling back to IncomeSource', error);
        }
        
        // Also fetch legacy IncomeSource records if Transaction model doesn't have enough
        if (incomes.length < pageSize) {
          try {
            const legacyIncomes = await (prisma as any).incomeSource.findMany({
              where: {
                userId,
                isActive: true,
                isDeleted: false,
                ...(dateFilter ? { startDate: dateFilter } : {})
            },
            select: {
              id: true,
              name: true,
              amount: true,
              frequency: true,
              categoryId: true,
              startDate: true,
              endDate: true,
              notes: true,
              isActive: true,
              userId: true,
              createdAt: true,
              updatedAt: true,
              store: true,
              upiId: true,
              branch: true,
              personName: true,
              rawData: true
            },
            orderBy: { startDate: 'desc' },
              skip: 0,
              take: pageSize - incomes.length
            });
            
            // Add bank fields from raw SQL
            if (legacyIncomes.length > 0) {
              const ids = legacyIncomes.map((i: any) => i.id);
        const bankFields = await (prisma as any).$queryRawUnsafe(`
          SELECT id, bankCode, transactionId, accountNumber, transferType
          FROM income_sources
          WHERE id IN (${ids.map(() => '?').join(',')})
        `, ...ids);
        const bankMap = new Map(bankFields.map((bf: any) => [bf.id, bf]));
              legacyIncomes.forEach((inc: any) => {
          const bankData = bankMap.get(inc.id) || {};
                Object.assign(inc, bankData);
              });
            }
            
            // Merge with transaction incomes (avoid duplicates by ID)
            const existingIds = new Set(incomes.map((i: any) => i.id));
            const newLegacy = legacyIncomes.filter((inc: any) => !existingIds.has(inc.id));
            incomes = [...incomes, ...newLegacy].slice(0, pageSize);
          } catch (error) {
            console.warn('⚠️ Failed to fetch legacy IncomeSource records', error);
          }
      }
      
      // Filter out any invalid amounts or duplicates
      const seen = new Set<string>();
      incomes = incomes.filter((income: any) => {
        const amount = parseFloat(income.amount || 0);
        // Skip invalid amounts
        if (!amount || amount <= 0 || isNaN(amount) || !isFinite(amount)) {
          return false;
        }
        // Deduplicate by key: name|amount|startDate
        const dateStr = income.startDate ? new Date(income.startDate).toISOString().split('T')[0] : '';
        const key = `${income.name}|${amount}|${dateStr}`;
        if (seen.has(key)) {
          console.log('⚠️ Duplicate income detected:', key);
          return false;
        }
        seen.add(key);
        return true;
      });
      
          return incomes;
    } catch (error: any) {
      // Use raw SQL fallback if Prisma validation fails (new fields not recognized)
      console.log('⚠️ INCOME GET - Using raw SQL fallback', error);
      const params: any[] = [userId];
      let query = `
        SELECT id, name, amount, frequency, categoryId, startDate, endDate, 
               notes, isActive, userId, createdAt, updatedAt`;
      
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
      
      query += ` FROM income_sources WHERE userId = ? AND isActive = 1 AND (isDeleted = 0 OR isDeleted IS NULL)`;
      
      if (dateFilter) {
        query += ` AND startDate >= ? AND startDate <= ?`;
        params.push(dateFilter.gte);
        params.push(dateFilter.lte);
      }
      
      query += ` ORDER BY startDate DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, skip);
      
          let fallbackIncomes = await (prisma as any).$queryRawUnsafe(query, ...params);
      
      // Filter out any invalid amounts or duplicates
      const seen = new Set<string>();
          fallbackIncomes = fallbackIncomes.filter((income: any) => {
        const amount = parseFloat(income.amount || 0);
        // Skip invalid amounts
        if (!amount || amount <= 0 || isNaN(amount) || !isFinite(amount)) {
          return false;
        }
        // Deduplicate by key: name|amount|startDate
        const dateStr = income.startDate ? new Date(income.startDate).toISOString().split('T')[0] : '';
        const key = `${income.name}|${amount}|${dateStr}`;
        if (seen.has(key)) {
          console.log('⚠️ Duplicate income detected:', key);
          return false;
        }
        seen.add(key);
        return true;
      });
          
          return fallbackIncomes;
    }
      })()
]);
    
    let incomes: any[] = incomesResult || [];

    console.log('✅ INCOME GET - Found incomes:', incomes.length, 'records');
    
    // PERFORMANCE OPTIMIZATION: Batch entity mapping lookups instead of N+1 queries
    if (userId && incomes.length > 0) {
      // Collect all unique person names and stores
      const personNames = new Set<string>();
      const storeNames = new Set<string>();
      
      incomes.forEach((income: any) => {
        if (income.personName && income.personName.trim()) {
          personNames.add(income.personName);
        }
        if (income.store && income.store.trim()) {
          storeNames.add(income.store);
        }
      });

      // Batch fetch all entity mappings in 2 queries (instead of N queries)
      // Gracefully handle if entity_mappings table doesn't exist
      try {
        const [personMappingsResult, storeMappingsResult] = await Promise.all([
          personNames.size > 0 ? getCanonicalNamesBatch(userId, Array.from(personNames), ['PERSON']) : Promise.resolve({} as Record<string, string>),
          storeNames.size > 0 ? getCanonicalNamesBatch(userId, Array.from(storeNames), ['STORE']) : Promise.resolve({} as Record<string, string>)
        ]);

        const personMappings: Record<string, string> = personMappingsResult || {};
        const storeMappings: Record<string, string> = storeMappingsResult || {};

        // Apply mappings in memory (no database queries)
        incomes = incomes.map((income: any) => {
          if (income.personName && personMappings[income.personName]) {
            income.personName = personMappings[income.personName];
          }
          if (income.store && storeMappings[income.store]) {
            income.store = storeMappings[income.store];
          }
          return income;
        });
      } catch (mappingError) {
        // Gracefully continue without mappings if table doesn't exist
        console.warn('⚠️ Entity mapping feature not available (table may not exist). Continuing without name mapping.', mappingError);
        // Incomes remain unchanged (original names kept)
      }
    }
    
    // Calculate total sum for verification
    const totalSum = incomes.reduce((sum: number, inc: any) => sum + parseFloat(inc.amount || 0), 0);
    console.log('📊 INCOME GET - Total sum of amounts:', totalSum);
    console.log('📊 INCOME GET - Sample incomes data (first 3):', JSON.stringify(incomes.slice(0, 3), null, 2));
    
    // Return paginated response with metadata
    const totalCount = transactionCount + incomeSourceCount;
    const response: any = {
      data: incomes,
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
    console.error('❌ INCOME GET - Error:', error);
    console.error('❌ INCOME GET - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to fetch incomes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('➕ INCOME POST - Starting request');
  try {
    const body = await request.json();
    console.log('➕ INCOME POST - Request body:', JSON.stringify(body, null, 2));
    
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

    console.log('➕ INCOME POST - Extracted data:', {
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
      console.log('❌ INCOME POST - Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('➕ INCOME POST - Creating income as Transaction in database...');
    // Create new income as Transaction record with INCOME category
    const newIncome = await (prisma as any).transaction.create({
      data: {
        userId: userId,
        transactionDate: new Date(date),
        description: title,
        creditAmount: parseFloat(amount),
        debitAmount: 0,
        financialCategory: 'INCOME',
        categoryId: null,
        notes: description || notes,
        store: store || null,
      }
    });
    
    // Transform to IncomeSource format for backward compatibility
    const transformedIncome = {
      id: newIncome.id,
      name: newIncome.description,
      amount: Number(newIncome.creditAmount),
      frequency: 'ONE_TIME',
      categoryId: newIncome.categoryId,
      startDate: newIncome.transactionDate,
      endDate: null,
      notes: newIncome.notes,
      isActive: true,
      userId: newIncome.userId,
      createdAt: newIncome.createdAt,
      updatedAt: newIncome.updatedAt,
      store: newIncome.store,
      creditAmount: Number(newIncome.creditAmount),
      debitAmount: 0,
      financialCategory: newIncome.financialCategory,
    };

    console.log('✅ INCOME POST - Successfully created income:', JSON.stringify(transformedIncome, null, 2));
    return NextResponse.json(transformedIncome);
  } catch (error) {
    console.error('❌ INCOME POST - Error:', error);
    console.error('❌ INCOME POST - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to create income' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  console.log('✏️ INCOME PUT - Starting request');
  try {
    const body = await request.json();
    console.log('✏️ INCOME PUT - Request body:', JSON.stringify(body, null, 2));
    
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

    console.log('✏️ INCOME PUT - Extracted data:', {
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
      console.log('❌ INCOME PUT - Missing required fields');
      return NextResponse.json({ error: 'Missing required fields (id, title, amount, userId)' }, { status: 400 });
    }

    console.log('✏️ INCOME PUT - Updating income in database...');
    // Update income in database using correct field mappings
    const updatedIncome = await (prisma as any).incomeSource.update({
      where: { id },
      data: {
        name: title, // Map title to name field
        amount: parseFloat(amount),
        frequency: 'ONE_TIME', // Default frequency
        startDate: new Date(date),
        notes: description || notes,
        userId: userId,
        categoryId: null // We'll handle categories later
      }
    });

    console.log('✅ INCOME PUT - Successfully updated income:', JSON.stringify(updatedIncome, null, 2));
    return NextResponse.json(updatedIncome);
  } catch (error) {
    console.error('❌ INCOME PUT - Error:', error);
    console.error('❌ INCOME PUT - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to update income' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ INCOME DELETE - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('🗑️ INCOME DELETE - ID to delete:', id);

    if (!id) {
      console.log('❌ INCOME DELETE - No ID provided');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('🗑️ INCOME DELETE - Deleting from database...');
    // Delete from database
    await (prisma as any).incomeSource.delete({
      where: { id }
    });

    console.log('✅ INCOME DELETE - Successfully deleted income');
    return NextResponse.json({ message: 'Income deleted successfully' });
  } catch (error) {
    console.error('❌ INCOME DELETE - Error:', error);
    console.error('❌ INCOME DELETE - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to delete income' }, { status: 500 });
  }
}
