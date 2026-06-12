import { randomBytes } from 'crypto';
import { globalCache } from '@/lib/cache-singleton';

const EXCHANGE_TTL_MS = 5 * 60 * 1000;

interface ExchangeEntry {
  userId: string;
}

/** One-time mobile OAuth exchange code — avoids JWT in URL query strings. */
export function createMobileAuthExchangeCode(userId: string): string {
  const code = randomBytes(32).toString('base64url');
  globalCache.set(`mobile_auth:${code}`, { userId } satisfies ExchangeEntry, EXCHANGE_TTL_MS);
  return code;
}

export function consumeMobileAuthExchangeCode(code: string): ExchangeEntry | null {
  const key = `mobile_auth:${code}`;
  const entry = globalCache.get(key) as ExchangeEntry | null;
  if (!entry) return null;
  globalCache.delete(key);
  return entry;
}
