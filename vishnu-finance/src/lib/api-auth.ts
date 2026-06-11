import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './auth';

export type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;

export async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token?.value) return null;
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive) return null;
  return user;
}

export function unauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

type AuthedHandler = (
  request: NextRequest,
  user: AuthenticatedUser,
  context?: { params: Promise<Record<string, string | string[]>> }
) => Promise<NextResponse>;

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string | string[]>> }
) => Promise<NextResponse>;

/** Centralized API auth wrapper — use on routes not covered by page middleware. */
export function withAuth(handler: AuthedHandler): RouteHandler {
  return async (request, context) => {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorizedResponse();
    return handler(request, user, context);
  };
}

export function requireSuperuser(user: AuthenticatedUser): NextResponse | null {
  if (user.role !== 'SUPERUSER') {
    return forbiddenResponse('Superuser access required');
  }
  return null;
}

/** Protect cron/webhook endpoints with a shared secret (set CRON_SECRET in env). */
export function verifyCronSecret(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn('[api-auth] CRON_SECRET is not set — cron endpoint rejected');
    return unauthorizedResponse('Cron secret not configured');
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return unauthorizedResponse('Invalid cron secret');
  }
  return null;
}
