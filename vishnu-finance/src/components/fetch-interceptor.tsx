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

    if (!originalFetchRef.current) {
      originalFetchRef.current = window.fetch.bind(window);
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vishun-finance.vercel.app';

    window.fetch = async (...args) => {
      let resource = args[0];
      let config = args[1] ? { ...args[1] } : {};
      const method = config.method || 'GET';

      let url = 'Unknown URL';
      if (typeof resource === 'string') {
        url = resource;
      } else if (resource instanceof URL) {
        url = resource.toString();
      } else if (resource instanceof Request) {
        url = resource.url;
      }

      debugLogger.logNetwork(method, url);

      if (isNative) {
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
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
      }

      try {
        const response = await originalFetchRef.current!(resource, config);

        try {
          const clonedRes = response.clone();
          const contentType = clonedRes.headers.get('content-type');
          const logBodies = process.env.NODE_ENV !== 'production';

          if (logBodies && contentType && contentType.includes('application/json')) {
            const body = await clonedRes.json().catch(() => 'JSON parse failed');
            debugLogger.logNetwork(method, url, response.status, undefined, body);
          } else {
            debugLogger.logNetwork(method, url, response.status);
          }
        } catch {
          debugLogger.logNetwork(method, url, response.status, 'Body read failed');
        }

        return response;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Network error';
        debugLogger.logNetwork(method, url, undefined, message);
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
