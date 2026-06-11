/**
 * Optional Upstash Redis rate limiting when UPSTASH_REDIS_REST_URL is set.
 * Falls back to in-memory store for local dev / free hobby without Redis.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export const RATE_LIMITS = {
  dashboard: { requests: 60, windowMs: 60 * 1000 },
  crud: { requests: 120, windowMs: 60 * 1000 },
  auth: { requests: 5, windowMs: 60 * 1000 },
  analytics: { requests: 30, windowMs: 60 * 1000 },
  default: { requests: 100, windowMs: 60 * 1000 },
} as const;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getIdentifier(request: Request): string {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  if (userId) return userId;

  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
}

function checkInMemoryRateLimit(
  routeType: keyof typeof RATE_LIMITS | 'default',
  request: Request,
): { allowed: boolean; remaining: number; resetTime: number; limit: number } {
  const limit = RATE_LIMITS[routeType] || RATE_LIMITS.default;
  const identifier = getIdentifier(request);
  const key = `${routeType}:${identifier}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + limit.windowMs });
    return { allowed: true, remaining: limit.requests - 1, resetTime: now + limit.windowMs, limit: limit.requests };
  }

  if (entry.count >= limit.requests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime, limit: limit.requests };
  }

  entry.count++;
  rateLimitStore.set(key, entry);
  return {
    allowed: true,
    remaining: limit.requests - entry.count,
    resetTime: entry.resetTime,
    limit: limit.requests,
  };
}

async function checkUpstashRateLimit(
  routeType: keyof typeof RATE_LIMITS | 'default',
  request: Request,
): Promise<{ allowed: boolean; remaining: number; resetTime: number; limit: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');
    const limit = RATE_LIMITS[routeType] || RATE_LIMITS.default;
    const windowSec = Math.ceil(limit.windowMs / 1000) as 1 | 10 | 60;
    const ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(limit.requests, `${windowSec} s`),
      prefix: `vf:${routeType}`,
    });
    const identifier = getIdentifier(request);
    const result = await ratelimit.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetTime: result.reset,
      limit: result.limit,
    };
  } catch (error) {
    console.warn('[rate-limit] Upstash unavailable, using in-memory fallback', error);
    return null;
  }
}

export async function checkRateLimit(
  routeType: keyof typeof RATE_LIMITS | 'default',
  request: Request,
): Promise<{ allowed: boolean; remaining: number; resetTime: number; limit: number }> {
  const upstash = await checkUpstashRateLimit(routeType, request);
  if (upstash) return upstash;
  return checkInMemoryRateLimit(routeType, request);
}

export function getRouteType(pathname: string): keyof typeof RATE_LIMITS | 'default' {
  if (pathname.includes('/dashboard')) return 'dashboard';
  if (pathname.includes('/auth')) return 'auth';
  if (pathname.includes('/analytics')) return 'analytics';
  if (['/api/goals', '/api/deadlines', '/api/wishlist'].some((p) => pathname.includes(p))) {
    return 'crud';
  }
  return 'default';
}

export async function rateLimitMiddleware(
  routeType: keyof typeof RATE_LIMITS | 'default',
  request: Request,
): Promise<Response | null> {
  const result = await checkRateLimit(routeType, request);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again after ${new Date(result.resetTime).toISOString()}`,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  return null;
}

export function getRateLimitStats(): { size: number; entries: string[] } {
  return {
    size: rateLimitStore.size,
    entries: Array.from(rateLimitStore.keys()),
  };
}
