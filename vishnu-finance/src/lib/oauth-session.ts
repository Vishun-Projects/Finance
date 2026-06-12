import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService, getSuperuserEmail, normalizeEmail } from '@/lib/auth';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';
import { buildMobileOAuthCallbackUrl } from '@/lib/oauth-mobile-redirect';
import { setSessionCookies } from '@/lib/session-cookies';

type OAuthUser = { email: string; name: string; sub: string; picture?: string };

export async function completeOAuthLogin(
  request: NextRequest,
  oAuthUser: OAuthUser,
  provider: string,
  state: string,
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  const result = await AuthService.findOrCreateOAuthUser(oAuthUser, provider);

  if ('requiresLink' in result) {
    const linkUrl = new URL('/auth', request.url);
    linkUrl.searchParams.set('link', 'oauth');
    linkUrl.searchParams.set('provider', provider);
    linkUrl.searchParams.set('email', result.email);
    return NextResponse.redirect(linkUrl);
  }

  const user = result.user;
  if (!user?.isActive) {
    return NextResponse.redirect(new URL('/auth?tab=login&error=account_deactivated', request.url));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const superEmail = normalizeEmail(getSuperuserEmail());
  if (normalizeEmail(user.email) === superEmail) {
    await AuthService.generateOTP(user.email);
    const isMobile = state.includes(':mobile') || searchParams.get('platform') === 'mobile';
    if (isMobile) {
      const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? request.nextUrl.origin;
      return NextResponse.redirect(
        `${base}/oauth-callback?challenge=otp&email=${encodeURIComponent(user.email)}`,
      );
    }
    return NextResponse.redirect(
      new URL(`/auth?challenge=otp&email=${encodeURIComponent(user.email)}`, request.url),
    );
  }

  const isMobile = state.includes(':mobile') || searchParams.get('platform') === 'mobile';
  if (isMobile) {
    return NextResponse.redirect(buildMobileOAuthCallbackUrl(user.id));
  }

  const redirectPath = user.role === 'SUPERUSER' ? '/admin' : '/dashboard';
  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  await setSessionCookies(response, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const meta = extractRequestMeta(request);
  const isNewUser =
    user.createdAt && Date.now() - new Date(user.createdAt).getTime() < 5000;

  await writeAuditLog({
    actorId: user.id,
    event: isNewUser ? 'USER_OAUTH_REGISTER' : 'USER_OAUTH_LOGIN',
    severity: 'INFO',
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    message: `${user.email} ${isNewUser ? 'registered' : 'signed in'} with ${provider} OAuth`,
    metadata: { provider, oauthId: user.oauthId },
  });

  return response;
}
