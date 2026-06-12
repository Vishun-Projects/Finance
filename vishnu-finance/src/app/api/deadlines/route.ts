import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimitMiddleware, getRouteType } from '@/lib/rate-limit';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { withAuth } from '@/lib/api-auth';
import { rejectForeignUserId } from '@/lib/api-user-scope';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export const GET = withAuth(async (request, user) => {
  const routeType = getRouteType(request.nextUrl.pathname);
  const rateLimitResponse = await rateLimitMiddleware(routeType, request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const forbidden = rejectForeignUserId(user, searchParams.get('userId'));
    if (forbidden) return forbidden;

    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '100'), 200);
    const skip = (page - 1) * pageSize;
    const userId = user.id;

    const getTotalCount = page === 1 || searchParams.get('includeTotal') === 'true';
    const [totalCount, deadlines] = await Promise.all([
      getTotalCount
        ? (prisma as any).deadline.count({ where: { userId } })
        : Promise.resolve(0),
      (prisma as any).deadline.findMany({
        where: { userId },
        orderBy: { dueDate: 'asc' },
        skip,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data: deadlines,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNextPage: skip + pageSize < totalCount,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('DEADLINES GET - Error:', error);
    return NextResponse.json({ error: 'Failed to fetch deadlines' }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const forbidden = rejectForeignUserId(user, body.userId);
    if (forbidden) return forbidden;

    const { title, description, amount, dueDate, isRecurring, frequency, category, paymentMethod, accountDetails, notes } =
      body;

    if (!title || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
        userId: user.id,
        status: 'PENDING',
        isCompleted: false,
      },
    });

    invalidateUserAppData(user.id);
    return NextResponse.json(newDeadline);
  } catch (error) {
    console.error('DEADLINES POST - Error:', error);
    return NextResponse.json({ error: 'Failed to create deadline' }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { id, ...rawUpdate } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const owned = await (prisma as any).deadline.findFirst({ where: { id, userId: user.id } });
    if (!owned) {
      return NextResponse.json({ error: 'Deadline not found' }, { status: 404 });
    }

    const updatedDeadline = await (prisma as any).deadline.update({
      where: { id },
      data: {
        title: rawUpdate.title,
        description: rawUpdate.description,
        amount: rawUpdate.amount ? parseFloat(rawUpdate.amount) : undefined,
        dueDate: rawUpdate.dueDate ? new Date(rawUpdate.dueDate) : undefined,
        isRecurring: rawUpdate.isRecurring,
        frequency: rawUpdate.frequency ? rawUpdate.frequency.toUpperCase() : undefined,
        category: rawUpdate.category,
        paymentMethod: rawUpdate.paymentMethod,
        accountDetails: rawUpdate.accountDetails,
        notes: rawUpdate.notes,
        status: rawUpdate.status,
        isCompleted: rawUpdate.isCompleted,
        completedDate: rawUpdate.completedDate ? new Date(rawUpdate.completedDate) : undefined,
        updatedAt: new Date(),
      },
    });

    invalidateUserAppData(user.id);
    return NextResponse.json(updatedDeadline);
  } catch (error) {
    console.error('DEADLINES PATCH - Error:', error);
    return NextResponse.json({ error: 'Failed to update deadline' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const deleted = await (prisma as any).deadline.deleteMany({
      where: { id, userId: user.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Deadline not found' }, { status: 404 });
    }

    invalidateUserAppData(user.id);
    return NextResponse.json({ message: 'Deadline deleted successfully' });
  } catch (error) {
    console.error('DEADLINES DELETE - Error:', error);
    return NextResponse.json({ error: 'Failed to delete deadline' }, { status: 500 });
  }
});
