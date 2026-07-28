import type { GeminiQuotaStatus } from '@/lib/gemini-quota';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const GROQ_DEFAULT_MODEL =
  process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';

/**
 * Prefer stronger models first; smaller/faster models are fallbacks when TPM or
 * model-specific limits block a request. Deduped; env override wins.
 */
export const GROQ_FALLBACK_MODELS: string[] = (() => {
  const ordered = [
    process.env.GROQ_MODEL?.trim(),
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'openai/gpt-oss-20b',
    'qwen/qwen3-32b',
  ].filter((m): m is string => Boolean(m));
  return [...new Set(ordered)];
})();

/** Progressive budgets — Groq TPM counts input + reserved max_tokens. */
const GROQ_SIZE_BUDGETS = [
  { maxInputTokens: 7500, maxOutputTokens: 1500 },
  { maxInputTokens: 5500, maxOutputTokens: 1200 },
  { maxInputTokens: 4000, maxOutputTokens: 1000 },
  { maxInputTokens: 2800, maxOutputTokens: 800 },
  { maxInputTokens: 1800, maxOutputTokens: 600 },
] as const;

export interface GroqRateLimitStatus {
  provider: 'groq';
  model: string;
  /** Requests remaining today (RPD) */
  remainingRequests?: number;
  /** RPD limit */
  limitRequests?: number;
  /** Tokens remaining this minute (TPM) */
  remainingTokens?: number;
  /** TPM limit */
  limitTokens?: number;
  /** Human reset for daily requests, e.g. 2m59s */
  resetRequests?: string;
  /** Human reset for token window */
  resetTokens?: string;
  retryAfterSeconds?: number;
  message: string;
  updatedAt: string;
}

let lastGroqLimits: GroqRateLimitStatus | null = null;

export function getGroqRateLimitStatus(): GroqRateLimitStatus | null {
  return lastGroqLimits;
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

/** Conservative chars→tokens (tables/TSV tokenize denser than prose). */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.2);
}

export function truncateToTokenBudget(text: string, maxTokens: number): string {
  if (estimateTokens(text) <= maxTokens) return text;
  const maxChars = Math.max(200, Math.floor(maxTokens * 3.2));
  return `${text.slice(0, maxChars)}\n\n[Truncated to fit model token limits.]`;
}

function parseResetToSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  // Formats like "2m59.56s" or "7.66s"
  const m = value.match(/(?:(\d+)m)?\s*([\d.]+)s/i);
  if (!m) return undefined;
  const mins = m[1] ? Number(m[1]) : 0;
  const secs = Number(m[2]);
  if (!Number.isFinite(secs)) return undefined;
  return Math.ceil(mins * 60 + secs);
}

function applyRateLimitHeaders(
  headers: Headers,
  model: string,
): GroqRateLimitStatus {
  const remainingRequests = headers.get('x-ratelimit-remaining-requests');
  const limitRequests = headers.get('x-ratelimit-limit-requests');
  const remainingTokens = headers.get('x-ratelimit-remaining-tokens');
  const limitTokens = headers.get('x-ratelimit-limit-tokens');
  const resetRequests = headers.get('x-ratelimit-reset-requests') || undefined;
  const resetTokens = headers.get('x-ratelimit-reset-tokens') || undefined;
  const retryAfter = headers.get('retry-after');

  const remReq = remainingRequests != null ? Number(remainingRequests) : undefined;
  const limReq = limitRequests != null ? Number(limitRequests) : undefined;

  const status: GroqRateLimitStatus = {
    provider: 'groq',
    model,
    remainingRequests: Number.isFinite(remReq) ? remReq : undefined,
    limitRequests: Number.isFinite(limReq) ? limReq : undefined,
    remainingTokens:
      remainingTokens != null && Number.isFinite(Number(remainingTokens))
        ? Number(remainingTokens)
        : undefined,
    limitTokens:
      limitTokens != null && Number.isFinite(Number(limitTokens))
        ? Number(limitTokens)
        : undefined,
    resetRequests,
    resetTokens,
    retryAfterSeconds: retryAfter != null ? Number(retryAfter) : parseResetToSeconds(resetTokens || null),
    message:
      remReq != null && limReq != null
        ? `Groq free tier: ${remReq}/${limReq} requests left today (RPD). TPM remaining: ${remainingTokens ?? '—'}/${limitTokens ?? '—'}.`
        : 'Using Groq free tier.',
    updatedAt: new Date().toISOString(),
  };

  lastGroqLimits = status;
  return status;
}

export class GroqRateLimitError extends Error {
  status: GroqRateLimitStatus;
  constructor(status: GroqRateLimitStatus) {
    super(status.message);
    this.name = 'GroqRateLimitError';
    this.status = status;
  }
}

export class GroqPayloadTooLargeError extends Error {
  model: string;
  body: string;
  constructor(model: string, body: string) {
    super(`Request too large for ${model}`);
    this.name = 'GroqPayloadTooLargeError';
    this.model = model;
    this.body = body;
  }
}

function isPayloadTooLarge(status: number, body: string): boolean {
  if (status === 413) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes('request too large') ||
    lower.includes('tokens per minute') ||
    (lower.includes('"code":"rate_limit_exceeded"') && lower.includes('tokens')) ||
    (lower.includes('tpm') && lower.includes('requested'))
  );
}

function isDailyOrRpmExhausted(status: number, body: string): boolean {
  if (status !== 429) return false;
  if (isPayloadTooLarge(status, body)) return false;
  const lower = body.toLowerCase();
  return (
    lower.includes('requests per day') ||
    lower.includes('requests per minute') ||
    lower.includes('rate_limit_exceeded')
  );
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function fitMessagesToBudget(
  system: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxInputTokens: number,
): ChatMessage[] {
  // Reserve for system + question; squeeze history/context first.
  const systemBudget = Math.min(estimateTokens(system), Math.floor(maxInputTokens * 0.18));
  const fittedSystem = truncateToTokenBudget(system, systemBudget);

  const historySlice = history.slice(-4).map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: truncateToTokenBudget(m.content, 400),
  }));

  let historyTokens = historySlice.reduce((n, m) => n + estimateTokens(m.content) + 4, 0);
  while (historySlice.length > 0 && historyTokens > maxInputTokens * 0.2) {
    historySlice.shift();
    historyTokens = historySlice.reduce((n, m) => n + estimateTokens(m.content) + 4, 0);
  }

  const used =
    estimateTokens(fittedSystem) +
    historyTokens +
    8;
  const userBudget = Math.max(400, maxInputTokens - used);
  const fittedUser = truncateToTokenBudget(userMessage, userBudget);

  return [
    { role: 'system', content: fittedSystem },
    ...historySlice,
    { role: 'user', content: fittedUser },
  ];
}

async function callGroqOnce(args: {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  stream?: boolean;
  onToken?: (delta: string) => void;
}): Promise<{ text: string; rateLimit: GroqRateLimitStatus }> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      temperature: args.temperature,
      max_tokens: args.maxTokens,
      top_p: 1,
      stream: Boolean(args.stream && args.onToken),
    }),
  });

  const rateLimit = applyRateLimitHeaders(response.headers, args.model);

  if (args.stream && args.onToken && response.ok && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            full += delta;
            args.onToken(delta);
          }
        } catch {
          /* ignore partial JSON */
        }
      }
    }
    if (!full.trim()) {
      throw new Error('Groq returned an empty streamed response');
    }
    return { text: full, rateLimit };
  }

  const body = response.ok ? '' : await response.text().catch(() => '');

  if (isPayloadTooLarge(response.status, body)) {
    throw new GroqPayloadTooLargeError(args.model, body.slice(0, 500));
  }

  if (response.status === 429 || isDailyOrRpmExhausted(response.status, body)) {
    throw new GroqRateLimitError({
      ...rateLimit,
      message:
        rateLimit.retryAfterSeconds != null
          ? `Groq rate limit hit — retry in ~${rateLimit.retryAfterSeconds}s. ${rateLimit.message}`
          : `Groq rate limit exceeded. ${rateLimit.message}`,
    });
  }

  if (!response.ok) {
    throw new Error(`Groq API error ${response.status}: ${body.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  if (!text) {
    throw new Error('Groq returned an empty response');
  }

  return { text, rateLimit };
}

/**
 * Non-streaming chat completion via Groq with size + model fallbacks.
 * Shrinks payload on TPM/413, then tries the next model.
 */
export async function generateGroqChatCompletion(args: {
  system: string;
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  models?: string[];
  onToken?: (delta: string) => void;
}): Promise<{ text: string; rateLimit: GroqRateLimitStatus; modelUsed: string }> {
  if (!isGroqConfigured()) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const models = [
    ...(args.model ? [args.model] : []),
    ...(args.models ?? GROQ_FALLBACK_MODELS),
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  const history = args.conversationHistory ?? [];
  const temperature = args.temperature ?? 0.7;

  let lastError: Error | null = null;

  for (const model of models) {
    for (const budget of GROQ_SIZE_BUDGETS) {
      const maxOutput = Math.min(
        args.maxTokens ?? budget.maxOutputTokens,
        budget.maxOutputTokens,
      );
      const messages = fitMessagesToBudget(
        args.system,
        args.userMessage,
        history,
        budget.maxInputTokens,
      );

      try {
        const { withAiRetry } = await import('@/lib/ai-retry');
        const result = await withAiRetry(
          () =>
            callGroqOnce({
              model,
              messages,
              temperature,
              maxTokens: maxOutput,
              stream: Boolean(args.onToken),
              onToken: args.onToken,
            }),
          {
            maxAttempts: 3,
            getRetryAfterMs: (err) =>
              err instanceof GroqRateLimitError
                ? (err.status.retryAfterSeconds ?? 0) * 1000 || null
                : null,
            shouldRetry: (err) =>
              err instanceof GroqRateLimitError &&
              (err.status.retryAfterSeconds ?? 0) > 0 &&
              (err.status.retryAfterSeconds ?? 0) < 20,
          },
        );
        return { ...result, modelUsed: model };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (err instanceof GroqPayloadTooLargeError) {
          console.warn(
            `[groq] payload too large on ${model} @ ${budget.maxInputTokens} in / ${maxOutput} out — shrinking`,
          );
          continue;
        }

        if (err instanceof GroqRateLimitError) {
          console.warn(`[groq] rate limit on ${model}: ${err.message}`);
          break;
        }

        const msg = lastError.message.toLowerCase();
        if (
          msg.includes('model') ||
          msg.includes('404') ||
          msg.includes('does not exist') ||
          msg.includes('invalid_request')
        ) {
          console.warn(`[groq] model ${model} failed: ${lastError.message}`);
          break;
        }

        console.warn(`[groq] ${model} error, retrying smaller: ${lastError.message}`);
      }
    }
  }

  if (lastError instanceof GroqRateLimitError) throw lastError;
  throw new Error(
    lastError?.message?.includes('Request too large') ||
      lastError instanceof GroqPayloadTooLargeError
      ? 'Advisor context was too large for Groq free-tier limits even after shrinking. Try a narrower question (e.g. one month or one person).'
      : lastError?.message || 'All Groq models failed',
  );
}

/** Alias for streaming callers */
export const generateGroqChatCompletionStream = generateGroqChatCompletion;

/** Map Groq limits into the GeminiQuotaStatus-shaped banner fields when useful. */
export function groqStatusAsQuotaBanner(
  status: GroqRateLimitStatus,
): Partial<GeminiQuotaStatus> & { message: string } {
  return {
    exceeded: (status.remainingRequests ?? 1) <= 0,
    kind: 'daily',
    model: status.model,
    limit: status.limitRequests,
    usedLocal:
      status.limitRequests != null && status.remainingRequests != null
        ? status.limitRequests - status.remainingRequests
        : undefined,
    remainingLocal: status.remainingRequests,
    windowLabel: 'Groq free tier — requests/day (RPD) + tokens/min (TPM)',
    retryAfterSeconds: status.retryAfterSeconds,
    message: status.message,
    updatedAt: status.updatedAt,
    docsUrl: 'https://console.groq.com/docs/rate-limits',
  };
}
