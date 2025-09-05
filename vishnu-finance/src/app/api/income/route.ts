import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(request: NextRequest) {
  console.log('🔍 INCOME GET - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('🔍 INCOME GET - User ID:', userId);

    if (!userId) {
      console.log('❌ INCOME GET - No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 INCOME GET - Fetching from database for user:', userId);
    // Fetch incomes from database using correct model name
    const incomes = await (prisma as any).incomeSource.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ INCOME GET - Found incomes:', incomes.length, 'records');
    console.log('📊 INCOME GET - Incomes data:', JSON.stringify(incomes, null, 2));
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
