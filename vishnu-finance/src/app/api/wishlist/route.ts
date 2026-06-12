import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimitMiddleware, getRouteType } from '@/lib/rate-limit';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import { withAuth } from '@/lib/api-auth';
import { rejectForeignUserId } from '@/lib/api-user-scope';

export const dynamic = 'force-dynamic';
export const revalidate = 180;

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
    const [totalCount, wishlistItems] = await Promise.all([
      getTotalCount
        ? (prisma as any).wishlistItem.count({ where: { userId } })
        : Promise.resolve(0),
      (prisma as any).wishlistItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const processedItems = wishlistItems.map((item: { tags?: string | null }) => ({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : [],
    }));

    return NextResponse.json({
      data: processedItems,
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
    console.error('WISHLIST GET - Error:', error);
    return NextResponse.json({ error: 'Failed to fetch wishlist items' }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const forbidden = rejectForeignUserId(user, body.userId);
    if (forbidden) return forbidden;

    const { title, description, estimatedCost, priority, category, targetDate, notes, tags } = body;

    if (!title || !estimatedCost) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newWishlistItem = await (prisma as any).wishlistItem.create({
      data: {
        title,
        description: description || null,
        estimatedCost: parseFloat(estimatedCost),
        priority: priority || 'MEDIUM',
        category: category || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        notes: notes || null,
        tags: tags ? JSON.stringify(tags) : null,
        userId: user.id,
        isCompleted: false,
      },
    });

    const { addImageGenerationJob, triggerImmediateProcessing } = await import('@/lib/services/image-queue');
    const { ImageJobType } = await import('@prisma/client');
    await addImageGenerationJob(newWishlistItem.id, ImageJobType.WISHLIST_ITEM, title);
    triggerImmediateProcessing();

    invalidateUserAppData(user.id);
    return NextResponse.json(newWishlistItem);
  } catch (error) {
    console.error('WISHLIST POST - Error:', error);
    return NextResponse.json({ error: 'Failed to create wishlist item' }, { status: 500 });
  }
});

export const PUT = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { id, ...rawUpdate } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const owned = await (prisma as any).wishlistItem.findFirst({ where: { id, userId: user.id } });
    if (!owned) {
      return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 });
    }

    const updatedWishlistItem = await (prisma as any).wishlistItem.update({
      where: { id },
      data: {
        title: rawUpdate.title,
        description: rawUpdate.description,
        estimatedCost: rawUpdate.estimatedCost ? parseFloat(rawUpdate.estimatedCost) : undefined,
        priority: rawUpdate.priority,
        category: rawUpdate.category,
        targetDate: rawUpdate.targetDate ? new Date(rawUpdate.targetDate) : undefined,
        notes: rawUpdate.notes,
        tags: rawUpdate.tags ? JSON.stringify(rawUpdate.tags) : undefined,
        isCompleted: rawUpdate.isCompleted,
        completedDate: rawUpdate.completedDate ? new Date(rawUpdate.completedDate) : undefined,
        updatedAt: new Date(),
      },
    });

    const { addImageGenerationJob, triggerImmediateProcessing } = await import('@/lib/services/image-queue');
    const { ImageJobType } = await import('@prisma/client');
    await addImageGenerationJob(updatedWishlistItem.id, ImageJobType.WISHLIST_ITEM, updatedWishlistItem.title);
    triggerImmediateProcessing();

    invalidateUserAppData(user.id);
    return NextResponse.json(updatedWishlistItem);
  } catch (error) {
    console.error('WISHLIST PUT - Error:', error);
    return NextResponse.json({ error: 'Failed to update wishlist item' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const deleted = await (prisma as any).wishlistItem.deleteMany({
      where: { id, userId: user.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 });
    }

    invalidateUserAppData(user.id);
    return NextResponse.json({ message: 'Wishlist item deleted successfully' });
  } catch (error) {
    console.error('WISHLIST DELETE - Error:', error);
    return NextResponse.json({ error: 'Failed to delete wishlist item' }, { status: 500 });
  }
});
