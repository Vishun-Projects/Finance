'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from 'lucide-react';
import { ChartContainer } from '@/components/ui/chart-container';
import { SegmentSplitBar } from '@/components/ui/segment-split-bar';
import { BudgetProgressRow } from '@/components/ui/budget-progress-row';
import { cn, formatRupees } from '@/lib/utils';
import type { AdvisorInsightsPayload } from '@/lib/dashboard-insights';
import type { LineItemAdherence } from '@/lib/plan-adherence-service';

interface FinancialInsightsPanelProps {
  className?: string;
  compact?: boolean;
  onPromptSelect?: (prompt: string) => void;
}

export function FinancialInsightsPanel({ className, compact = false, onPromptSelect }: FinancialInsightsPanelProps) {
  const [data, setData] = useState<AdvisorInsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/advisor/insights');
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error('Failed to load advisor insights', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="size-5 animate-spin text-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn('p-6 text-center text-xs text-muted', className)}>
        Unable to load financial insights.
      </div>
    );
  }

  const maxCategoryAmount = Math.max(...data.topCategories.map((c) => c.amount), 1);

  return (
    <aside className={cn('flex flex-col gap-4 overflow-y-auto p-4 custom-scrollbar', className)}>
      <div>
        <h2 className="text-sm font-medium text-foreground">Advisor insights</h2>
        <p className="mt-0.5 text-xs text-hint">AI-powered analysis of your finances</p>
      </div>

      {data.dynamicInsights.length > 0 && (
        <section className="card-base space-y-2 p-3">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Key insights</h3>
          <ul className="space-y-1.5">
            {data.dynamicInsights.map((insight) => (
              <li
                key={insight.message}
                className={cn(
                  'text-xs leading-relaxed',
                  insight.type === 'warning' && 'text-[var(--warning)]',
                  insight.type === 'positive' && 'text-[var(--success)]',
                  insight.type === 'pattern' && 'text-muted',
                )}
              >
                {insight.message}
              </li>
            ))}
          </ul>
          {onPromptSelect && data.overBudgetBuckets[0] && (
            <button
              type="button"
              className="mt-2 text-left text-[11px] text-info underline-offset-2 hover:underline"
              onClick={() => onPromptSelect(`Why is ${data.overBudgetBuckets[0].label} over budget?`)}
            >
              Ask AI about {data.overBudgetBuckets[0].label}
            </button>
          )}
        </section>
      )}

      {(data.segmentSplit.needs + data.segmentSplit.wants + data.segmentSplit.savings) > 0 && (
        <section className="card-base p-3">
          <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-hint">
            Needs · Wants · Savings
          </h3>
          <SegmentSplitBar split={data.segmentSplit} showIdealHint={!compact} />
        </section>
      )}

      {data.monthlyTrends.length >= 2 && !compact && (
        <section className="card-base p-3">
          <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-hint">
            Monthly spending · last 6 months
          </h3>
          <ChartContainer height={130}>
            <LineChart data={data.monthlyTrends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <YAxis hide tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => formatRupees(value)}
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line type="monotone" dataKey="expenses" stroke="var(--danger)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </section>
      )}

      {data.topCategories.length > 0 && (
        <section className="card-base p-3">
          <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Spending by category</h3>
          <div className="space-y-2">
            {data.topCategories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors active:bg-muted/40"
              >
                <span className="w-16 shrink-0 truncate text-xs text-foreground">{cat.name}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-[var(--chart-1)]"
                    style={{ width: `${(cat.amount / maxCategoryAmount) * 100}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-muted">
                  {formatRupees(cat.amount)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.overBudgetBuckets.length > 0 && (
        <section className="card-base p-3">
          <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Over budget</h3>
          <div className="space-y-2">
            {data.overBudgetBuckets.map((bucket) => (
              <BudgetProgressRow
                key={bucket.key}
                bucket={bucket}
                href={`/transactions?lineItem=${encodeURIComponent(bucket.label)}`}
              />
            ))}
          </div>
        </section>
      )}

      {data.unstartedLines.length > 0 && (
        <section className="card-base p-3">
          <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-hint">
            Planned but not started
          </h3>
          <div className="space-y-1.5">
            {data.unstartedLines.map((line: LineItemAdherence) => (
              <div key={line.label} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-foreground">{line.label}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {formatRupees(0)}/{formatRupees(line.planned)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {onPromptSelect && (
        <section className="flex flex-wrap gap-2">
          {[
            'Analyze my spending this month',
            'Show my savings gap',
            data.overBudgetBuckets[0]
              ? `Why is ${data.overBudgetBuckets[0].label} over budget?`
              : 'Summarize my financial health',
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPromptSelect(prompt)}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </section>
      )}
    </aside>
  );
}
