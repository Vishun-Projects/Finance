'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DetectedRecurringBill } from '@/lib/recurring-detection';

export interface RecurringBillsResponse {
  patterns: DetectedRecurringBill[];
  mandates: DetectedRecurringBill[];
  habits: DetectedRecurringBill[];
}

let cached: RecurringBillsResponse | null = null;
let inflight: Promise<RecurringBillsResponse> | null = null;

export async function fetchRecurringBills(): Promise<RecurringBillsResponse> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch('/api/recurring/detect')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load recurring bills');
      return res.json() as Promise<RecurringBillsResponse>;
    })
    .then((data) => {
      cached = data;
      inflight = null;
      return data;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}

export function invalidateRecurringBillsCache() {
  cached = null;
}

export function useRecurringBills() {
  const [data, setData] = useState<RecurringBillsResponse | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (force) cached = null;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRecurringBills();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    patterns: data?.patterns ?? [],
    mandates: data?.mandates ?? [],
    habits: data?.habits ?? [],
    loading,
    error,
    refresh: () => load(true),
  };
}
