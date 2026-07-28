'use client';

import type { ForecastTimelinePayload } from '@/lib/advisor-artifacts/forecast';
import { cn } from '@/lib/utils';

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

interface AdvisorForecastTimelineProps {
  timeline: ForecastTimelinePayload;
  className?: string;
}

export function AdvisorForecastTimeline({
  timeline,
  className,
}: AdvisorForecastTimelineProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-xl border border-border/70 bg-card/70',
        className,
      )}
    >
      <div className="border-b border-border/60 px-3.5 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          {timeline.title}
        </p>
        <p className="mt-0.5 text-[10px] text-muted">{timeline.lookbackLabel}</p>
        {timeline.windowMode ? (
          <p className="mt-0.5 text-[10px] text-muted">
            Window mode: {timeline.windowMode.replace(/_/g, ' ')}
          </p>
        ) : null}
      </div>

      <div className="space-y-4 p-3.5">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-surface/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted">Current pace</p>
            <p
              className={cn(
                'text-lg font-semibold tabular-nums',
                timeline.currentPaceMonthly < 0 ? 'text-[var(--danger)]' : 'text-foreground',
              )}
            >
              {formatInr(timeline.currentPaceMonthly)}
              <span className="text-xs font-normal text-muted">/mo</span>
            </p>
            <p className="text-[10px] text-muted">Avg income − expenses in this window</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted">Suggested pace</p>
            <p className="text-lg font-semibold tabular-nums text-[var(--success)]">
              {formatInr(timeline.suggestedPaceMonthly)}
              <span className="text-xs font-normal text-muted">/mo</span>
            </p>
            <p className="text-[10px] text-muted">If you close window plan gaps below</p>
          </div>
        </div>

        {timeline.goalsFundingNeedMonthly != null && timeline.goalsFundingNeedMonthly > 0 ? (
          <div className="rounded-lg border border-border/70 bg-surface/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted">
              Goals funding need
            </p>
            <p className="text-base font-semibold tabular-nums text-foreground">
              {formatInr(timeline.goalsFundingNeedMonthly)}
              <span className="text-xs font-normal text-muted">/mo</span>
            </p>
            <p className="text-[10px] text-muted">
              From active goals/dues/wishlist — shown separately, not folded into suggested
            </p>
          </div>
        ) : null}

        <div>
          <p className="mb-1.5 text-[11px] font-medium text-foreground">Suggested steps</p>
          <ul className="space-y-1">
            {timeline.suggestedSteps.map((step) => (
              <li
                key={step}
                className="rounded-md bg-surface/50 px-2.5 py-1.5 text-[11px] leading-snug text-muted"
              >
                {step}
              </li>
            ))}
          </ul>
        </div>

        {timeline.history.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-foreground">
              Lookback periods (actual net)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {timeline.history.map((h) => (
                <div
                  key={h.label}
                  className="rounded-md border border-border/60 px-2 py-1 text-[10px]"
                >
                  <span className="text-muted">{h.label}</span>{' '}
                  <span
                    className={cn(
                      'font-medium tabular-nums',
                      h.net < 0 ? 'text-[var(--danger)]' : 'text-foreground',
                    )}
                  >
                    {formatInr(h.net)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-[11px] font-medium text-foreground">Milestone timeline</p>
          <ol className="relative space-y-3 border-l border-border pl-4">
            {timeline.milestones.map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-[1.15rem] top-1.5 size-2.5 rounded-full bg-primary" />
                <div className="rounded-lg border border-border/70 px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                    <p className="text-[11px] tabular-nums text-muted">
                      Need {formatInr(m.remaining)}
                    </p>
                  </div>
                  <div className="mt-1.5 grid gap-1 text-[11px] sm:grid-cols-2">
                    <p>
                      <span className="text-muted">If current pace: </span>
                      <span className="font-medium text-foreground">
                        {m.currentEta ?? 'unreachable (need surplus)'}
                      </span>
                      {m.currentMonths != null ? (
                        <span className="text-muted"> · ~{m.currentMonths} mo</span>
                      ) : null}
                    </p>
                    <p>
                      <span className="text-muted">If suggested pace: </span>
                      <span className="font-medium text-[var(--success)]">
                        {m.suggestedEta ?? 'unreachable'}
                      </span>
                      {m.suggestedMonths != null ? (
                        <span className="text-muted"> · ~{m.suggestedMonths} mo</span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="rounded-lg bg-surface/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
          {timeline.verdict}
        </p>
      </div>
    </div>
  );
}
