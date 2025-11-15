import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeMicrosoftCodeForTokens, verifyMicrosoftIdToken } from '@/lib/oauth';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extractRequestMeta, writeAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  console.log('🔐 OAUTH CALLBACK [MICROSOFT] - Starting OAuth callback');

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('❌ OAUTH CALLBACK [MICROSOFT] - OAuth error:', error);
      return NextResponse.redirect(
        new URL('/auth?tab=login&error=oauth_denied', request.url)
      );
    }

    if (!code || !state) {
      console.error('❌ OAUTH CALLBACK [MICROSOFT] - Missing code or state');
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
      console.error('❌ OAUTH CALLBACK [MICROSOFT] - State mismatch');
      return NextResponse.redirect(
        new URL('/auth?tab=login&error=oauth_state_mismatch', request.url)
      );
    }

    if (!storedCodeVerifier) {
      console.error('❌ OAUTH CALLBACK [MICROSOFT] - Code verifier not found');
      return NextResponse.redirect(
        new URL('/auth?tab=login&error=oauth_expired', request.url)
      );
    }

    // Clear OAuth cookies
    cookieStore.delete('oauth_state');
    cookieStore.delete('oauth_provider');

    // Exchange code for tokens
    console.log('🔐 OAUTH CALLBACK [MICROSOFT] - Exchanging code for tokens');
    const { idToken } = await exchangeMicrosoftCodeForTokens(code, storedCodeVerifier);

    // Verify ID token and get user info
    console.log('🔐 OAUTH CALLBACK [MICROSOFT] - Verifying ID token');
    const microsoftUser = await verifyMicrosoftIdToken(idToken);

    // Find or create user
    console.log('🔐 OAUTH CALLBACK [MICROSOFT] - Finding or creating user');
    const user = await AuthService.findOrCreateOAuthUser(microsoftUser, 'microsoft');

    if (!user.isActive) {
      console.error('❌ OAUTH CALLBACK [MICROSOFT] - Account is deactivated');
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
      message: isNewUser 
        ? `New user registered via Microsoft OAuth: ${user.email}`
        : `User logged in via Microsoft OAuth: ${user.email}`,
      metadata: {
        provider: 'microsoft',
        method: 'oauth',
        isNewUser,
        ...meta,
      },
    });

    console.log(`✅ OAUTH CALLBACK [MICROSOFT] - Authentication successful for ${user.email}`);
    return response;
  } catch (error: any) {
    console.error('❌ OAUTH CALLBACK [MICROSOFT] - Error:', error);
    return NextResponse.redirect(
      new URL(`/auth?tab=login&error=${encodeURIComponent(error.message || 'oauth_failed')}`, request.url)
    );
  }
}

