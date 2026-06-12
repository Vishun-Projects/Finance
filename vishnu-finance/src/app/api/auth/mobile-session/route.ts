import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { consumeMobileAuthExchangeCode } from '@/lib/mobile-auth-exchange';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { setSessionCookies } from '@/lib/session-cookies';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware('auth', request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Exchange code is required' }, { status: 400 });
    }

    const entry = consumeMobileAuthExchangeCode(code);
    if (!entry) {
      return NextResponse.json({ error: 'Invalid or expired exchange code' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: entry.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    await setSessionCookies(response, user);
    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to establish session' }, { status: 500 });
  }
}
