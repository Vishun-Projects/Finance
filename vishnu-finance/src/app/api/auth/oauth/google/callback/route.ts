import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens, verifyGoogleIdToken } from '@/lib/oauth';
import { AuthService } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔐 OAUTH CALLBACK - Starting OAuth callback');

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('❌ OAUTH CALLBACK - OAuth error:', error);
      return NextResponse.redirect(
        new URL('/auth?tab=login&error=oauth_denied', request.url)
      );
    }

    if (!code || !state) {
      console.error('❌ OAUTH CALLBACK - Missing code or state');
      return NextResponse.redirect(
        new URL('/auth?tab=login&error=oauth_invalid', request.url)
      );
    }

    // Get stored code_verifier and state from cookies
    const cookieStore = await cookies();
    const storedCodeVerifier = cookieStore.get('oauth_code_verifier')?.value;
    const storedState = cookieStore.get('oauth_state')?.value;

    // Verify state to prevent CSRF
    if (!storedState || storedState !== state) {
      console.error('❌ OAUTH CALLBACK - State mismatch');
      return NextResponse.redirect(
        new URL('/auth?tab=login&error=oauth_state_mismatch', request.url)
      );
    }

    if (!storedCodeVerifier) {
      console.error('❌ OAUTH CALLBACK - Code verifier not found');
      return NextResponse.redirect(
        new URL('/auth?tab=login&error=oauth_expired', request.url)
      );
    }

    // Clear OAuth cookies
    cookieStore.delete('oauth_code_verifier');
    cookieStore.delete('oauth_state');

    // Exchange code for tokens
    console.log('🔐 OAUTH CALLBACK - Exchanging code for tokens');
    const { idToken } = await exchangeCodeForTokens(code, storedCodeVerifier);

    // Verify ID token and get user info
    console.log('🔐 OAUTH CALLBACK - Verifying ID token');
    const googleUser = await verifyGoogleIdToken(idToken);

    // Find or create user
    console.log('🔐 OAUTH CALLBACK - Finding or creating user');
    const user = await AuthService.findOrCreateOAuthUser(googleUser);

    if (!user.isActive) {
      console.error('❌ OAUTH CALLBACK - Account is deactivated');
      return NextResponse.redirect(
        new URL('/auth?tab=login&error=account_deactivated', request.url)
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate JWT token
    const token = AuthService.generateOAuthToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Set auth cookie
    const response = NextResponse.redirect(
      new URL(user.role === 'SUPERUSER' ? '/admin' : '/dashboard', request.url)
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // Audit log
    const meta = extractRequestMeta(request);
    const isNewUser = user.createdAt && 
      (Date.now() - new Date(user.createdAt).getTime()) < 5000; // Created within last 5 seconds

    await writeAuditLog({
      actorId: user.id,
      event: isNewUser ? 'USER_OAUTH_REGISTER' : 'USER_OAUTH_LOGIN',
      severity: 'INFO',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      message: `${user.email} ${isNewUser ? 'registered' : 'signed in'} with Google OAuth`,
      metadata: {
        provider: 'google',
        oauthId: user.oauthId,
      },
    });

    console.log(`✅ OAUTH CALLBACK - OAuth flow complete in ${Date.now() - startTime}ms`);
    return response;
  } catch (error) {
    console.error('❌ OAUTH CALLBACK - Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ OAUTH CALLBACK - Error details:', errorMessage);

    return NextResponse.redirect(
      new URL(`/auth?tab=login&error=oauth_failed&message=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}

