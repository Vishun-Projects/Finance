import type { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'auth-token';
const REFRESH_COOKIE = 'refresh-token';
const CSRF_COOKIE = 'csrf-token';
const isProduction = process.env.NODE_ENV === 'production';

/** Edge-safe session cookie clearing (no auth/db imports). */
export function clearSessionCookies(response: NextResponse): void {
  const cookieBase = {
    httpOnly: true,
    secure: isProduction,
    path: '/',
    maxAge: 0,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
  };

  response.cookies.set(ACCESS_COOKIE, '', cookieBase);
  response.cookies.set(REFRESH_COOKIE, '', {
    ...cookieBase,
    path: '/api/auth/refresh',
  });
  response.cookies.set(CSRF_COOKIE, '', {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge: 0,
  });
}
