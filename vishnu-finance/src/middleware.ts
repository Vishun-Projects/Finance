import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files (images, fonts, etc.)
  const staticFileExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.ico', '.json', '.xml', '.txt', '.woff', '.woff2', '.ttf', '.eot'];
  const isStaticFile = staticFileExtensions.some(ext => pathname.endsWith(ext));

  if (isStaticFile) {
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
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

  return NextResponse.next();
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
