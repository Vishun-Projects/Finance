'use client';

import { useEffect, useState } from 'react';
import type { GeminiQuotaStatus } from '@/lib/gemini-quota';
import { cn } from '@/lib/utils';

function formatRenewal(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function AdvisorQuotaBanner({
  quota,
  groq,
  activeProvider,
  providerNotice,
  className,
}: {
  quota: GeminiQuotaStatus | null;
  groq?: {
    remainingRequests?: number;
    limitRequests?: number;
    remainingTokens?: number;
    limitTokens?: number;
    resetRequests?: string;
    resetTokens?: string;
    message?: string;
    model?: string;
    retryAfterSeconds?: number;
  } | null;
  activeProvider?: 'gemini' | 'groq' | null;
  providerNotice?: string | null;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!quota?.exceeded && activeProvider !== 'groq' && !groq?.retryAfterSeconds) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [quota?.exceeded, quota?.retryAfterSeconds, quota?.renewsAt, activeProvider, groq?.retryAfterSeconds]);

  const showGroq = activeProvider === 'groq' || Boolean(providerNotice) || Boolean(groq);
  if (!quota && !showGroq) return null;

  const renewsInMs = quota?.renewsAt ? new Date(quota.renewsAt).getTime() - now : null;
  const retryLeft =
    quota?.retryAfterSeconds != null && quota.updatedAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(quota.updatedAt).getTime() + quota.retryAfterSeconds * 1000 - now) /
              1000,
          ),
        )
      : groq?.retryAfterSeconds != null
        ? Math.max(0, groq.retryAfterSeconds)
        : null;

  const showWarning =
    showGroq ||
    quota?.exceeded ||
    (quota?.remainingLocal != null && quota.remainingLocal <= 2);

  if (!showWarning && (quota?.usedLocal ?? 0) === 0 && quota?.limit == null) return null;

  const groqModel =
    groq?.model ||
    (typeof providerNotice === 'string'
      ? providerNotice.match(/Groq \(([^)]+)\)/)?.[1]
      : undefined);

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-xs leading-relaxed',
        showGroq
          ? 'border-[var(--info)]/40 bg-[var(--info)]/10 text-foreground'
          : quota?.exceeded
            ? 'border-[var(--danger)]/40 bg-[var(--danger)]/10 text-foreground'
            : 'border-border/70 bg-card/70 text-muted',
        className,
      )}
    >
      <p className="font-medium text-foreground">
        {showGroq
          ? 'Using Groq free tier'
          : quota?.exceeded
            ? 'Gemini quota limit'
            : 'Gemini usage (this server)'}
      </p>
      {providerNotice ? <p className="mt-0.5">{providerNotice}</p> : null}
      {!providerNotice && quota ? <p className="mt-0.5">{quota.message}</p> : null}
      {showGroq && groq?.message ? <p className="mt-0.5 text-muted">{groq.message}</p> : null}

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 tabular-nums text-[11px]">
        {showGroq && groqModel ? <span>Model: {groqModel}</span> : null}
        {!showGroq && quota?.model ? <span>Model: {quota.model}</span> : null}
        {showGroq && groq?.limitRequests != null ? (
          <span>
            Groq RPD left: {groq.remainingRequests ?? '—'}/{groq.limitRequests}
          </span>
        ) : null}
        {showGroq && groq?.limitTokens != null ? (
          <span>
            Groq TPM left: {groq.remainingTokens ?? '—'}/{groq.limitTokens}
          </span>
        ) : null}
        {!showGroq && quota?.limit != null ? (
          <span>
            Limit: {quota.limit}
            {quota.kind === 'daily' ? '/day' : ''}
          </span>
        ) : null}
        {!showGroq && quota?.usedLocal != null ? <span>Used (local): {quota.usedLocal}</span> : null}
        {!showGroq && quota?.remainingLocal != null && quota.limit != null ? (
          <span>Remaining (est.): {quota.remainingLocal}</span>
        ) : null}
        {quota?.kind === 'daily' && quota.renewsAt ? (
          <span>Gemini renews ~ {formatRenewal(quota.renewsAt)} IST</span>
        ) : null}
        {retryLeft != null && retryLeft > 0 ? <span>Retry in ~{retryLeft}s</span> : null}
        {renewsInMs != null && renewsInMs > 0 && quota?.kind === 'daily' ? (
          <span>~{Math.ceil(renewsInMs / 3600000)}h until Gemini reset</span>
        ) : null}
      </div>
      <a
        href={
          showGroq
            ? 'https://console.groq.com/docs/rate-limits'
            : quota?.docsUrl || 'https://ai.google.dev/gemini-api/docs/rate-limits'
        }
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block text-[11px] text-primary underline-offset-2 hover:underline"
      >
        {showGroq ? 'Groq rate limits' : 'Gemini rate limits'}
      </a>
    </div>
  );
}
