import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every minute

export async function GET(request: NextRequest) {
  console.log('🔍 DEADLINES GET - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('🔍 DEADLINES GET - User ID:', userId);

    if (!userId) {
      console.log('❌ DEADLINES GET - No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 DEADLINES GET - Fetching from database for user:', userId);
    // Fetch deadlines from database
    const deadlines = await (prisma as any).deadline.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' }
    });

    console.log('✅ DEADLINES GET - Found deadlines:', deadlines.length, 'records');
    console.log('📊 DEADLINES GET - Deadlines data:', JSON.stringify(deadlines, null, 2));
    return NextResponse.json(deadlines);
  } catch (error) {
    console.error('❌ DEADLINES GET - Error:', error);
    console.error('❌ DEADLINES GET - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to fetch deadlines' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('➕ DEADLINES POST - Starting request');
  try {
    const body = await request.json();
    console.log('➕ DEADLINES POST - Request body:', JSON.stringify(body, null, 2));
    
    const {
      title,
      description,
      amount,
      dueDate,
      isRecurring,
      frequency,
      category,
      paymentMethod,
      accountDetails,
      notes,
      userId
    } = body;

    console.log('➕ DEADLINES POST - Extracted data:', {
      title,
      description,
      amount,
      dueDate,
      isRecurring,
      frequency,
      category,
      paymentMethod,
      accountDetails,
      notes,
      userId
    });

    // Validate required fields
    if (!title || !dueDate || !userId) {
      console.log('❌ DEADLINES POST - Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('➕ DEADLINES POST - Creating deadline in database...');
    // Create new deadline in database
    const newDeadline = await (prisma as any).deadline.create({
      data: {
        title,
        description: description || null,
        amount: amount ? parseFloat(amount) : null,
        dueDate: new Date(dueDate),
        isRecurring: isRecurring || false,
        frequency: frequency ? frequency.toUpperCase() : null,
        category: category || null,
        paymentMethod: paymentMethod || null,
        accountDetails: accountDetails || null,
        notes: notes || null,
        userId: userId,
        status: 'PENDING',
        isCompleted: false
      }
    });

    console.log('✅ DEADLINES POST - Successfully created deadline:', JSON.stringify(newDeadline, null, 2));
    return NextResponse.json(newDeadline);
  } catch (error) {
    console.error('❌ DEADLINES POST - Error:', error);
    console.error('❌ DEADLINES POST - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to create deadline' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  console.log('✏️ DEADLINES PATCH - Starting request');
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    console.log('✏️ DEADLINES PATCH - Update data:', JSON.stringify({ id, ...updateData }, null, 2));

    if (!id) {
      console.log('❌ DEADLINES PATCH - No ID provided');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('✏️ DEADLINES PATCH - Updating deadline in database...');
    // Update deadline in database
    const updatedDeadline = await (prisma as any).deadline.update({
      where: { id },
      data: {
        ...updateData,
        amount: updateData.amount ? parseFloat(updateData.amount) : undefined,
        dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
        frequency: updateData.frequency ? updateData.frequency.toUpperCase() : undefined,
        updatedAt: new Date()
      }
    });

    console.log('✅ DEADLINES PATCH - Successfully updated deadline:', JSON.stringify(updatedDeadline, null, 2));
    return NextResponse.json(updatedDeadline);
  } catch (error) {
    console.error('❌ DEADLINES PATCH - Error:', error);
    console.error('❌ DEADLINES PATCH - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to update deadline' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ DEADLINES DELETE - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('🗑️ DEADLINES DELETE - ID to delete:', id);

    if (!id) {
      console.log('❌ DEADLINES DELETE - No ID provided');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('🗑️ DEADLINES DELETE - Deleting from database...');
    // Delete from database
    await (prisma as any).deadline.delete({
      where: { id }
    });

    console.log('✅ DEADLINES DELETE - Successfully deleted deadline');
    return NextResponse.json({ message: 'Deadline deleted successfully' });
  } catch (error) {
    console.error('❌ DEADLINES DELETE - Error:', error);
    console.error('❌ DEADLINES DELETE - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to delete deadline' }, { status: 500 });
  }
}
