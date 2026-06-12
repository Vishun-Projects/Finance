'use client';

import { useLayoutEffect, useState } from 'react';

const store = new Map<string, unknown>();

type BootstrapOptions<T> = {
  isEmpty?: (data: T) => boolean;
};

function pickBootstrap<T>(cached: T | undefined, serverData: T, isEmpty?: (data: T) => boolean): T {
  if (cached === undefined) return serverData;
  if (isEmpty?.(serverData) && !isEmpty?.(cached)) return cached;
  if (isEmpty?.(cached) && !isEmpty?.(serverData)) return serverData;
  return serverData;
}

/** Persist last server bootstrap per route for instant paint on back navigation. */
export function useRouteBootstrap<T>(
  routeKey: string,
  serverData: T,
  options?: BootstrapOptions<T>,
): T {
  const isEmpty = options?.isEmpty;

  const [display, setDisplay] = useState<T>(() =>
    pickBootstrap(store.get(routeKey) as T | undefined, serverData, isEmpty),
  );

  useLayoutEffect(() => {
    const cached = store.get(routeKey) as T | undefined;
    const next = pickBootstrap(cached, serverData, isEmpty);
    store.set(routeKey, next);
    setDisplay(next);
  }, [routeKey, serverData, isEmpty]);

  return display;
}

export function clearRouteBootstrap(routeKey?: string) {
  if (routeKey) store.delete(routeKey);
  else store.clear();
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
  for (const key of APP_BOOTSTRAP_ROUTES) {
    store.delete(key);
  }
}
