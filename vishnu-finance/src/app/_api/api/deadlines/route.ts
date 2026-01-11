import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
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

  console.log('🔍 DEADLINES GET - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // PERFORMANCE: Add pagination support
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '100'), 200); // Max 200 per page
    const skip = (page - 1) * pageSize;

    console.log('🔍 DEADLINES GET - User ID:', userId, 'Page:', page, 'PageSize:', pageSize);

    if (!userId) {
      console.log('❌ DEADLINES GET - No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 DEADLINES GET - Fetching from database for user:', userId);

    // PERFORMANCE: Get total count for pagination (only if needed)
    const getTotalCount = page === 1 || searchParams.get('includeTotal') === 'true';
    const [totalCount, deadlines] = await Promise.all([
      getTotalCount ? (prisma as any).deadline.count({
        where: { userId }
      }) : Promise.resolve(0),
      // Fetch deadlines from database with pagination
      (prisma as any).deadline.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          description: true,
          amount: true,
          dueDate: true,
          isRecurring: true,
          frequency: true,
          status: true,
          category: true,
          isCompleted: true,
          completedDate: true,
          paymentMethod: true,
          accountDetails: true,
          notes: true,
          userId: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: pageSize // PERFORMANCE: Add limit
      })
    ]);

    console.log('✅ DEADLINES GET - Found deadlines:', deadlines.length, 'records');

    // Return paginated response with metadata
    const response: any = {
      data: deadlines,
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
