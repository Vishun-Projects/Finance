import { NextRequest, NextResponse } from 'next/server';
import { generatePKCE, generateMicrosoftOAuthURL } from '@/lib/oauth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 OAUTH INITIATE [MICROSOFT] - Starting Microsoft OAuth flow');

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
    cookieStore.set('oauth_provider', 'microsoft', cookieOptions);

    // Detect if requested from mobile (Capacitor)
    const platform = request.nextUrl.searchParams.get('platform');

    // Encode platform into state for reliability across redirects
    const finalState = platform === 'mobile' ? `${state}:mobile` : state;

    // Generate OAuth URL
    const authUrl = generateMicrosoftOAuthURL(codeChallenge, finalState);

    if (!authUrl) {
      console.error('❌ OAUTH INITIATE [MICROSOFT] - Microsoft OAuth not configured');
      return NextResponse.redirect(
        new URL('/auth?tab=login&error=oauth_not_configured&provider=microsoft', request.url)
      );
    }

    console.log('✅ OAUTH INITIATE [MICROSOFT] - Redirecting to Microsoft OAuth');
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('❌ OAUTH INITIATE [MICROSOFT] - Error:', error);
    return NextResponse.redirect(
      new URL('/auth?tab=login&error=oauth_init_failed', request.url)
    );
  }
}

