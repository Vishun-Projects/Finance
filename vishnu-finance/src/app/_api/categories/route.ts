import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimitMiddleware, getRouteType } from '@/lib/rate-limit';

export const dynamic = 'force-static';
export const revalidate = 300; // Revalidate every 5 minutes

/**
 * GET /api/categories
 * Fetch categories for the authenticated user
 * Query params:
 *   - type: 'INCOME' | 'EXPENSE' (optional filter)
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const routeType = getRouteType(request.nextUrl.pathname);
  const rateLimitResponse = rateLimitMiddleware(routeType, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token');

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from token
    const user = await AuthService.getUserFromToken(authToken.value);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized or account deactivated' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'INCOME' | 'EXPENSE' | null;

    // Build where clause
    const where: any = {
      OR: [
        { userId: user.id },
        { isDefault: true }, // Include default categories
      ],
    };

    // Filter by type if specified
    if (type) {
      where.type = type;
    }

    // Fetch categories
    const categories = await prisma.category.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' }, // Default categories first
        { name: 'asc' },
      ],
    });

    // Transform to API response format
    const transformedCategories = categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      color: c.color || '#3B82F6',
      icon: c.icon || null,
      isDefault: c.isDefault,
      userId: c.userId,
    }));

    return NextResponse.json(transformedCategories);
  } catch (error) {
    console.error('Error in categories GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, type, color, icon } = body;

    // Validation
    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return NextResponse.json({ error: 'Type must be INCOME or EXPENSE' }, { status: 400 });
    }

    // Check if category with same name and type already exists for this user
    const existingCategory = await prisma.category.findFirst({
      where: {
        name,
        type,
        userId: user.id,
      },
    });

    if (existingCategory) {
      return NextResponse.json({ error: 'Category with this name and type already exists' }, { status: 400 });
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name,
        type,
        color: color || '#3B82F6',
        icon: icon || null,
        isDefault: false,
        userId: user.id,
      },
    });

    return NextResponse.json({
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color || '#3B82F6',
      icon: category.icon,
      isDefault: category.isDefault,
      userId: category.userId,
    });
  } catch (error) {
    console.error('Error in categories POST:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
