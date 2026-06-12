import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeMicrosoftCodeForTokens, verifyMicrosoftIdToken } from '@/lib/oauth';
import { completeOAuthLogin } from '@/lib/oauth-session';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/auth?tab=login&error=oauth_denied', request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/auth?tab=login&error=oauth_invalid', request.url));
    }

    const cookieStore = await cookies();
    const storedCodeVerifier = cookieStore.get('oauth_code_verifier')?.value;
    const storedState = cookieStore.get('oauth_state')?.value;

    if (!storedState || !state || !state.startsWith(storedState)) {
      return NextResponse.redirect(new URL('/auth?tab=login&error=oauth_state_mismatch', request.url));
    }

    if (!storedCodeVerifier) {
      return NextResponse.redirect(new URL('/auth?tab=login&error=oauth_expired', request.url));
    }

    cookieStore.delete('oauth_state');
    cookieStore.delete('oauth_provider');

    const { idToken } = await exchangeMicrosoftCodeForTokens(code, storedCodeVerifier);
    const microsoftUser = await verifyMicrosoftIdToken(idToken);

    return completeOAuthLogin(request, microsoftUser, 'microsoft', state, searchParams);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'oauth_failed';
    return NextResponse.redirect(
      new URL(`/auth?tab=login&error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
