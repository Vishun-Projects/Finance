import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every minute

export async function GET(request: NextRequest) {
  console.log('🔍 EXPENSES GET - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    console.log('🔍 EXPENSES GET - User ID:', userId);

    if (!userId) {
      console.log('❌ EXPENSES GET - No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 EXPENSES GET - Fetching from database for user:', userId);
    const dateFilter = start && end ? {
      gte: new Date(start),
      lte: new Date(new Date(end).setHours(23,59,59,999))
    } : undefined;

    // Fetch expenses from database (optionally date-scoped)
    // Try Prisma query first, fallback to raw SQL if columns are missing
    let expenses: any[] = [];
    try {
      expenses = await (prisma as any).expense.findMany({
        where: {
          userId,
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
        orderBy: { date: 'desc' }
      });
    } catch (error: any) {
      if (error.code === 'P2022' || error.message?.includes('does not exist')) {
        // Column doesn't exist, fetch using raw SQL query
        console.log('⚠️ EXPENSES GET - Some columns missing, using raw SQL fallback');
        const params = [userId];
        let query = `
          SELECT id, amount, description, date, categoryId, isRecurring, frequency,
                 notes, receiptUrl, userId, createdAt, updatedAt`;
        
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
        
        query += ` FROM expenses WHERE userId = ?`;
        
        if (dateFilter) {
          query += ` AND date >= ? AND date <= ?`;
          params.push(new Date(dateFilter.gte));
          params.push(new Date(dateFilter.lte));
        }
        
        query += ` ORDER BY date DESC`;
        
        expenses = await (prisma as any).$queryRawUnsafe(query, ...params);
      } else {
        throw error;
      }
    }

    console.log('✅ EXPENSES GET - Found expenses:', expenses.length, 'records');
    console.log('📊 EXPENSES GET - Expenses data:', JSON.stringify(expenses, null, 2));
    return NextResponse.json(expenses);
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

    console.log('➕ EXPENSES POST - Creating expense in database...');
    // Create new expense in database using correct field mappings
    const newExpense = await (prisma as any).expense.create({
      data: {
        amount: parseFloat(amount),
        description: title, // Map title to description field
        date: new Date(date),
        notes: description || notes,
        // store: store || null, // Temporarily disabled - store info will go in notes
        isRecurring: false,
        userId: userId,
        categoryId: null // We'll handle categories later
      }
    });

    console.log('✅ EXPENSES POST - Successfully created expense:', JSON.stringify(newExpense, null, 2));
    return NextResponse.json(newExpense);
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
