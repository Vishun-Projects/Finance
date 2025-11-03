import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 120; // Revalidate every 2 minutes

export async function GET(request: NextRequest) {
  console.log('🔍 GOALS GET - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('🔍 GOALS GET - User ID:', userId);

    if (!userId) {
      console.log('❌ GOALS GET - No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 GOALS GET - Fetching from database for user:', userId);
    // Fetch goals from database
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ GOALS GET - Found goals:', goals.length, 'records');
    console.log('📊 GOALS GET - Goals data:', JSON.stringify(goals, null, 2));
    return NextResponse.json(goals);
  } catch (error) {
    console.error('❌ GOALS GET - Error:', error);
    console.error('❌ GOALS GET - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('➕ GOALS POST - Starting request');
  try {
    const body = await request.json();
    console.log('➕ GOALS POST - Request body:', JSON.stringify(body, null, 2));
    
    const {
      title,
      targetAmount,
      currentAmount,
      targetDate,
      priority,
      category,
      description,
      userId
    } = body;

    console.log('➕ GOALS POST - Extracted data:', {
      title,
      targetAmount,
      currentAmount,
      targetDate,
      priority,
      category,
      description,
      userId
    });

    // Validate required fields
    if (!title || !targetAmount || !userId) {
      console.log('❌ GOALS POST - Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('➕ GOALS POST - Creating goal in database...');
    // Create new goal in database
    const newGoal = await prisma.goal.create({
      data: {
        title,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount || '0'),
        targetDate: targetDate ? new Date(targetDate) : null,
        priority: priority || 'MEDIUM',
        category: category || null,
        description: description || null,
        userId: userId,
        isActive: true
      }
    });

    console.log('✅ GOALS POST - Successfully created goal:', JSON.stringify(newGoal, null, 2));
    return NextResponse.json(newGoal);
  } catch (error) {
    console.error('❌ GOALS POST - Error:', error);
    console.error('❌ GOALS POST - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  console.log('✏️ GOALS PUT - Starting request');
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    console.log('✏️ GOALS PUT - Update data:', JSON.stringify({ id, ...updateData }, null, 2));

    if (!id) {
      console.log('❌ GOALS PUT - No ID provided');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('✏️ GOALS PUT - Updating goal in database...');
    // Update goal in database
    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        ...updateData,
        targetAmount: updateData.targetAmount ? parseFloat(updateData.targetAmount) : undefined,
        currentAmount: updateData.currentAmount ? parseFloat(updateData.currentAmount) : undefined,
        targetDate: updateData.targetDate ? new Date(updateData.targetDate) : undefined,
        updatedAt: new Date()
      }
    });

    console.log('✅ GOALS PUT - Successfully updated goal:', JSON.stringify(updatedGoal, null, 2));
    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error('❌ GOALS PUT - Error:', error);
    console.error('❌ GOALS PUT - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ GOALS DELETE - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('🗑️ GOALS DELETE - ID to delete:', id);

    if (!id) {
      console.log('❌ GOALS DELETE - No ID provided');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('🗑️ GOALS DELETE - Deleting from database...');
    // Delete from database
    await prisma.goal.delete({
      where: { id }
    });

    console.log('✅ GOALS DELETE - Successfully deleted goal');
    return NextResponse.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('❌ GOALS DELETE - Error:', error);
    console.error('❌ GOALS DELETE - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
}
