import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';

type AuthenticatedUser = Awaited<ReturnType<typeof AuthService.getUserFromToken>>;

async function requireSuperuser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const token = request.cookies.get('auth-token');
  if (!token) {
    return null;
  }
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive || user.role !== 'SUPERUSER') {
    return null;
  }
  return user;
}

function missingStatusColumn(error: unknown) {
  return error instanceof Error && error.message.includes('Unknown field `status`');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSuperuser(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: targetUserId } = await params;
    const body = await request.json();
    const { status, isActive, role } = body as {
      status?: 'ACTIVE' | 'FROZEN' | 'SUSPENDED';
      isActive?: boolean;
      role?: 'USER' | 'SUPERUSER';
    };

    if (!status && typeof isActive === 'undefined' && !role) {
      return NextResponse.json({ error: 'No changes specified' }, { status: 400 });
    }

    let targetUser;
    try {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          status: true,
          isActive: true,
          role: true,
        },
      });
    } catch (error) {
      if (!missingStatusColumn(error)) {
        throw error;
      }

      console.warn('⚠️ Admin user PATCH - status column missing, falling back to legacy fetch');
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          isActive: true,
          role: true,
        },
      });

      if (status) {
        return NextResponse.json(
          { error: 'User status controls require the latest database migration. Please run prisma migrate.' },
          { status: 409 },
        );
      }
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let updated;
    try {
      updated = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          ...(typeof isActive !== 'undefined' ? { isActive } : {}),
          ...(status ? { status } : {}),
          ...(role ? { role } : {}),
        },
        select: {
          id: true,
          email: true,
          status: true,
          isActive: true,
          role: true,
        },
      });
    } catch (error) {
      if (missingStatusColumn(error)) {
        return NextResponse.json(
          { error: 'User status controls require the latest database migration. Please run prisma migrate.' },
          { status: 409 },
        );
      }
      throw error;
    }

    const meta = extractRequestMeta(request);

    await writeAuditLog({
      actorId: actor.id,
      event: 'USER_STATUS_CHANGE',
      severity: status === 'SUSPENDED' ? 'ALERT' : 'INFO',
      targetUserId: updated.id,
      targetResource: `user:${updated.id}`,
      metadata: {
        previous: {
          status: 'status' in targetUser ? (targetUser as any).status ?? 'ACTIVE' : undefined,
          isActive: targetUser.isActive,
          role: targetUser.role,
        },
        next: {
          status: updated.status,
          isActive: updated.isActive,
          role: updated.role,
        },
      },
      message: `User ${updated.email} updated by ${actor.email}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Admin user update failed:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 },
    );
  }
}

