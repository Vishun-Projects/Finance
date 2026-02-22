'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { debugLogger } from '@/lib/mobile/debug-logger';

export default function FetchInterceptor() {
    const originalFetchRef = useRef<typeof fetch | null>(null);
    const isInterceptedRef = useRef(false);

    useEffect(() => {
        // Initialize logger
        debugLogger.init();

        // Only intercept on mobile/native platforms for base URL redirection,
        // but we can log network for all platforms if desired.
        // For now, keep redirection limited to native.
        const isNative = Capacitor.isNativePlatform();

        if (isInterceptedRef.current) return;

        // Store original fetch
        if (!originalFetchRef.current) {
            originalFetchRef.current = window.fetch.bind(window);
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vishun-finance.vercel.app';

        window.fetch = async (...args) => {
            let [resource, config] = args;
            const method = config?.method || 'GET';

            // Robust URL extraction for logging
            let url = 'Unknown URL';
            if (typeof resource === 'string') {
                url = resource;
            } else if (resource instanceof URL) {
                url = resource.toString();
            } else if (resource instanceof Request) {
                url = resource.url;
            }

            // Log start of request
            debugLogger.logNetwork(method, url);

            // Base URL detection & redirection for native
            if (isNative) {
                const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
                const isLocalOrigin = currentOrigin.includes('localhost') || currentOrigin.startsWith('file://') || currentOrigin.startsWith('capacitor://');

                if (isLocalOrigin) {
                    const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

                    if (typeof resource === 'string' && resource.startsWith('/')) {
                        // Redirect relative strings
                        resource = `${cleanApiUrl}${resource}`;
                    } else if (resource instanceof URL && resource.origin === window.location.origin) {
                        // Redirect relative URL objects
                        resource = new URL(resource.pathname + resource.search, cleanApiUrl);
                    } else if (resource instanceof Request && (resource.url.startsWith('/') || resource.url.startsWith('file://') || resource.url.startsWith('capacitor://'))) {
                        // Handle relative Request objects (common for Server Actions)
                        // In Capacitor, a relative request might sometimes show up with origin, but still needs redirection
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

                // Clone response to read body for debugging without consuming it
                try {
                    const clonedRes = response.clone();
                    const contentType = clonedRes.headers.get('content-type');

                    if (contentType && contentType.includes('application/json')) {
                        const body = await clonedRes.json().catch(() => 'JSON parse failed');
                        debugLogger.logNetwork(method, url, response.status, undefined, body);
                    } else {
                        debugLogger.logNetwork(method, url, response.status, undefined, 'Non-JSON response');
                    }
                } catch (e) {
                    debugLogger.logNetwork(method, url, response.status, 'Body read failed');
                }

                return response;
            } catch (error: any) {
                debugLogger.logNetwork(method, url, undefined, error.message);
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
