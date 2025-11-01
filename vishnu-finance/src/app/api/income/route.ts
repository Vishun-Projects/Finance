import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 300; // Revalidate every 5 minutes (income sources change less frequently)

export async function GET(request: NextRequest) {
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

    // Fetch incomes (income sources) optionally date-scoped by startDate
    // IMPORTANT: Only fetch active income sources and ensure proper filtering
    let incomes: any[] = [];
    try {
      incomes = await (prisma as any).incomeSource.findMany({
        where: {
          userId,
          isActive: true, // Only active income sources
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
          rawData: true,
          accountNumber: true,
          bankCode: true,
          transactionId: true,
          transferType: true,
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true
            }
          }
        },
        orderBy: { startDate: 'desc' }
      });
      
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
      if (error.code === 'P2022' || error.message?.includes('does not exist')) {
        // Column doesn't exist, fetch using raw SQL query
        console.log('⚠️ INCOME GET - Some columns missing, using raw SQL fallback');
        const params = [userId];
        let query = `
          SELECT id, name, amount, frequency, categoryId, startDate, endDate, 
                 notes, isActive, userId, createdAt, updatedAt`;
        
        // Try to include optional columns
        try {
          query += `, COALESCE(store, '') as store,
                     COALESCE(upiId, '') as upiId,
                     COALESCE(branch, '') as branch,
                     COALESCE(personName, '') as personName,
                     COALESCE(rawData, '') as rawData`;
        } catch {
          // If columns don't exist, just skip them
        }
        
        query += ` FROM income_sources WHERE userId = ?`;
        
        if (dateFilter) {
          query += ` AND startDate >= ? AND startDate <= ?`;
          params.push(new Date(dateFilter.gte));
          params.push(new Date(dateFilter.lte));
        }
        
        query += ` ORDER BY startDate DESC`;
        
        incomes = await (prisma as any).$queryRawUnsafe(query, ...params);
      } else {
        throw error;
      }
    }

    console.log('✅ INCOME GET - Found incomes:', incomes.length, 'records');
    
    // Calculate total sum for verification
    const totalSum = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
    console.log('📊 INCOME GET - Total sum of amounts:', totalSum);
    console.log('📊 INCOME GET - Sample incomes data (first 3):', JSON.stringify(incomes.slice(0, 3), null, 2));
    
    return NextResponse.json(incomes);
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
