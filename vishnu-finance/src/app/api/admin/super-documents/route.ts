import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { Buffer } from 'buffer';
import { tmpdir } from 'os';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';
import { processSuperDocument } from '@/lib/document-processor';
import type { SuperDocumentCategory } from '@prisma/client';

// Use /tmp for serverless environments (Vercel, AWS Lambda, etc.)
// Note: For production, consider using cloud storage (S3, etc.) for persistent file storage
// /tmp is ephemeral and files are automatically cleaned up after function execution
const SUPER_DOCS_UPLOAD_DIR = join(tmpdir(), 'super-docs');

const requireSuperuser = async (request: NextRequest) => {
  const token = request.cookies.get('auth-token');
  if (!token) {
    return null;
  }
  const user = (await AuthService.getUserFromToken(token.value)) as any;
  if (!user || !user.isActive || user.role !== 'SUPERUSER') return null;
  return user;
};

export async function GET(request: NextRequest) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as SuperDocumentCategory | null;
    const search = searchParams.get('search');

    const documents = await prisma.superDocument.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(search ? { 
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ]
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        visibility: doc.visibility,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        uploadedBy: doc.uploadedBy,
      })),
    });
  } catch (error) {
    console.error('Super document listing failed:', error);
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

    // Validate PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as SuperDocumentCategory | null;
    const visibility = (formData.get('visibility') as string | null) || 'PUBLIC';

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    const allowedCategories: SuperDocumentCategory[] = [
      'INCOME_TAX',
      'INVESTMENT',
      'INSURANCE',
      'RETIREMENT',
      'DEBT_MANAGEMENT',
      'BUDGETING',
      'SAVINGS',
      'OTHER',
    ];

    if (!allowedCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    await mkdir(SUPER_DOCS_UPLOAD_DIR, { recursive: true });
    const filename = `${Date.now()}_${randomUUID()}_${file.name}`;
    await writeFile(join(SUPER_DOCS_UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));

    const document = await prisma.superDocument.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        category,
        storageKey: ['uploads', 'super-docs', filename].join('/'),
        originalName: file.name,
        mimeType: file.type || 'application/pdf',
        fileSize: file.size ?? null,
        uploadedById: superuser.id,
        visibility: visibility as any,
      },
      include: {
        uploadedBy: {
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
      event: 'SUPER_DOCUMENT_UPLOAD',
      severity: 'INFO',
      targetResource: `super-document:${document.id}`,
      metadata: {
        title: document.title,
        category: document.category,
        originalName: file.name,
      },
      message: `Super user uploaded ${file.name}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    // Process document asynchronously (extract text)
    processSuperDocument(document.id).catch((error) => {
      console.error('Error processing super document:', error);
      // Don't fail the upload if processing fails
    });

    return NextResponse.json(
      {
        document: {
          id: document.id,
          title: document.title,
          description: document.description,
          category: document.category,
          originalName: document.originalName,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          visibility: document.visibility,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          uploadedBy: document.uploadedBy,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Super document upload failed:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 },
    );
  }
}

