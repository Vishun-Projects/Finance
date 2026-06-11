'use client';

import { useLayoutEffect, useState } from 'react';

const store = new Map<string, unknown>();

/** Persist last server bootstrap per route for instant paint on back navigation. */
export function useRouteBootstrap<T>(routeKey: string, serverData: T): T {
  const [display, setDisplay] = useState<T>(() => {
    const cached = store.get(routeKey) as T | undefined;
    return cached ?? serverData;
  });

  useLayoutEffect(() => {
    store.set(routeKey, serverData);
    setDisplay(serverData);
  }, [routeKey, serverData]);

  return display;
}

export function clearRouteBootstrap(routeKey?: string) {
  if (routeKey) store.delete(routeKey);
  else store.clear();
}
