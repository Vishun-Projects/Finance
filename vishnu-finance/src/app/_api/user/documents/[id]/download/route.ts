import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile, stat } from 'fs/promises';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';

const canAccessDocument = (user: any, document: any) => {
  if (!user?.isActive) return false;
  if (document.isDeleted && user.role !== 'SUPERUSER') return false;
  if (user.role === 'SUPERUSER') return true;
  if (document.ownerId === user.id || document.uploadedById === user.id) return true;
  return document.visibility !== 'PRIVATE';
};

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
      select: {
        id: true,
        ownerId: true,
        uploadedById: true,
        visibility: true,
        storageKey: true,
        originalName: true,
        mimeType: true,
        isDeleted: true,
      },
    });

    if (!document || !canAccessDocument(user, document)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const filePath = join(process.cwd(), document.storageKey);
    await stat(filePath);
    const fileBuffer = await readFile(filePath);
    const fileBytes = Buffer.isBuffer(fileBuffer)
      ? new Uint8Array(fileBuffer)
      : new Uint8Array(fileBuffer);
    const arrayBuffer = fileBytes.buffer.slice(
      fileBytes.byteOffset,
      fileBytes.byteOffset + fileBytes.byteLength,
    );

    const meta = extractRequestMeta(request);

    await writeAuditLog({
      actorId: user.id,
      event: 'DOCUMENT_DOWNLOAD',
      severity: document.isDeleted ? 'WARN' : 'INFO',
      targetUserId: document.ownerId ?? document.uploadedById,
      targetResource: `document:${document.id}`,
      metadata: { originalName: document.originalName, isDeleted: document.isDeleted },
      message: `${user.email} downloaded ${document.originalName}${document.isDeleted ? ' (soft-deleted)' : ''}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    const headers = new Headers();
    headers.set('Content-Type', document.mimeType || 'application/octet-stream');
    headers.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(document.originalName)}"`,
    );

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json(
        { error: 'File not found or has been removed' },
        { status: 404 },
      );
    }
    console.error('Failed to download document:', error);
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 },
    );
  }
}

