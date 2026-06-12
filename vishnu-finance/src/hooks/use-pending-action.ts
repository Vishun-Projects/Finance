'use client';

import { useCallback, useState, useTransition } from 'react';

/**
 * Runs async work with immediate local pending state (~100ms feedback before network).
 * Combines synchronous setPending with useTransition for non-blocking UI updates.
 */
export function usePendingAction() {
  const [isPending, startTransition] = useTransition();
  const [localPending, setLocalPending] = useState(false);

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      setLocalPending(true);
      try {
        return await new Promise<T>((resolve, reject) => {
          startTransition(() => {
            void (async () => {
              try {
                const result = await action();
                resolve(result);
              } catch (error) {
                reject(error);
              }
            })();
          });
        });
      } finally {
        setLocalPending(false);
      }
    },
    [],
  );

  return { run, isPending: localPending || isPending };
}
