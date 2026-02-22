import { NextRequest, NextResponse } from 'next/server';
import { generatePKCE, generateGoogleOAuthURL } from '@/lib/oauth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 OAUTH INITIATE - Starting Google OAuth flow');

    // Generate PKCE parameters
    const { codeVerifier, codeChallenge, state } = generatePKCE();

    // Store code_verifier and state in encrypted cookie (expires in 10 minutes)
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      maxAge: 10 * 60, // 10 minutes
      path: '/',
    };

    cookieStore.set('oauth_code_verifier', codeVerifier, cookieOptions);
    cookieStore.set('oauth_state', state, cookieOptions);
    cookieStore.set('oauth_provider', 'google', cookieOptions);

    // Detect if requested from mobile (Capacitor)
    const platform = request.nextUrl.searchParams.get('platform');

    // Encode platform into state for reliability across redirects
    // Standard state + ":platform"
    const finalState = platform === 'mobile' ? `${state}:mobile` : state;

    // Generate OAuth URL
    const authUrl = generateGoogleOAuthURL(codeChallenge, finalState);

    console.log('✅ OAUTH INITIATE - Redirecting to Google OAuth');
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('❌ OAUTH INITIATE - Error:', error);
    return NextResponse.redirect(
      new URL('/auth?tab=login&error=oauth_init_failed', request.url)
    );
  }
}

