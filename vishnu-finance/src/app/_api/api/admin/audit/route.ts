import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';

async function requireSuperuser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) return null;
  const user = (await AuthService.getUserFromToken(token.value)) as any;
  if (!user || !user.isActive || user.role !== 'SUPERUSER') return null;
  return user;
}

function auditStoreAvailable(): boolean {
  const audit = (prisma as unknown as Record<string, unknown>).auditLog;
  return !!audit && typeof (audit as any).findMany === 'function';
}

export async function GET(request: NextRequest) {
  try {
    const superuser = await requireSuperuser(request);
    if (!superuser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auditStoreAvailable()) {
      return NextResponse.json(
        { error: 'Audit log storage not available yet. Run the latest database migrations.' },
        { status: 409 },
      );
    }

    const params = request.nextUrl.searchParams;
    const event = params.get('event');
    const severity = params.get('severity') as 'INFO' | 'WARN' | 'ALERT' | null;
    const actor = params.get('actor');
    const target = params.get('target');
    const limit = Math.min(Number(params.get('limit') ?? 100), 500);
    const cursor = params.get('cursor');
    const start = params.get('start') ? new Date(params.get('start')!) : null;
    const end = params.get('end') ? new Date(params.get('end')!) : null;

    const logs = await (prisma as any).auditLog.findMany({
      where: {
        ...(event ? { event } : {}),
        ...(severity ? { severity } : {}),
        ...(actor ? { actor: { email: { contains: actor, mode: 'insensitive' } } } : {}),
        ...(target ? { targetUser: { email: { contains: target, mode: 'insensitive' } } } : {}),
        ...(start || end
          ? {
              createdAt: {
                ...(start ? { gte: start } : {}),
                ...(end ? { lte: end } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        event: true,
        severity: true,
        message: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        actor: { select: { id: true, email: true, name: true } },
        targetUser: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({
      logs,
      nextCursor: logs.length === limit ? logs[logs.length - 1].id : null,
    });
  } catch (error) {
    console.error('Admin audit fetch failed:', error);
    return NextResponse.json({ error: 'Failed to load audit logs' }, { status: 500 });
  }
}

