import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { join } from 'path';
import { readFile, stat } from 'fs/promises';
import { prisma } from '@/lib/db';
import { supabase } from '@/lib/supabase';
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
        sourceType: true,
      },
    });

    if (!document || !canAccessDocument(user, document)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if it's a legacy local file
    if (document.storageKey.startsWith('uploads/') || document.storageKey.includes('\\')) {
      try {
        const filePath = join(process.cwd(), document.storageKey);
        await stat(filePath);
        const fileBuffer = await readFile(filePath);
        // ... existing buffer logic simplified or kep

        const headers = new Headers();
        headers.set('Content-Type', document.mimeType || 'application/octet-stream');
        headers.set(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(document.originalName)}"`,
        );
        return new NextResponse(new Uint8Array(fileBuffer), { status: 200, headers });
      } catch (e: any) {
        if (e.code === 'ENOENT') {
          return NextResponse.json({ error: 'File not found locally' }, { status: 404 });
        }
        throw e;
      }
    }

    // Supabase Download
    let bucketName = 'documents'; // fallback for generic docs

    // Priority: Explicit path prefix > Source Type
    if (document.storageKey.startsWith('super-docs/')) {
      bucketName = 'super-docs';
    } else if (document.storageKey.startsWith('user-docs/')) {
      bucketName = 'user-docs';
    } else if (document.storageKey.startsWith('admin-docs/')) {
      bucketName = 'admin-docs';
    } else if (document.storageKey.startsWith('bank-statements/')) {
      bucketName = 'bank-statements';
    } else {
      // No prefix in key, deduce from sourceType
      if (document.sourceType === 'BANK_STATEMENT') {
        bucketName = 'bank-statements';
      } else if (document.sourceType === 'PORTAL_RESOURCE') {
        bucketName = 'admin-docs';
      } else if (document.sourceType === 'USER_UPLOAD') {
        bucketName = 'user-docs';
      } else if (document.sourceType === 'SYSTEM' || (document as any).category) {
        // SuperDocs have category but typed locally as any... 
        // Better to rely on folder if possible.
        // If sourceType is null or other, assume 'documents' or 'super-docs' if generic?
        // Actually super documents usually have 'super-docs' bucket.
        bucketName = 'super-docs';
      }
    }

    // Cleanup key if it contains bucket prefix and we use .from(bucket) which might double it?
    // Supabase .from('bucket').download('path') expects 'path' relative to bucket.
    // If key is 'bucket/file', and we use .from('bucket'), we should strip prefix.
    // However, if we uploaded as 'file' to 'bucket', key is 'file'.
    // If we uploaded as 'bucket/file' to 'bucket', key is 'bucket/file'.
    // Our upload logic usually puts it at root of bucket.

    // BUT checking for 'bucket/' prefix:
    // If key has 'super-docs/foo', we strip it if we use 'super-docs' bucket.
    let downloadPath = document.storageKey;
    if (downloadPath.startsWith(bucketName + '/')) {
      downloadPath = downloadPath.substring(bucketName.length + 1);
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(downloadPath, 3600); // 1 hour expiry

    if (error || !data) {
      console.error('Failed to generate Supabase signed URL:', error);
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    const meta = extractRequestMeta(request);

    await writeAuditLog({
      actorId: user.id,
      event: 'DOCUMENT_DOWNLOAD',
      severity: document.isDeleted ? 'WARN' : 'INFO',
      targetUserId: document.ownerId ?? document.uploadedById,
      targetResource: `document:${document.id}`,
      metadata: { originalName: document.originalName, isDeleted: document.isDeleted, provider: 'supabase' },
      message: `${user.email} downloaded ${document.originalName} via Supabase`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.redirect(data.signedUrl);

  } catch (error: any) {
    console.error('Failed to download document:', error);
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 },
    );
  }
}

