import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { rateLimitMiddleware, getRouteType } from '../../../lib/rate-limit';

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every minute

export async function GET(request: NextRequest) {
  // Rate limiting
  const routeType = getRouteType(request.nextUrl.pathname);
  const rateLimitResponse = await rateLimitMiddleware(routeType, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // PERFORMANCE: Add pagination support
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '100'), 200); // Max 200 per page
    const skip = (page - 1) * pageSize;
    

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    
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
  try {
    const body = await request.json();
    
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

    // Validate required fields
    if (!title || !dueDate || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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

    return NextResponse.json(newDeadline);
  } catch (error) {
    console.error('❌ DEADLINES POST - Error:', error);
    console.error('❌ DEADLINES POST - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to create deadline' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

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

    return NextResponse.json(updatedDeadline);
  } catch (error) {
    console.error('❌ DEADLINES PATCH - Error:', error);
    console.error('❌ DEADLINES PATCH - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to update deadline' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Delete from database
    await (prisma as any).deadline.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Deadline deleted successfully' });
  } catch (error) {
    console.error('❌ DEADLINES DELETE - Error:', error);
    console.error('❌ DEADLINES DELETE - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to delete deadline' }, { status: 500 });
  }
}
