import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateImageFile } from '@/lib/avatar-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/profile/avatar
 * Upload user avatar image
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token');
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized or account deactivated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate image file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Create avatars directory if it doesn't exist
    const avatarsDir = join(process.cwd(), 'public', 'avatars');
    try {
      await mkdir(avatarsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `avatar_${user.id}_${timestamp}.${fileExtension}`;
    const filepath = join(avatarsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Update user avatar URL in database
    const avatarUrl = `/avatars/${filename}`;
    const updatedUser = await (prisma as any).user.update({
      where: { id: user.id },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        gender: true,
      }
    });

    return NextResponse.json({ 
      user: updatedUser,
      avatarUrl,
      message: 'Avatar uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/profile/avatar
 * Remove user avatar
 */
export async function DELETE(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token');
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(authToken.value);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized or account deactivated' }, { status: 401 });
    }

    // Remove avatar URL from database
    const updatedUser = await (prisma as any).user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        gender: true,
      }
    });

    return NextResponse.json({ 
      user: updatedUser,
      message: 'Avatar removed successfully' 
    });
  } catch (error) {
    console.error('Error removing avatar:', error);
    return NextResponse.json({ error: 'Failed to remove avatar' }, { status: 500 });
  }
}

