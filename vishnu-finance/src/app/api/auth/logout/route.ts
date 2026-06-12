import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { revokeAllUserRefreshTokens, revokeRefreshToken } from '@/lib/refresh-token-service';
import { REFRESH_COOKIE, clearSessionCookies } from '@/lib/session-cookies';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

async function performLogout(request: NextRequest): Promise<void> {
  const authToken = request.cookies.get('auth-token')?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (authToken) {
    try {
      const user = await AuthService.getUserFromToken(authToken);
      if (user?.id) {
        AuthService.invalidateUserCache(user.id);
        try {
          await revokeAllUserRefreshTokens(user.id);
        } catch (err) {
          console.warn('[logout] refresh token revoke skipped:', err);
        }
      }
    } catch (err) {
      console.warn('[logout] session lookup skipped:', err);
    }
  }

  if (refreshToken) {
    try {
      await revokeRefreshToken(refreshToken);
    } catch (err) {
      console.warn('[logout] refresh token revoke skipped:', err);
    }
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware('auth', request);
  if (rateLimitResponse) return rateLimitResponse;

  await performLogout(request);
  const response = NextResponse.json({ message: 'Logged out successfully' });
  clearSessionCookies(response);
  return response;
}

/** Browser navigation logout — clears cookies then redirects to login. */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware('auth', request);
  if (rateLimitResponse) return rateLimitResponse;

  await performLogout(request);
  const response = NextResponse.redirect(new URL('/auth?tab=login', request.url));
  clearSessionCookies(response);
  return response;
}
