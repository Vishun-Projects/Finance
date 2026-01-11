'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

export default function FetchInterceptor() {
    const originalFetchRef = useRef<typeof fetch | null>(null);
    const isInterceptedRef = useRef(false);

    useEffect(() => {
        // Only intercept on mobile/native platforms
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        if (isInterceptedRef.current) return;

        // Store original fetch
        if (!originalFetchRef.current) {
            originalFetchRef.current = window.fetch;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vishun-finance.vercel.app';

        console.log('[FetchInterceptor] Initializing with API URL:', apiUrl);

        window.fetch = async (...args) => {
            let [resource, config] = args;

            // Check if it's a relative API request
            if (typeof resource === 'string' && resource.startsWith('/api')) {
                // Prepend the base URL
                const newUrl = `${apiUrl}${resource}`;
                console.log(`[FetchInterceptor] Redirecting ${resource} -> ${newUrl}`);
                resource = newUrl;
            } else if (resource instanceof Request) {
                // Handle Request objects
                if (resource.url.startsWith('/') && resource.url.includes('/api')) {
                    const newUrl = `${apiUrl}${resource.url}`;
                    console.log(`[FetchInterceptor] Redirecting Request ${resource.url} -> ${newUrl}`);
                    // We have to clone the request to change the URL, which is immutable
                    resource = new Request(newUrl, resource);
                }
            }

            // Call original fetch with modified URL
            return originalFetchRef.current!(resource, config);
        };

        isInterceptedRef.current = true;

        // Cleanup
        return () => {
            if (originalFetchRef.current) {
                window.fetch = originalFetchRef.current;
                isInterceptedRef.current = false;
            }
        };
    }, []);

    return null;
}
