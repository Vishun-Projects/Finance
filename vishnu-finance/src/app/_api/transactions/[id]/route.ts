import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimitMiddleware, getRouteType } from '@/lib/rate-limit';
import { getCanonicalName } from '@/lib/entity-mapping-service';

export const dynamic = 'force-static';

/**
 * PUT /api/transactions/[id]
 * Update an existing transaction
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

    const { id: transactionId } = await params;
    const body = await request.json();

    // Verify transaction belongs to user
    const existing = await (prisma as any).transaction.findFirst({
      where: {
        id: transactionId,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Apply entity mappings if store/personName changed
    let finalStore = body.store;
    let finalPersonName = body.personName;

    if (body.store || body.personName) {
      try {
        if (body.store && body.store !== existing.store) {
          finalStore = await getCanonicalName(user.id, body.store, 'STORE');
        }
        if (body.personName && body.personName !== existing.personName) {
          finalPersonName = await getCanonicalName(user.id, body.personName, 'PERSON');
        }
      } catch (mappingError) {
        console.warn('⚠️ Entity mapping failed, using original values:', mappingError);
      }
    }

    // Build update data
    const updateData: any = {};

    if (body.description !== undefined) updateData.description = body.description;
    if (body.transactionDate !== undefined) updateData.transactionDate = new Date(body.transactionDate);
    if (body.creditAmount !== undefined) updateData.creditAmount = parseFloat(String(body.creditAmount)) || 0;
    if (body.debitAmount !== undefined) updateData.debitAmount = parseFloat(String(body.debitAmount)) || 0;
    if (body.financialCategory !== undefined) updateData.financialCategory = body.financialCategory.toUpperCase();
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.store !== undefined) updateData.store = finalStore || null;
    if (body.personName !== undefined) updateData.personName = finalPersonName || null;
    if (body.upiId !== undefined) updateData.upiId = body.upiId || null;
    if (body.receiptUrl !== undefined) updateData.receiptUrl = body.receiptUrl || null;
    if (body.bankCode !== undefined) updateData.bankCode = body.bankCode || null;
    if (body.transactionId !== undefined) updateData.transactionId = body.transactionId || null;
    if (body.accountNumber !== undefined) updateData.accountNumber = body.accountNumber || null;
    if (body.transferType !== undefined) updateData.transferType = body.transferType || null;
    if (body.branch !== undefined) updateData.branch = body.branch || null;
    if (body.rawData !== undefined) updateData.rawData = body.rawData || null;
    if (body.balance !== undefined) updateData.balance = body.balance ? parseFloat(String(body.balance)) : null;

    // Update transaction
    const updated = await (prisma as any).transaction.update({
      where: { id: transactionId },
      data: updateData,
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      ...updated,
      creditAmount: Number(updated.creditAmount),
      debitAmount: Number(updated.debitAmount),
      balance: updated.balance ? Number(updated.balance) : null,
      category: updated.category ? {
        id: updated.category.id,
        name: updated.category.name,
        type: updated.category.type,
        color: updated.category.color,
        icon: updated.category.icon,
      } : null,
    });
  } catch (error) {
    console.error('Error in transactions PUT:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/transactions/[id]
 * Soft delete a transaction
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

    const { id: transactionId } = await params;

    // Verify transaction belongs to user
    const existing = await (prisma as any).transaction.findFirst({
      where: {
        id: transactionId,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Soft delete
    const deleted = await (prisma as any).transaction.update({
      where: { id: transactionId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: deleted.id,
      isDeleted: true,
      deletedAt: deleted.deletedAt,
    });
  } catch (error) {
    console.error('Error in transactions DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
