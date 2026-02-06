import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const filePath = join(process.cwd(), ...pathArray);

    // Security: Only allow files from uploads directory
    const uploadsDir = join(process.cwd(), 'uploads');
    const resolvedPath = join(uploadsDir, ...pathArray);

    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Unauthorized path traversal detected' }, { status: 403 });
    }
    
    // Check if file exists
    // Note: We use resolvedPath which is strictly inside uploadsDir
    if (!existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await readFile(resolvedPath);
    const fileName = pathArray[pathArray.length - 1];

    // Determine content type
    let contentType = 'application/octet-stream';
    if (fileName.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (fileName.endsWith('.png')) {
      contentType = 'image/png';
    }

    // Convert Buffer to Uint8Array for NextResponse
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

