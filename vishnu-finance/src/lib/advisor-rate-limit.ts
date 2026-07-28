/**
 * Advisor-specific rate limits (per authenticated user).
 * Protects shared Gemini/Groq keys from a single user burning the free tier.
 */
import { NextResponse } from 'next/server';

interface Entry {
  count: number;
  resetTime: number;
}

const store = new Map<string, Entry>();

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Rolling window: default 20 requests / 10 minutes */
export function getAdvisorWindowLimit(): { requests: number; windowMs: number } {
  return {
    requests: envInt('ADVISOR_USER_RPM', 20),
    windowMs: envInt('ADVISOR_USER_WINDOW_MS', 10 * 60 * 1000),
  };
}

/** Soft daily cap: default 80 / day */
export function getAdvisorDailyLimit(): { requests: number; windowMs: number } {
  return {
    requests: envInt('ADVISOR_USER_RPD', 80),
    windowMs: 24 * 60 * 60 * 1000,
  };
}

function checkBucket(
  key: string,
  limit: { requests: number; windowMs: number },
): { allowed: boolean; remaining: number; resetTime: number; limit: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + limit.windowMs });
    return {
      allowed: true,
      remaining: limit.requests - 1,
      resetTime: now + limit.windowMs,
      limit: limit.requests,
    };
  }
  if (entry.count >= limit.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: limit.requests,
    };
  }
  entry.count += 1;
  store.set(key, entry);
  return {
    allowed: true,
    remaining: limit.requests - entry.count,
    resetTime: entry.resetTime,
    limit: limit.requests,
  };
}

export type AdvisorRateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
  kind: 'window' | 'daily';
  retryAfterSec: number;
};

export function checkAdvisorUserRateLimit(userId: string): AdvisorRateLimitResult {
  const window = getAdvisorWindowLimit();
  const daily = getAdvisorDailyLimit();

  const windowResult = checkBucket(`advisor:window:${userId}`, window);
  if (!windowResult.allowed) {
    return {
      ...windowResult,
      kind: 'window',
      retryAfterSec: Math.max(1, Math.ceil((windowResult.resetTime - Date.now()) / 1000)),
    };
  }

  const dailyResult = checkBucket(`advisor:daily:${userId}`, daily);
  if (!dailyResult.allowed) {
    return {
      ...dailyResult,
      kind: 'daily',
      retryAfterSec: Math.max(1, Math.ceil((dailyResult.resetTime - Date.now()) / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: Math.min(windowResult.remaining, dailyResult.remaining),
    resetTime: Math.min(windowResult.resetTime, dailyResult.resetTime),
    limit: window.requests,
    kind: 'window',
    retryAfterSec: 0,
  };
}

export function advisorRateLimitResponse(result: AdvisorRateLimitResult): NextResponse {
  const message =
    result.kind === 'daily'
      ? `Daily advisor limit reached (${result.limit} messages/day). Try again in ~${result.retryAfterSec}s.`
      : `Too many advisor requests. Limit ${result.limit} per window. Retry in ~${result.retryAfterSec}s.`;

  return NextResponse.json(
    {
      error: message,
      code: 'USER_RATE_LIMIT',
      retryAfterSec: result.retryAfterSec,
      kind: result.kind,
      limit: result.limit,
      remaining: result.remaining,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSec),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetTime),
      },
    },
  );
}
