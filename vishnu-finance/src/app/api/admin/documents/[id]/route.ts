import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';

const requireSuperuser = async (request: NextRequest) => {
  const token = request.cookies.get('auth-token');
  if (!token) {
    return null;
  }
  const user = (await AuthService.getUserFromToken(token.value)) as any;
  if (!user || !user.isActive || user.role !== 'SUPERUSER') return null;
  return user;
};

const transformDocument = (doc: any) => ({
  id: doc.id,
  originalName: doc.originalName,
  mimeType: doc.mimeType,
  fileSize: doc.fileSize,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  deletedAt: doc.deletedAt,
  isDeleted: doc.isDeleted,
  visibility: doc.visibility,
  sourceType: doc.sourceType,
  ownerId: doc.ownerId,
  uploadedById: doc.uploadedById,
  deletedById: doc.deletedById,
  bankCode: doc.bankCode,
  parsedAt: doc.parsedAt,
  transactionCount: doc._count?.transactions ?? 0,
  owner: doc.owner
    ? {
        id: doc.owner.id,
        email: doc.owner.email,
        name: doc.owner.name,
      }
    : null,
  deletedBy: doc.deletedBy
    ? {
        id: doc.deletedBy.id,
        email: doc.deletedBy.email,
        name: doc.deletedBy.name,
      }
    : null,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
        deletedBy: {
          select: { id: true, email: true, name: true },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      document: transformDocument(document),
    });
  } catch (error) {
    console.error('Admin load document failed:', error);
    return NextResponse.json(
      { error: 'Failed to load document' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { ownerId, visibility, bankCode, sourceType, restore, restoreTransactions } = payload;

    if (restore) {
      const now = new Date();

      const result = await prisma.$transaction(async tx => {
        const { id } = await params;

        const restored = await tx.document.update({
          where: { id },
          data: {
            isDeleted: false,
            deletedAt: null,
            deletedById: null,
            updatedAt: now,
          },
          include: {
            owner: { select: { id: true, email: true, name: true } },
            deletedBy: { select: { id: true, email: true, name: true } },
            _count: { select: { transactions: true } },
          },
        });

        let restoredTransactions = 0;
        if (restoreTransactions) {
          const txRestore = await tx.transaction.updateMany({
            where: {
              documentId: id,
              isDeleted: true,
            },
            data: {
              isDeleted: false,
              deletedAt: null,
            },
          });
          restoredTransactions = txRestore.count;
        }

        return { restored, restoredTransactions };
      });

      const meta = extractRequestMeta(request);

      await writeAuditLog({
        actorId: superuser.id,
        event: 'DOCUMENT_STATUS_CHANGE',
        severity: result.restoredTransactions > 0 ? 'WARN' : 'INFO',
        targetUserId: result.restored.ownerId ?? result.restored.uploadedById,
        targetResource: `document:${result.restored.id}`,
        metadata: {
          restoredTransactions: result.restoredTransactions,
        },
        message: `Admin restored document ${result.restored.originalName}`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      return NextResponse.json({
        document: transformDocument(result.restored),
        restoredTransactions: result.restoredTransactions,
      });
    }

    const { id } = await params;

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ownerId: ownerId ?? null,
        visibility: visibility ?? undefined,
        bankCode: bankCode ?? null,
        sourceType: sourceType ?? undefined,
      },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
        deletedBy: {
          select: { id: true, email: true, name: true },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    const meta = extractRequestMeta(request);

    await writeAuditLog({
      actorId: superuser.id,
      event: 'DOCUMENT_STATUS_CHANGE',
      severity: 'INFO',
      targetUserId: updated.ownerId ?? updated.uploadedById,
      targetResource: `document:${updated.id}`,
      metadata: {
        ownerId,
        visibility,
        bankCode,
        sourceType,
      },
      message: `Admin updated document ${updated.originalName}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
      document: transformDocument(updated),
    });
  } catch (error) {
    console.error('Admin update document failed:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { mode } = await request.json().catch(() => ({ mode: 'document-only' }));
    const cascade = mode === 'document-and-transactions';

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let affected = 0;
    if (cascade) {
      const result = await prisma.transaction.updateMany({
        where: { documentId: document.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          receiptUrl: null,
        },
      });
      affected = result.count;
    } else {
      const result = await prisma.transaction.updateMany({
        where: { documentId: document.id },
        data: {
          receiptUrl: null,
        },
      });
      affected = result.count;
    }

    await prisma.document.update({
      where: { id: document.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: superuser.id,
      },
    });

    const meta = extractRequestMeta(request);

    await writeAuditLog({
      actorId: superuser.id,
      event: 'DOCUMENT_DELETE',
      severity: 'WARN',
      targetUserId: document.ownerId ?? document.uploadedById,
      targetResource: `document:${document.id}`,
      metadata: { originalName: document.originalName },
      message: `Admin soft-deleted document ${document.originalName}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
      success: true,
      mode: cascade ? 'document-and-transactions' : 'document-only',
      transactionsAffected: affected,
    });
  } catch (error) {
    console.error('Admin delete document failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 },
    );
  }
}

