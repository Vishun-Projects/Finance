import { createMobileAuthExchangeCode } from '@/lib/mobile-auth-exchange';

const MOBILE_CALLBACK_BASE =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://vishun-finance.vercel.app';

/** Mobile deep link with one-time exchange code (no JWT in URL). */
export function buildMobileOAuthCallbackUrl(userId: string): string {
  const code = createMobileAuthExchangeCode(userId);
  return `${MOBILE_CALLBACK_BASE}/oauth-callback?code=${encodeURIComponent(code)}`;
}
