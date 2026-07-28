/**
 * Production-style LLM retries: honor Retry-After, else full-jitter exponential backoff.
 * Pattern shared by OpenAI/Anthropic client guidance.
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse retry-after (seconds) or retry-after-ms from headers or error objects. */
export function parseRetryAfterMs(source: {
  headers?: Headers | Record<string, string | null | undefined> | null;
  retryAfterSeconds?: number | null;
  retryAfterMs?: number | null;
  message?: string;
}): number | null {
  if (source.retryAfterMs != null && Number.isFinite(source.retryAfterMs)) {
    return Math.max(0, Math.floor(source.retryAfterMs));
  }
  if (source.retryAfterSeconds != null && Number.isFinite(source.retryAfterSeconds)) {
    return Math.max(0, Math.floor(source.retryAfterSeconds * 1000));
  }

  const headers = source.headers;
  if (headers) {
    const get = (key: string) => {
      if (typeof (headers as Headers).get === 'function') {
        return (headers as Headers).get(key);
      }
      const rec = headers as Record<string, string | null | undefined>;
      return rec[key] ?? rec[key.toLowerCase()] ?? null;
    };
    const msHeader = get('retry-after-ms');
    if (msHeader != null && Number.isFinite(Number(msHeader))) {
      return Math.max(0, Math.floor(Number(msHeader)));
    }
    const secHeader = get('retry-after');
    if (secHeader != null && Number.isFinite(Number(secHeader))) {
      return Math.max(0, Math.floor(Number(secHeader) * 1000));
    }
  }

  const msg = source.message || '';
  const m = msg.match(/retry\s+in\s+~?(\d+)\s*s/i);
  if (m) return Number(m[1]) * 1000;

  return null;
}

/** Full jitter: uniform random in [0, min(cap, base * 2^attempt)]. */
export function fullJitterDelayMs(
  attempt: number,
  baseMs = 400,
  capMs = 30_000,
): number {
  const window = Math.min(capMs, baseMs * Math.pow(2, Math.max(0, attempt)));
  return Math.floor(Math.random() * (window + 1));
}

export function isNonRetryableQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes('insufficient_quota') ||
    lower.includes('exceeded your current quota') ||
    lower.includes('quota exceeded') ||
    lower.includes('free_tier') && lower.includes('limit: 0') ||
    (error as { name?: string })?.name === 'GeminiQuotaExceededError'
  );
}

export function isRetryableAiError(error: unknown): boolean {
  if (isNonRetryableQuotaError(error)) return false;
  const err = error as { status?: number; statusCode?: number; message?: string };
  const status = err.status ?? err.statusCode;
  const msg = (err.message || String(error)).toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    status === 408 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('overloaded') ||
    msg.includes('service unavailable') ||
    msg.includes('rate limit') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('the model is overloaded')
  );
}

export async function withAiRetry<T>(
  fn: () => Promise<T>,
  opts?: {
    maxAttempts?: number;
    baseMs?: number;
    capMs?: number;
    /** Extract retry-after from a thrown error */
    getRetryAfterMs?: (error: unknown) => number | null;
    shouldRetry?: (error: unknown) => boolean;
  },
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 4;
  const baseMs = opts?.baseMs ?? 400;
  const capMs = opts?.capMs ?? 30_000;
  const shouldRetry = opts?.shouldRetry ?? isRetryableAiError;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === maxAttempts - 1) {
        throw error;
      }
      const fromHeader =
        opts?.getRetryAfterMs?.(error) ??
        parseRetryAfterMs({
          retryAfterSeconds: (error as { status?: { retryAfterSeconds?: number } })?.status
            ?.retryAfterSeconds,
          message: error instanceof Error ? error.message : String(error),
        });
      const delay =
        fromHeader != null && fromHeader > 0
          ? fromHeader + Math.floor(Math.random() * 250)
          : fullJitterDelayMs(attempt, baseMs, capMs);
      await sleep(Math.min(delay, capMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
