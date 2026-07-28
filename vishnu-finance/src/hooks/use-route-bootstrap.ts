'use client';

import { useLayoutEffect, useMemo, useState } from 'react';

const store = new Map<string, unknown>();

type BootstrapOptions<T> = {
  isEmpty?: (data: T) => boolean;
  userId?: string | null;
};

function pickBootstrap<T>(cached: T | undefined, serverData: T, isEmpty?: (data: T) => boolean): T {
  if (cached === undefined) return serverData;
  if (isEmpty?.(serverData) && !isEmpty?.(cached)) return cached;
  if (isEmpty?.(cached) && !isEmpty?.(serverData)) return serverData;
  return serverData;
}

function resolveCacheKey(routeKey: string, userId?: string | null): string {
  return userId ? `${routeKey}:${userId}` : routeKey;
}

/** Persist last server bootstrap per route for instant paint on back navigation. */
export function useRouteBootstrap<T>(
  routeKey: string,
  serverData: T,
  options?: BootstrapOptions<T>,
): T {
  const isEmpty = options?.isEmpty;
  const cacheKey = useMemo(
    () => resolveCacheKey(routeKey, options?.userId),
    [routeKey, options?.userId],
  );

  const [display, setDisplay] = useState<T>(() =>
    pickBootstrap(store.get(cacheKey) as T | undefined, serverData, isEmpty),
  );

  useLayoutEffect(() => {
    const cached = store.get(cacheKey) as T | undefined;
    const next = pickBootstrap(cached, serverData, isEmpty);
    store.set(cacheKey, next);
    setDisplay(next);
  }, [cacheKey, serverData, isEmpty]);

  return display;
}

export function clearRouteBootstrap(routeKey?: string) {
  if (routeKey) {
    for (const key of [...store.keys()]) {
      if (key === routeKey || key.startsWith(`${routeKey}:`)) {
        store.delete(key);
      }
    }
    return;
  }
  store.clear();
}

const APP_BOOTSTRAP_ROUTES = [
  '/dashboard',
  '/plans',
  '/transactions',
  '/financial-health',
  '/advisor',
] as const;

/** Clear cached client bootstraps for all major app routes (e.g. after import or logout). */
export function clearAllAppRouteBootstraps() {
  for (const key of [...store.keys()]) {
    if (APP_BOOTSTRAP_ROUTES.some((route) => key === route || key.startsWith(`${route}:`))) {
      store.delete(key);
    }
  }
}
