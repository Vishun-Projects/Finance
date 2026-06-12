const DEFAULT_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vishun-finance.vercel.app';

/** Allowed CORS origin — never wildcard when credentials may be used. */
export function getAllowedOrigin(request: Request): string {
  const origin = request.headers.get('origin');
  const allowed = [
    DEFAULT_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'capacitor://localhost',
    'http://localhost',
  ].filter(Boolean) as string[];

  if (origin && allowed.some((a) => origin === a || origin.startsWith(a.replace(/\/$/, '')))) {
    return origin;
  }
  return DEFAULT_ORIGIN;
}

export function corsPreflightHeaders(request: Request): Record<string, string> {
  const origin = getAllowedOrigin(request);
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
