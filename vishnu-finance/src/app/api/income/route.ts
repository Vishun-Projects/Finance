import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getCanonicalNamesBatch } from '../entity-mappings/route';
import { rateLimitMiddleware, getRouteType } from '../../../lib/rate-limit';

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-dynamic';
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

    // Fetch incomes (income sources) optionally date-scoped by startDate
    // IMPORTANT: Only fetch active income sources and ensure proper filtering
    // Using raw SQL because Prisma Client hasn't been regenerated for new bank fields
    const getTotalCount = page === 1 || searchParams.get('includeTotal') === 'true';
    const [totalCount, incomesResult] = await Promise.all([
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
          // Try Prisma query first (will work after regenerating Prisma Client)
          incomes = await (prisma as any).incomeSource.findMany({
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
            skip,
            take: pageSize // PERFORMANCE: Add limit
          });
      // Manually add bank fields from raw SQL since Prisma Client doesn't recognize them yet
      if (incomes.length > 0) {
        const ids = incomes.map((i: any) => i.id);
        const bankFields = await (prisma as any).$queryRawUnsafe(`
          SELECT id, bankCode, transactionId, accountNumber, transferType
          FROM income_sources
          WHERE id IN (${ids.map(() => '?').join(',')})
        `, ...ids);
        const bankMap = new Map(bankFields.map((bf: any) => [bf.id, bf]));
        incomes = incomes.map((inc: any) => {
          const bankData = bankMap.get(inc.id) || {};
          return {
            ...inc,
            ...bankData
          };
        });
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
    } catch (error: any) {
      // Use raw SQL fallback if Prisma validation fails (new fields not recognized)
      console.log('⚠️ INCOME GET - Using raw SQL fallback');
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
      
      incomes = await (prisma as any).$queryRawUnsafe(query, ...params);
      
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
    }
    return incomes;
  })(),
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
        console.warn('⚠️ Entity mapping feature not available (table may not exist). Continuing without name mapping.');
        // Incomes remain unchanged (original names kept)
      }
    }
    
    // Calculate total sum for verification
    const totalSum = incomes.reduce((sum: number, inc: any) => sum + parseFloat(inc.amount || 0), 0);
    console.log('📊 INCOME GET - Total sum of amounts:', totalSum);
    console.log('📊 INCOME GET - Sample incomes data (first 3):', JSON.stringify(incomes.slice(0, 3), null, 2));
    
    // Return paginated response with metadata
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

    console.log('➕ INCOME POST - Creating income in database...');
    // Create new income in database using correct field mappings
    const newIncome = await (prisma as any).incomeSource.create({
      data: {
        name: title, // Map title to name field
        amount: parseFloat(amount),
        frequency: 'ONE_TIME', // Default frequency
        startDate: new Date(date),
        notes: description || notes,
        // store: store || null, // Temporarily disabled - store info will go in notes
        userId: userId,
        categoryId: null // We'll handle categories later
      }
    });

    console.log('✅ INCOME POST - Successfully created income:', JSON.stringify(newIncome, null, 2));
    return NextResponse.json(newIncome);
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
