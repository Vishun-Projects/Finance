import { randomBytes } from 'crypto';
import type { NextResponse } from 'next/server';
import { clearSessionCookies as applyClearSessionCookies } from '@/lib/clear-session-cookies';
import { AuthService } from '@/lib/auth';
import { issueRefreshToken } from '@/lib/refresh-token-service';

export const ACCESS_COOKIE = 'auth-token';
export const REFRESH_COOKIE = 'refresh-token';
export const CSRF_COOKIE = 'csrf-token';

const isProduction = process.env.NODE_ENV === 'production';

export function createCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
}

/** Issue access + refresh + CSRF cookies on a NextResponse. */
export async function setSessionCookies(
  response: NextResponse,
  user: SessionUser,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = AuthService.generateAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const { rawToken: refreshToken } = await issueRefreshToken(user.id);
  const csrfToken = createCsrfToken();

  const cookieBase = {
    httpOnly: true,
    secure: isProduction,
    path: '/',
  } as const;

  response.cookies.set(ACCESS_COOKIE, accessToken, {
    ...cookieBase,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: AuthService.ACCESS_TOKEN_MAX_AGE_SECONDS,
  });

  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    ...cookieBase,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/api/auth/refresh',
  });

  response.cookies.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return { accessToken, refreshToken };
}

export async function setRotatedSessionCookies(
  response: NextResponse,
  user: SessionUser,
  refreshToken: string,
): Promise<string> {
  const accessToken = AuthService.generateAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const csrfToken = createCsrfToken();
  const isProd = process.env.NODE_ENV === 'production';

  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: AuthService.ACCESS_TOKEN_MAX_AGE_SECONDS,
  });

  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60,
  });

  response.cookies.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return accessToken;
}

export function clearSessionCookies(response: NextResponse): void {
  applyClearSessionCookies(response);
}
