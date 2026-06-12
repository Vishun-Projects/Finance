import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { clearSessionCookies } from '@/lib/clear-session-cookies';

// Routes that don't require authentication
import { jwtVerify } from 'jose';

const publicRoutePrefixes = [
  '/auth',
  '/terms',
  '/privacy',
  '/shipping',
  '/contact',
  '/refunds',
  '/about',
  '/api/auth/oauth/google',
  '/api/auth/oauth/google/callback',
];
const adminPrefix = '/admin';

function isPublicRoute(pathname: string): boolean {
  return publicRoutePrefixes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

const jwtSecretRaw = process.env.JWT_SECRET;
if (!jwtSecretRaw) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}
const JWT_SECRET = new TextEncoder().encode(jwtSecretRaw);

function issueLegacyCsrfCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (request.cookies.get('auth-token') && !request.cookies.get('csrf-token')) {
    const csrfToken =
      crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files (images, fonts, etc.)
  const staticFileExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.ico', '.json', '.xml', '.txt', '.woff', '.woff2', '.ttf', '.eot'];
  const isStaticFile = staticFileExtensions.some(ext => pathname.endsWith(ext));

  if (isStaticFile) {
    return NextResponse.next();
  }

  const signedOut = request.nextUrl.searchParams.get('signedOut') === '1';
  if ((pathname === '/auth' || pathname.startsWith('/auth/')) && signedOut) {
    const response = NextResponse.next();
    clearSessionCookies(response);
    return response;
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  const authToken = request.cookies.get('auth-token');

  let role: 'USER' | 'SUPERUSER' | undefined;
  let isValidToken = false;

  if (authToken) {
    try {
      const { payload } = await jwtVerify(authToken.value, JWT_SECRET);
      role = payload.role as 'USER' | 'SUPERUSER' | undefined;
      isValidToken = true;
    } catch (error) {
      console.warn('Invalid JWT token in middleware:', error);
      // Clear token and redirect if not on a public route
      if (!isPublicRoute(pathname) && pathname !== '/') {
        const response = NextResponse.redirect(new URL('/auth', request.url));
        response.cookies.delete('auth-token');
        return response;
      }
    }
  }

  // If no auth token and trying to access protected route, redirect to auth
  if (!isValidToken && !isPublicRoute(pathname) && pathname !== '/') {
    const response = NextResponse.redirect(new URL('/auth', request.url));
    // Also delete any potentially stale token cookie
    if (authToken) {
      response.cookies.delete('auth-token');
    }
    return response;
  }

  // If has auth token and trying to access login/register, redirect to dashboard
  if (isValidToken && (pathname === '/auth' || pathname.startsWith('/auth/'))) {
    if (role === 'SUPERUSER') {
      return NextResponse.redirect(new URL(adminPrefix, request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protect admin routes for superusers only
  if (pathname.startsWith(adminPrefix)) {
    if (!isValidToken) {
      return NextResponse.redirect(new URL('/auth?tab=login', request.url));
    }
    if (role !== 'SUPERUSER') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return issueLegacyCsrfCookie(request, NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - Static files are handled in the middleware function itself
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
