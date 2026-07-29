/** Install CSRF header on mutating fetch calls — runs synchronously before React effects. */
export function installFetchCsrfInterceptor(): void {
  if (typeof window === 'undefined') return;
  const flag = '__vishnuFetchCsrfInstalled';
  if ((window as unknown as Record<string, boolean>)[flag]) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const methodFromRequest =
      typeof Request !== 'undefined' && input instanceof Request ? input.method : undefined;
    const method = (init?.method ?? methodFromRequest ?? 'GET').toUpperCase();

    // Pass through unchanged for safe methods — avoids breaking Request bodies /
    // Next.js Server Actions / CapacitorHttp by forcing a second-arg clone.
    if (method === 'GET' || method === 'HEAD') {
      return originalFetch(input, init);
    }

    const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
    if (!csrfMatch) {
      return originalFetch(input, init);
    }

    const headers = new Headers(
      init?.headers ??
        (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined)
    );
    if (!headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', decodeURIComponent(csrfMatch[1]!));
    }

    if (init) {
      return originalFetch(input, { ...init, headers });
    }

    if (typeof Request !== 'undefined' && input instanceof Request) {
      return originalFetch(new Request(input, { headers }));
    }

    return originalFetch(input, { headers });
  };

  (window as unknown as Record<string, boolean>)[flag] = true;
}
