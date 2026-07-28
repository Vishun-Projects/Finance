/**
 * Gemini free-tier quota tracking + 429 parsing.
 * Google does not expose a live "tokens remaining" counter via generateContent;
 * we track local request counts and surface limit / retry / reset from error payloads.
 */

export type GeminiQuotaKind = 'daily' | 'per_minute' | 'unknown';

export interface GeminiQuotaStatus {
  exceeded: boolean;
  kind: GeminiQuotaKind;
  model?: string;
  /** Declared limit from Google (e.g. 20 free-tier requests/day) */
  limit?: number;
  /** Requests counted locally for the current UTC day */
  usedLocal?: number;
  /** Best-effort remaining when limit is known */
  remainingLocal?: number;
  quotaMetric?: string;
  windowLabel?: string;
  retryAfterSeconds?: number;
  /** When daily free-tier typically renews (midnight America/Los_Angeles) */
  renewsAt?: string;
  message: string;
  updatedAt: string;
  docsUrl?: string;
}

interface LocalUsageDay {
  dayKey: string;
  byModel: Record<string, number>;
  total: number;
}

let localUsage: LocalUsageDay = { dayKey: '', byModel: {}, total: 0 };
let lastStatus: GeminiQuotaStatus | null = null;
let exceededUntilMs = 0;

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function ensureLocalDay(): LocalUsageDay {
  const key = utcDayKey();
  if (localUsage.dayKey !== key) {
    localUsage = { dayKey: key, byModel: {}, total: 0 };
  }
  return localUsage;
}

/** Free-tier generate requests usually reset at midnight Pacific Time. */
export function estimateDailyQuotaRenewal(from = new Date()): Date {
  const tz = 'America/Los_Angeles';
  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayPt = dateFmt.format(from);
  for (let h = 1; h <= 40; h++) {
    const candidate = new Date(from.getTime() + h * 60 * 60 * 1000);
    if (dateFmt.format(candidate) !== todayPt) {
      for (let m = 0; m <= 60 * 24; m++) {
        const c = new Date(candidate.getTime() - m * 60 * 1000);
        if (dateFmt.format(c) === todayPt) {
          return new Date(c.getTime() + 60 * 1000);
        }
      }
      return candidate;
    }
  }
  return new Date(from.getTime() + 24 * 60 * 60 * 1000);
}

export function recordGeminiRequest(model: string): void {
  const usage = ensureLocalDay();
  usage.byModel[model] = (usage.byModel[model] || 0) + 1;
  usage.total += 1;
}

export function getLocalGeminiUsage(): LocalUsageDay {
  const usage = ensureLocalDay();
  return { dayKey: usage.dayKey, byModel: { ...usage.byModel }, total: usage.total };
}

export function isGeminiQuotaBlocked(): boolean {
  if (exceededUntilMs && Date.now() >= exceededUntilMs) {
    exceededUntilMs = 0;
    if (lastStatus) lastStatus = { ...lastStatus, exceeded: false };
  }
  return Date.now() < exceededUntilMs;
}

export function getGeminiQuotaStatus(): GeminiQuotaStatus {
  const usage = ensureLocalDay();
  if (lastStatus) {
    const limit = lastStatus.limit;
    const usedLocal = lastStatus.model
      ? usage.byModel[lastStatus.model] ?? usage.total
      : usage.total;
    return {
      ...lastStatus,
      usedLocal,
      remainingLocal:
        limit != null ? Math.max(0, limit - usedLocal) : lastStatus.remainingLocal,
      exceeded: isGeminiQuotaBlocked() || Boolean(lastStatus.exceeded && kindStillActive(lastStatus)),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    exceeded: false,
    kind: 'unknown',
    usedLocal: usage.total,
    message:
      'No quota error yet. Google free tier does not publish live remaining tokens — we show limits when a 429 is returned.',
    updatedAt: new Date().toISOString(),
    renewsAt: estimateDailyQuotaRenewal().toISOString(),
    docsUrl: 'https://ai.google.dev/gemini-api/docs/rate-limits',
  };
}

function kindStillActive(status: GeminiQuotaStatus): boolean {
  if (status.kind === 'daily' && status.renewsAt) {
    return Date.now() < new Date(status.renewsAt).getTime();
  }
  return isGeminiQuotaBlocked();
}

function extractRetrySeconds(message: string, errorDetails?: unknown): number | undefined {
  const fromText = message.match(/retry in\s+([\d.]+)\s*s/i);
  if (fromText) return Math.ceil(Number(fromText[1]));

  if (Array.isArray(errorDetails)) {
    for (const d of errorDetails) {
      const delay = d?.retryDelay;
      if (typeof delay === 'string') {
        const sec = delay.endsWith('s') ? Number(delay.slice(0, -1)) : Number(delay);
        if (Number.isFinite(sec)) return Math.ceil(sec);
      }
    }
  }
  return undefined;
}

function extractViolations(errorDetails?: unknown): Array<{
  quotaMetric?: string;
  quotaId?: string;
  quotaValue?: string | number;
  model?: string;
}> {
  if (!Array.isArray(errorDetails)) return [];
  const out: Array<{
    quotaMetric?: string;
    quotaId?: string;
    quotaValue?: string | number;
    model?: string;
  }> = [];
  for (const d of errorDetails) {
    const violations = d?.violations;
    if (!Array.isArray(violations)) continue;
    for (const v of violations) {
      out.push({
        quotaMetric: v.quotaMetric,
        quotaId: v.quotaId,
        quotaValue: v.quotaValue,
        model: v.quotaDimensions?.model,
      });
    }
  }
  return out;
}

export function parseGeminiQuotaError(error: unknown): GeminiQuotaStatus {
  const err = error as {
    message?: string;
    errorDetails?: unknown;
    status?: number;
  };
  const message = err?.message || String(error);
  const violations = extractViolations(err?.errorDetails);
  const v0 = violations[0];
  const retryAfterSeconds = extractRetrySeconds(message, err?.errorDetails);
  const limit = v0?.quotaValue != null ? Number(v0.quotaValue) : undefined;
  const quotaId = v0?.quotaId || '';
  const metric = v0?.quotaMetric || '';

  const isDaily =
    /PerDay|free_tier_requests|FreeTier/i.test(quotaId) ||
    /free_tier_requests/i.test(metric) ||
    /per day/i.test(message) ||
    /exceeded your current quota/i.test(message);

  const kind: GeminiQuotaKind = isDaily
    ? 'daily'
    : retryAfterSeconds != null && retryAfterSeconds < 3600
      ? 'per_minute'
      : 'unknown';

  const model =
    v0?.model ||
    message.match(/model:\s*([a-z0-9._-]+)/i)?.[1] ||
    message.match(/models\/([a-z0-9._-]+)/i)?.[1];

  const renewsAt = estimateDailyQuotaRenewal().toISOString();
  const usage = ensureLocalDay();
  const usedLocal = model ? usage.byModel[model] ?? usage.total : usage.total;
  const renewsIst = new Date(renewsAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  let uiMessage: string;
  if (kind === 'daily') {
    const limitPart = limit != null ? `${limit}/day` : 'daily free-tier';
    const modelPart = model ? ` on ${model}` : '';
    uiMessage = `Daily Gemini free-tier limit reached (${limitPart}${modelPart}). Renews ~midnight Pacific ≈ ${renewsIst} IST. Monitor: https://ai.dev/rate-limit`;
  } else if (kind === 'per_minute') {
    uiMessage = `Short-term rate limit${
      retryAfterSeconds != null ? ` — retry in ~${retryAfterSeconds}s` : ''
    }.`;
  } else {
    uiMessage = 'Gemini API quota or rate limit exceeded.';
  }

  const status: GeminiQuotaStatus = {
    exceeded: true,
    kind,
    model,
    limit: Number.isFinite(limit) ? limit : kind === 'daily' ? 20 : undefined,
    usedLocal,
    remainingLocal: 0,
    quotaMetric: metric || undefined,
    windowLabel:
      kind === 'daily' ? 'Free tier requests / day / model' : 'Short rate window',
    retryAfterSeconds,
    renewsAt: kind === 'daily' ? renewsAt : undefined,
    message: uiMessage,
    updatedAt: new Date().toISOString(),
    docsUrl: 'https://ai.google.dev/gemini-api/docs/rate-limits',
  };

  lastStatus = status;
  if (kind === 'daily') {
    exceededUntilMs = new Date(renewsAt).getTime();
  } else if (retryAfterSeconds != null) {
    exceededUntilMs = Date.now() + retryAfterSeconds * 1000;
  } else {
    exceededUntilMs = Date.now() + 60_000;
  }

  return status;
}

export function clearGeminiQuotaBlock(): void {
  exceededUntilMs = 0;
  if (lastStatus) lastStatus = { ...lastStatus, exceeded: false };
}

export class GeminiQuotaExceededError extends Error {
  status: GeminiQuotaStatus;
  constructor(status: GeminiQuotaStatus) {
    super(status.message);
    this.name = 'GeminiQuotaExceededError';
    this.status = status;
  }
}
