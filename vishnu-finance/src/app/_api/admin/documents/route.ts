import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { Buffer } from 'buffer';
import { tmpdir } from 'os';
import { Prisma, type DocumentVisibility } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';

// Use /tmp for serverless environments (Vercel, AWS Lambda, etc.)
// Note: For production, consider using cloud storage (S3, etc.) for persistent file storage
// /tmp is ephemeral and files are automatically cleaned up after function execution
const ADMIN_UPLOAD_DIR = join(tmpdir(), 'admin-docs');

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

export async function GET(request: NextRequest) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const bankCode = searchParams.get('bankCode');
    const ownerId = searchParams.get('ownerId');
    const visibility = searchParams.get('visibility') as DocumentVisibility | null;
    const search = searchParams.get('search');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const documents = await prisma.document.findMany({
      where: {
        ...(bankCode ? { bankCode } : {}),
        ...(ownerId ? { ownerId } : {}),
        ...(visibility ? { visibility } : {}),
        ...(search ? { originalName: { contains: search } } : {}),
        ...(!includeDeleted ? { isDeleted: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { transactions: true },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        deletedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      documents: documents.map(transformDocument),
    });
  } catch (error) {
    console.error('Admin document listing failed:', error);
    return NextResponse.json(
      { error: 'Failed to load documents' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const ownerId = (formData.get('ownerId') as string | null) || null;
    const visibility =
      (formData.get('visibility') as string | null) || 'ORGANIZATION';
    const bankCode = (formData.get('bankCode') as string | null) || null;
    const sourceType =
      (formData.get('sourceType') as string | null) || 'PORTAL_RESOURCE';
    const notes = (formData.get('notes') as string | null) || null;

    const allowedVisibility = ['PRIVATE', 'ORGANIZATION', 'PUBLIC'];
    if (!allowedVisibility.includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility option' }, { status: 400 });
    }

    await mkdir(ADMIN_UPLOAD_DIR, { recursive: true });
    const filename = `${Date.now()}_${randomUUID()}_${file.name}`;
    await writeFile(join(ADMIN_UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));

    const document = await prisma.document.create({
      data: {
        ownerId,
        uploadedById: superuser.id,
        storageKey: ['uploads', 'admin-docs', filename].join('/'),
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size ?? null,
        visibility: visibility as any,
        sourceType: sourceType as any,
        bankCode,
        metadata: notes ? { notes } : Prisma.DbNull,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        deletedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const meta = extractRequestMeta(request);

    await writeAuditLog({
      actorId: superuser.id,
      event: 'DOCUMENT_UPLOAD',
      severity: 'INFO',
      targetUserId: ownerId ?? undefined,
      targetResource: `document:${document.id}`,
      metadata: {
        originalName: file.name,
        visibility,
        bankCode,
      },
      message: `Admin uploaded ${file.name}`,
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
    console.error('Admin document upload failed:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 },
    );
  }
}

