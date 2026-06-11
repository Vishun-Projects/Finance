'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaxHint } from '@/lib/tax-hints-service';

export function TaxHintsPanel() {
  const [hints, setHints] = useState<TaxHint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/tax-hints')
      .then((r) => r.json())
      .then((d) => setHints(d.hints ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tax hints (FY)</CardTitle>
        <CardDescription>Keyword-based estimates from transactions — not tax advice</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <Skeleton className="h-20 w-full" />}
        {!loading &&
          hints.map((h) => (
            <div key={h.section}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{h.section}</span>
                <span className="tabular-nums text-muted">
                  ₹{h.detectedAmount.toLocaleString('en-IN')} / ₹{h.limit.toLocaleString('en-IN')}
                </span>
              </div>
              <Progress value={Math.min(100, (h.detectedAmount / h.limit) * 100)} className="h-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">{h.suggestion}</p>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
