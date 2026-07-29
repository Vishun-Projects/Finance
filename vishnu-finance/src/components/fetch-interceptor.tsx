'use client';

import { useLayoutEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { debugLogger } from '@/lib/mobile/debug-logger';
import { installFetchCsrfInterceptor } from '@/lib/install-fetch-csrf';

if (typeof window !== 'undefined') {
  installFetchCsrfInterceptor();
}

export default function FetchInterceptor() {
  const originalFetchRef = useRef<typeof fetch | null>(null);
  const isInterceptedRef = useRef(false);

  useLayoutEffect(() => {
    debugLogger.init();

    const isNative = Capacitor.isNativePlatform();

    if (isInterceptedRef.current) return;

    // Remote server.url WebViews already share origin with the API — only rewrite
    // relative URLs when the document itself is on a local Capacitor origin.
    if (!isNative) return;

    if (!originalFetchRef.current) {
      originalFetchRef.current = window.fetch.bind(window);
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vishun-finance.vercel.app';

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      let resource: RequestInfo | URL = input;
      const method =
        init?.method ||
        (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET');

      let url = 'Unknown URL';
      if (typeof resource === 'string') {
        url = resource;
      } else if (resource instanceof URL) {
        url = resource.toString();
      } else if (typeof Request !== 'undefined' && resource instanceof Request) {
        url = resource.url;
      }

      debugLogger.logNetwork(String(method), url);

      const currentOrigin = window.location.origin;
      const isLocalOrigin =
        currentOrigin.includes('localhost') ||
        currentOrigin.startsWith('file://') ||
        currentOrigin.startsWith('capacitor://');

      if (isLocalOrigin) {
        const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

        if (typeof resource === 'string' && resource.startsWith('/')) {
          resource = `${cleanApiUrl}${resource}`;
        } else if (resource instanceof URL && resource.origin === window.location.origin) {
          resource = new URL(resource.pathname + resource.search, cleanApiUrl);
        } else if (
          typeof Request !== 'undefined' &&
          resource instanceof Request &&
          (resource.url.startsWith('/') ||
            resource.url.startsWith('file://') ||
            resource.url.startsWith('capacitor://'))
        ) {
          const urlObj = new URL(resource.url, window.location.origin);
          if (urlObj.origin === window.location.origin) {
            const newUrl = `${cleanApiUrl}${urlObj.pathname}${urlObj.search}`;
            resource = new Request(newUrl, resource);
          }
        }
      }

      try {
        // Preserve init exactly (including undefined) so Request bodies / RSC stay intact
        const response = init === undefined
          ? await originalFetchRef.current!(resource)
          : await originalFetchRef.current!(resource, init);

        debugLogger.logNetwork(String(method), url, response.status);
        return response;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Network error';
        debugLogger.logNetwork(String(method), url, undefined, message);
        throw error;
      }
    };

    isInterceptedRef.current = true;
    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        isInterceptedRef.current = false;
      }
    };
  }, []);

  return null;
}
