import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { prisma } from '@/lib/db';

const PUBLIC_UPLOAD_PREFIXES = ['education/', 'daily-briefing/'];
const USER_MEDIA_PREFIX = 'user-media/';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }
  try {
    const { path: pathArray } = await params;
    const relativePath = pathArray.join('/');

    const uploadsDir = join(process.cwd(), 'uploads');
    const resolvedPath = join(uploadsDir, ...pathArray);

    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Unauthorized path traversal detected' }, { status: 403 });
    }

    const userPrefix = `user-docs/${user.id}/`;
    const userMediaPrefix = `${USER_MEDIA_PREFIX}${user.id}/`;
    const isPublic = PUBLIC_UPLOAD_PREFIXES.some((p) => relativePath.startsWith(p));
    const isOwnerPath = relativePath.startsWith(userPrefix) || relativePath.startsWith(userMediaPrefix);
    const isSuperuser = user.role === 'SUPERUSER';

    if (!isPublic && !isOwnerPath && !isSuperuser) {
      // Allow access if DB confirms ownership via goal/wishlist imageUrl
      const fileName = pathArray[pathArray.length - 1];
      if (relativePath.startsWith(USER_MEDIA_PREFIX)) {
        const owned = await verifyUserMediaOwnership(user.id, fileName, relativePath);
        if (!owned) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await readFile(resolvedPath);
    const fileName = pathArray[pathArray.length - 1];

    let contentType = 'application/octet-stream';
    if (fileName.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (fileName.endsWith('.png')) {
      contentType = 'image/png';
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}

async function verifyUserMediaOwnership(userId: string, fileName: string, relativePath: string): Promise<boolean> {
  const urlFragment = fileName;
  const [goal, wishlist] = await Promise.all([
    prisma.goal.findFirst({ where: { userId, imageUrl: { contains: urlFragment } } }),
    (prisma as any).wishlistItem.findFirst({ where: { userId, imageUrl: { contains: urlFragment } } }),
  ]);
  if (goal || wishlist) return true;
  return relativePath.startsWith(`user-media/${userId}/`);
}
