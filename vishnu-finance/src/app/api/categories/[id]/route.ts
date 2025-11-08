import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimitMiddleware, getRouteType } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

/**
 * PUT /api/categories/[id]
 * Update a category
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const routeType = getRouteType(request.nextUrl.pathname);
  const rateLimitResponse = rateLimitMiddleware(routeType, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const authToken = request.cookies.get('auth-token');
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized or account deactivated' }, { status: 401 });
    }

    const { id: categoryId } = await params;
    const body = await request.json();
    const { name, color, icon } = body;

    // Find category
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if user owns this category or if it's a default category
    if (category.isDefault) {
      return NextResponse.json({ error: 'Cannot modify default categories' }, { status: 403 });
    }

    if (category.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(icon !== undefined && { icon }),
      },
    });

    return NextResponse.json({
      id: updatedCategory.id,
      name: updatedCategory.name,
      type: updatedCategory.type,
      color: updatedCategory.color || '#3B82F6',
      icon: updatedCategory.icon,
      isDefault: updatedCategory.isDefault,
      userId: updatedCategory.userId,
    });
  } catch (error) {
    console.error('Error in categories PUT:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[id]
 * Delete a category
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const routeType = getRouteType(request.nextUrl.pathname);
  const rateLimitResponse = rateLimitMiddleware(routeType, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const authToken = request.cookies.get('auth-token');
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized or account deactivated' }, { status: 401 });
    }

    const { id: categoryId } = await params;

    // Find category
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if user owns this category or if it's a default category
    if (category.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default categories' }, { status: 403 });
    }

    if (category.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if category is being used by any transactions
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: categoryId },
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category. It is being used by ${transactionCount} transaction(s). Please reassign those transactions first.` },
        { status: 400 }
      );
    }

    // Delete category
    await prisma.category.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in categories DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

