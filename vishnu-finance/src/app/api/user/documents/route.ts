import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { Buffer } from 'buffer';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'user-docs');

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
});

export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token');
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includePortalDocs = searchParams.get('includePortal') !== 'false';
    const bankCodeFilter = searchParams.get('bankCode');
    const visibility = searchParams.get('visibility');

    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          ...(includePortalDocs
            ? [{ visibility: { in: ['ORGANIZATION', 'PUBLIC'] } }]
            : []),
        ],
        isDeleted: false,
        ...(bankCodeFilter ? { bankCode: bankCodeFilter } : {}),
        ...(visibility ? { visibility } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    return NextResponse.json({
      documents: documents.map(transformDocument),
    });
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token');
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const visibility = (formData.get('visibility') as string | null) || 'PRIVATE';
    const allowedVisibility = ['PRIVATE', 'ORGANIZATION', 'PUBLIC'];
    if (!allowedVisibility.includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility option' }, { status: 400 });
    }

    const filename = `${Date.now()}_${randomUUID()}_${file.name}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(join(UPLOAD_DIR, filename), Buffer.from(bytes));

    const document = await prisma.document.create({
      data: {
        ownerId: user.id,
        uploadedById: user.id,
        storageKey: ['uploads', 'user-docs', filename].join('/'),
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size ?? null,
        visibility: visibility as any,
        sourceType: 'USER_UPLOAD',
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    const meta = extractRequestMeta(request);

    await writeAuditLog({
      actorId: user.id,
      event: 'DOCUMENT_UPLOAD',
      targetUserId: user.id,
      targetResource: `document:${document.id}`,
      metadata: {
        originalName: file.name,
        visibility,
      },
      message: `${user.email} uploaded ${file.name}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json(
      {
        document: transformDocument(document),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to upload document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 },
    );
  }
}

