import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
export const dynamic = 'force-dynamic';
import { unlink } from 'fs/promises';
import { prisma } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';
import type { SuperDocumentCategory } from '@prisma/client';

const requireSuperuser = async (request: NextRequest) => {
  const token = request.cookies.get('auth-token');
  if (!token) {
    return null;
  }
  const user = (await AuthService.getUserFromToken(token.value)) as any;
  if (!user || !user.isActive || user.role !== 'SUPERUSER') return null;
  return user;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const document = await prisma.superDocument.findUnique({
      where: { id },
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

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        description: document.description,
        category: document.category,
        originalName: document.originalName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        visibility: document.visibility,
        storageKey: document.storageKey,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        uploadedBy: document.uploadedBy,
      },
    });
  } catch (error) {
    console.error('Super document fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, category, visibility } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) {
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
      updateData.category = category;
    }
    if (visibility !== undefined) updateData.visibility = visibility;

    const document = await prisma.superDocument.update({
      where: { id },
      data: updateData,
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
      event: 'SUPER_DOCUMENT_UPDATE',
      severity: 'INFO',
      targetResource: `super-document:${document.id}`,
      metadata: { updates: Object.keys(updateData) },
      message: `Super user updated ${document.title}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Super document update failed:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const document = await prisma.superDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file
    try {
      if (document.storageKey.startsWith('uploads/') || document.storageKey.includes('\\')) {
        // Legacy local file
        const filePath = join(process.cwd(), document.storageKey);
        await unlink(filePath);
      } else {
        // Supabase file
        const { error } = await supabase.storage.from('super-docs').remove([document.storageKey]);
        if (error) {
          console.warn('Failed to delete file from Supabase:', error);
        }
      }
    } catch (fileError) {
      console.warn('Failed to delete file:', fileError);
      // Continue with database deletion
    }

    await prisma.superDocument.delete({
      where: { id },
    });

    const meta = extractRequestMeta(request);
    await writeAuditLog({
      actorId: superuser.id,
      event: 'SUPER_DOCUMENT_DELETE',
      severity: 'INFO',
      targetResource: `super-document:${id}`,
      metadata: {
        title: document.title,
        originalName: document.originalName,
      },
      message: `Super user deleted ${document.title}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Super document deletion failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 },
    );
  }
}

