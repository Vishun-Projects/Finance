'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { PageMandate } from '@/components/layout/page-mandate';
import { cn } from '@/lib/utils';
import type { AdvisorInsightsPayload } from '@/lib/dashboard-insights';

interface FinancialInsightsPanelProps {
  className?: string;
  onPromptSelect?: (prompt: string) => void;
}

export function FinancialInsightsPanel({ className, onPromptSelect }: FinancialInsightsPanelProps) {
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

  return (
    <aside className={cn('flex flex-col gap-4 p-4 custom-scrollbar', className)}>
      <PageMandate
        className="max-lg:hidden"
        title="Advisor"
        mandate="AI help and short insights — charts live on Dashboard, Plans, and Health."
        metrics={data.dynamicInsights.slice(0, 2).map((insight) => ({
          label: insight.type === 'warning' ? 'Alert' : 'Insight',
          value: insight.message.length > 28 ? `${insight.message.slice(0, 28)}…` : insight.message,
          tone: insight.type === 'warning' ? 'warning' : insight.type === 'positive' ? 'success' : 'default',
        }))}
      />

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
              Ask AI about {data.overBudgetBuckets[0].label} →
            </button>
          )}
        </section>
      )}

      <section className="card-base space-y-2 p-3">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">See details on</h3>
        <ul className="space-y-2 text-xs">
          <li>
            <Link href="/dashboard" className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
              Dashboard — month pulse & categories
              <ArrowRight className="size-3" />
            </Link>
          </li>
          <li>
            <Link href="/plans?tab=deadlines" className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
              Plans — bills, dues & funding gap
              <ArrowRight className="size-3" />
            </Link>
          </li>
          <li>
            <Link href="/financial-health" className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
              Health — score & trends
              <ArrowRight className="size-3" />
            </Link>
          </li>
          <li>
            <Link href="/transactions" className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
              Transactions — all money movement
              <ArrowRight className="size-3" />
            </Link>
          </li>
        </ul>
      </section>

      {onPromptSelect && (
        <section className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Open in AI Chat</p>
          <div className="flex flex-wrap gap-2">
            {[
              'Analyze my spending this month',
              'Show my savings gap',
              data.disciplineSummary?.status === 'overcommitted'
                ? 'Am I overcommitted on goals and dues?'
                : data.overBudgetBuckets[0]
                  ? `Why is ${data.overBudgetBuckets[0].label} over budget?`
                  : 'Summarize my financial health',
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onPromptSelect(prompt)}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                {prompt} →
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
