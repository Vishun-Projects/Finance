import { NextRequest, NextResponse } from 'next/server';
import { getAllowedOrigin } from '@/lib/cors';
import { CSRF_COOKIE } from '@/lib/session-cookies';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Skip CSRF for auth bootstrap and read-only POST actions. */
const CSRF_EXEMPT_ACTIONS = new Set([
  'auth_login',
  'auth_register',
  'auth_logout',
  'auth_me',
  'categories_list',
  'goals_list',
  'transactions_list',
]);

export function isMutationMethod(method: string): boolean {
  return MUTATION_METHODS.has(method.toUpperCase());
}

/** Validate Origin/Referer against allowlist for cross-site cookie requests. */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const allowed = getAllowedOrigin(request);

  if (origin) {
    return origin === allowed || origin.startsWith(allowed.replace(/\/$/, ''));
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      return refOrigin === allowed || refOrigin.startsWith(allowed.replace(/\/$/, ''));
    } catch {
      return false;
    }
  }

  // Same-origin navigations may omit Origin on some requests
  const host = request.headers.get('host');
  if (host && allowed.includes(host)) return true;

  return process.env.NODE_ENV !== 'production';
}

/** Double-submit CSRF: cookie must match X-CSRF-Token header. */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get('x-csrf-token');
  if (!cookieToken || !headerToken) return false;
  return cookieToken === headerToken;
}

export function guardMutationRequest(
  request: NextRequest,
  options?: { action?: string; skipCsrf?: boolean },
): NextResponse | null {
  if (!isMutationMethod(request.method)) return null;

  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  const action = options?.action;
  if (options?.skipCsrf || (action && CSRF_EXEMPT_ACTIONS.has(action))) {
    return null;
  }

  if (!validateCsrfToken(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  return null;
}
