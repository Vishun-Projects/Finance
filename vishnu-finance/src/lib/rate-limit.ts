// Rate limiting utility for API routes
// Uses in-memory store (upgrade to Redis for production scaling)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit store
// Key format: "route:identifier" (e.g., "dashboard:userId123" or "api:ip:192.168.1.1")
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations per route type
export const RATE_LIMITS = {
  dashboard: { requests: 60, windowMs: 60 * 1000 }, // 60 requests/minute
  crud: { requests: 120, windowMs: 60 * 1000 },     // 120 requests/minute
  auth: { requests: 5, windowMs: 60 * 1000 },        // 5 requests/minute
  analytics: { requests: 30, windowMs: 60 * 1000 },  // 30 requests/minute
  default: { requests: 100, windowMs: 60 * 1000 },   // 100 requests/minute
} as const;

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get rate limit identifier from request
 */
function getIdentifier(request: Request): string {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const authHeader = request.headers.get('authorization');
  
  // Try to get user ID from various sources
  if (userId) {
    return userId;
  }
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return ip;
}

/**
 * Check if request exceeds rate limit
 * @param routeType - Type of route (dashboard, crud, auth, etc.)
 * @param request - Request object
 * @returns Object with allowed status and rate limit info
 */
export function checkRateLimit(
  routeType: keyof typeof RATE_LIMITS | 'default',
  request: Request
): { allowed: boolean; remaining: number; resetTime: number; limit: number } {
  const limit = RATE_LIMITS[routeType] || RATE_LIMITS.default;
  const identifier = getIdentifier(request);
  const key = `${routeType}:${identifier}`;
  
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // If no entry or window expired, create new entry
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs,
    });
    
    return {
      allowed: true,
      remaining: limit.requests - 1,
      resetTime: now + limit.windowMs,
      limit: limit.requests,
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= limit.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: limit.requests,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: limit.requests - entry.count,
    resetTime: entry.resetTime,
    limit: limit.requests,
  };
}

/**
 * Determine route type from pathname
 */
export function getRouteType(pathname: string): keyof typeof RATE_LIMITS | 'default' {
  if (pathname.includes('/dashboard')) return 'dashboard';
  if (pathname.includes('/auth')) return 'auth';
  if (pathname.includes('/analytics')) return 'analytics';
  if (['/api/expenses', '/api/income', '/api/goals', '/api/deadlines', '/api/wishlist'].some(p => pathname.includes(p))) {
    return 'crud';
  }
  return 'default';
}

/**
 * Rate limit middleware for API routes
 * Usage: const result = rateLimitMiddleware('dashboard', request);
 */
export function rateLimitMiddleware(
  routeType: keyof typeof RATE_LIMITS | 'default',
  request: Request
): Response | null {
  const result = checkRateLimit(routeType, request);
  
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
      }
    );
  }
  
  return null; // Request allowed
}

/**
 * Get rate limit stats for debugging
 */
export function getRateLimitStats(): { size: number; entries: string[] } {
  return {
    size: rateLimitStore.size,
    entries: Array.from(rateLimitStore.keys()),
  };
}

