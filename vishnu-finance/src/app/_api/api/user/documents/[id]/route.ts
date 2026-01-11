import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';

const transformDocument = (doc: any) => ({
  id: doc.id,
  originalName: doc.originalName,
  mimeType: doc.mimeType,
  fileSize: doc.fileSize,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  visibility: doc.visibility,
  sourceType: doc.sourceType,
  ownerId: doc.ownerId,
  uploadedById: doc.uploadedById,
  bankCode: doc.bankCode,
  parsedAt: doc.parsedAt,
  transactionCount: doc._count?.transactions ?? 0,
  isDeleted: doc.isDeleted,
  deletedAt: doc.deletedAt,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authToken = request.cookies.get('auth-token');
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (
      !document ||
      document.isDeleted ||
      (document.ownerId && document.ownerId !== user.id) ||
      (!document.ownerId && document.uploadedById !== user.id)
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ document: transformDocument(document) });
  } catch (error) {
    console.error('Failed to load document metadata:', error);
    return NextResponse.json(
      { error: 'Failed to load document' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authToken = request.cookies.get('auth-token');
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mode } = await request.json().catch(() => ({ mode: 'document-only' }));
    const cascade = mode === 'document-and-transactions';

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const isOwner =
      document.ownerId === user.id ||
      (!document.ownerId && document.uploadedById === user.id);

    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    let affected = 0;

    await prisma.$transaction(async tx => {
      const updateData: any = {
        isDeleted: true,
        deletedAt: now,
        deletedById: user.id,
      };

      await tx.document.update({
        where: { id: document.id },
        data: updateData,
      });

      if (cascade) {
        const result = await tx.transaction.updateMany({
          where: {
            userId: user.id,
            documentId: document.id,
          },
          data: {
            isDeleted: true,
            deletedAt: now,
            receiptUrl: null,
          },
        });
        affected = result.count;
      } else {
        const result = await tx.transaction.updateMany({
          where: {
            userId: user.id,
            documentId: document.id,
          },
          data: {
            receiptUrl: null,
          },
        });
        affected = result.count;
      }
    });

    const meta = extractRequestMeta(request);

    await writeAuditLog({
      actorId: user.id,
      event: cascade ? 'DOCUMENT_STATUS_CHANGE' : 'DOCUMENT_DELETE',
      severity: cascade ? 'WARN' : 'INFO',
      targetUserId: document.ownerId ?? document.uploadedById,
      targetResource: `document:${document.id}`,
      metadata: {
        mode: cascade ? 'document-and-transactions' : 'document-only',
        transactionsAffected: affected,
        originalName: document.originalName,
      },
      message: `${user.email} soft-deleted ${document.originalName}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
      success: true,
      mode: cascade ? 'document-and-transactions' : 'document-only',
      transactionsAffected: affected,
    });
  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 },
    );
  }
}

