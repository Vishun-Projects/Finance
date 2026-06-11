'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CashflowForecast } from '@/lib/cashflow-forecast-service';

export function CashflowForecastPanel() {
  const [forecast, setForecast] = useState<CashflowForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/cashflow-forecast')
      .then((r) => r.json())
      .then(setForecast)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Month-end cashflow</CardTitle>
        <CardDescription>Linear projection from salary, recurring bills, and balance</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <Skeleton className="h-16 w-full" />}
        {forecast && (
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">Starting balance</p>
              <p className="text-lg font-semibold tabular-nums">₹{forecast.startingBalance.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Projected month-end</p>
              <p className="text-lg font-semibold tabular-nums">₹{forecast.endingBalance.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Recurring outflow/mo</p>
              <p className="text-lg font-semibold tabular-nums">₹{forecast.recurringMonthlyOutflow.toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
