import { headers as nextHeaders } from 'next/headers';

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

export class ServerFetchError extends Error {
  public readonly status: number;
  public readonly url: string;
  public readonly requestId?: string | null;
  public readonly payload?: unknown;

  constructor(
    message: string,
    params: { status: number; url: string; requestId?: string | null; payload?: unknown },
  ) {
    super(message);
    this.name = 'ServerFetchError';
    this.status = params.status;
    this.url = params.url;
    this.requestId = params.requestId;
    this.payload = params.payload;
  }
}

type ParseStrategy = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'response';

export interface ServerFetchOptions extends RequestInit {
  /**
   * When provided, Next.js will cache the response for the given TTL (seconds).
   * Use `false` to force dynamic rendering / `cache: 'no-store'`.
   */
  revalidate?: number | false;
  /**
   * Cache tags used by Next.js for revalidation.
   */
  tags?: string[];
  /**
   * How to parse the response. Defaults to `json`.
   */
  parseAs?: ParseStrategy;
  /**
   * Human friendly descriptor for logging.
   */
  description?: string;
  /**
   * Force skip of caching without specifying `revalidate: false`.
   */
  skipCache?: boolean;
}

const CACHEABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

async function resolveUrl(input: string | URL, inboundHeaders?: Headers): Promise<string | URL> {
  if (input instanceof URL) {
    return input;
  }

  if (ABSOLUTE_URL_REGEX.test(input)) {
    return input;
  }

  const explicitBase =
    process.env.INTERNAL_API_BASE_URL ||
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL;

  if (explicitBase) {
    return new URL(input, explicitBase);
  }

  const headersList = inboundHeaders ?? (await nextHeaders());
  const host =
    headersList.get('x-forwarded-host') ||
    headersList.get('host') ||
    process.env.VERCEL_URL ||
    'localhost:3000';
  const protocol =
    headersList.get('x-forwarded-proto') ||
    (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');

  return new URL(input, `${protocol}://${host}`);
}

async function parseResponse(
  response: Response,
  strategy: ParseStrategy,
): Promise<unknown> {
  switch (strategy) {
    case 'text':
      return response.text();
    case 'blob':
      return response.blob();
    case 'arrayBuffer':
      return response.arrayBuffer();
    case 'response':
      return response;
    case 'json':
    default:
      if (response.status === 204) {
        return null;
      }
      return response.json();
  }
}

export async function serverFetch<T = unknown>(
  input: string | URL,
  options: ServerFetchOptions = {},
): Promise<T> {
  if (typeof window !== 'undefined') {
    throw new Error('serverFetch can only be invoked on the server');
  }

  const {
    revalidate,
    tags,
    parseAs = 'json',
    description,
    skipCache,
    headers,
    ...rest
  } = options;

  const method = (rest.method ? rest.method : 'GET').toUpperCase();
  const inboundHeaders = await nextHeaders();
  const resolvedUrl = await resolveUrl(input, inboundHeaders);
  const fetchHeaders = new Headers(headers);

  if (!fetchHeaders.has('cookie')) {
    const cookie = inboundHeaders.get('cookie');
    if (cookie) {
      fetchHeaders.set('cookie', cookie);
    }
  }

  if (!fetchHeaders.has('authorization')) {
    const authorization = inboundHeaders.get('authorization');
    if (authorization) {
      fetchHeaders.set('authorization', authorization);
    }
  }

  const forwardedProto = inboundHeaders.get('x-forwarded-proto');
  const forwardedHost = inboundHeaders.get('x-forwarded-host');
  const forwardedFor = inboundHeaders.get('x-forwarded-for');

  if (forwardedProto && !fetchHeaders.has('x-forwarded-proto')) {
    fetchHeaders.set('x-forwarded-proto', forwardedProto);
  }

  if (forwardedHost && !fetchHeaders.has('x-forwarded-host')) {
    fetchHeaders.set('x-forwarded-host', forwardedHost);
  }

  if (forwardedFor && !fetchHeaders.has('x-forwarded-for')) {
    fetchHeaders.set('x-forwarded-for', forwardedFor);
  }

  if (!fetchHeaders.has('Accept') && parseAs === 'json') {
    fetchHeaders.set('Accept', 'application/json');
  }

  const shouldSkipCache = skipCache || revalidate === false || !CACHEABLE_METHODS.has(method);
  const cacheMode =
    rest.cache ??
    (shouldSkipCache ? 'no-store' : undefined);

  const nextOptions: RequestInit['next'] = {
    ...(typeof revalidate === 'number' ? { revalidate } : {}),
    ...(tags && tags.length ? { tags } : {}),
  };

  const startedAt = Date.now();

  try {
    const response = await fetch(resolvedUrl, {
      ...rest,
      method,
      headers: fetchHeaders,
      cache: cacheMode,
      next: nextOptions,
    });

    const duration = Date.now() - startedAt;
    const requestId = response.headers.get('x-request-id');

    if (!response.ok) {
      let errorPayload: unknown = undefined;
      try {
        errorPayload = await parseResponse(response, parseAs);
      } catch {
        errorPayload = await response.text().catch(() => undefined);
      }

      const message = `[serverFetch] ${description ?? response.url} failed with ${
        response.status
      } (${duration}ms)`;
      console.error(message, { requestId, payload: errorPayload });

      throw new ServerFetchError(message, {
        status: response.status,
        url: response.url,
        requestId,
        payload: errorPayload,
      });
    }

    const payload = (await parseResponse(response, parseAs)) as T;

    console.info(
      `[serverFetch] ${description ?? response.url} succeeded (${duration}ms)`,
      {
        status: response.status,
        requestId,
        revalidate,
      },
    );

    return payload;
  } catch (error) {
    const duration = Date.now() - startedAt;
    console.error(
      `[serverFetch] ${description ?? String(resolvedUrl)} threw after ${duration}ms`,
      error,
    );
    throw error;
  }
}


