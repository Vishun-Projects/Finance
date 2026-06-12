import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { rotateRefreshToken, revokeRefreshToken } from '@/lib/refresh-token-service';
import { REFRESH_COOKIE, clearSessionCookies, setRotatedSessionCookies } from '@/lib/session-cookies';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware('auth', request);
  if (rateLimitResponse) return rateLimitResponse;

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) {
    const response = NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: rotated.userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!dbUser || !dbUser.isActive) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ success: true });
  await setRotatedSessionCookies(response, dbUser, rotated.rawToken);
  return response;
}

export async function DELETE(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const authToken = request.cookies.get('auth-token')?.value;

  if (authToken) {
    const user = await AuthService.getUserFromToken(authToken);
    if (user?.id) {
      AuthService.invalidateUserCache(user.id);
      const { revokeAllUserRefreshTokens } = await import('@/lib/refresh-token-service');
      await revokeAllUserRefreshTokens(user.id);
    }
  }

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  const response = NextResponse.json({ message: 'Logged out successfully' });
  clearSessionCookies(response);
  return response;
}
