/** Install CSRF header on mutating fetch calls — runs synchronously before React effects. */
export function installFetchCsrfInterceptor(): void {
  if (typeof window === 'undefined') return;
  const flag = '__vishnuFetchCsrfInstalled';
  if ((window as unknown as Record<string, boolean>)[flag]) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let config = init ? { ...init } : {};
    const method = (config.method ?? 'GET').toUpperCase();

    if (method !== 'GET' && method !== 'HEAD') {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
      if (csrfMatch) {
        const headers = new Headers(config.headers ?? {});
        if (!headers.has('X-CSRF-Token')) {
          headers.set('X-CSRF-Token', decodeURIComponent(csrfMatch[1]!));
        }
        config = { ...config, headers };
      }
    }

    return originalFetch(input, config);
  };

  (window as unknown as Record<string, boolean>)[flag] = true;
}
