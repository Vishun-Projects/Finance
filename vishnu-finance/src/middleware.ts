import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/auth'];
const adminPrefix = '/admin';

const decodeJwt = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
    const jsonPayload = decodeURIComponent(
      decoded
        .split('')
        .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.warn('Failed to decode JWT payload in middleware:', error);
    return null;
  }
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files (images, fonts, etc.)
  const staticFileExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.ico', '.json', '.xml', '.txt', '.woff', '.woff2', '.ttf', '.eot'];
  const isStaticFile = staticFileExtensions.some(ext => pathname.endsWith(ext));
  
  if (isStaticFile) {
    return NextResponse.next();
  }
  
  // Check if the route is public
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const authToken = request.cookies.get('auth-token');
  const decoded = authToken ? decodeJwt(authToken.value) : null;
  const role = decoded?.role as 'USER' | 'SUPERUSER' | undefined;
  
  // If no auth token and trying to access protected route, redirect to auth
  if (!authToken && pathname !== '/') {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // If has auth token and trying to access login/register, redirect to dashboard
  if (authToken && publicRoutes.includes(pathname)) {
    if (role === 'SUPERUSER') {
      return NextResponse.redirect(new URL(adminPrefix, request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protect admin routes for superusers only
  if (pathname.startsWith(adminPrefix)) {
    if (!authToken) {
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
