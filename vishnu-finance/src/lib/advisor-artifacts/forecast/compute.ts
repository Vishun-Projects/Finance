import type { ForecastComputeResult, ForecastWindow, PaceTarget, WindowBucketRow } from './types';
import { computePaceBreakdown } from './pace';
import { computeSuggestedPace } from './suggested';
import type { TransactionDetail } from '@/lib/financial-analysis';

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function etaFromMonths(months: number | null, now = new Date()): string | null {
  if (months == null) return null;
  const d = new Date(now);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function monthsToFund(remaining: number, monthlyPace: number): number | null {
  if (monthlyPace <= 0) return null;
  return Math.ceil(remaining / monthlyPace);
}

export function formatForecastPromptBlock(result: {
  timeline: ForecastComputeResult['timeline'];
  notes: string[];
}): string {
  const { timeline } = result;
  return [
    '=== GOAL TIMELINE (DETERMINISTIC — DO NOT INVENT NUMBERS) ===',
    'The app UI already shows this timeline. Narrate ONLY these figures.',
    'NEVER invent ETAs, paces, or moralizing phrases. NEVER dump Needs/Wants/Savings tables.',
    `title: ${timeline.title}`,
    `window_mode: ${timeline.windowMode}`,
    `lookback: ${timeline.lookbackLabel}`,
    `current_pace_mo: ${timeline.currentPaceMonthly}`,
    `suggested_pace_mo: ${timeline.suggestedPaceMonthly}`,
    timeline.goalsFundingNeedMonthly != null
      ? `goals_funding_need_mo: ${timeline.goalsFundingNeedMonthly}`
      : null,
    'steps:',
    ...timeline.suggestedSteps.map((s) => `- ${s}`),
    'milestones:',
    ...timeline.milestones.map(
      (m) =>
        `- ${m.label}: need ${m.remaining}; current=${m.currentEta ?? 'unreachable'}; suggested=${m.suggestedEta ?? 'unreachable'}`,
    ),
    timeline.verdict,
    'Your job: briefly explain current vs suggested ETAs. Keep a short comparison table only.',
    '=== END TIMELINE ===',
  ]
    .filter(Boolean)
    .join('\n');
}

export function computeForecastResult(args: {
  transactions: TransactionDetail[];
  targets: PaceTarget[];
  window: ForecastWindow;
  windowBuckets: WindowBucketRow[];
  goalsFundingNeedMonthly?: number | null;
  now?: Date;
}): ForecastComputeResult {
  const now = args.now ?? new Date();
  const breakdown = computePaceBreakdown(args.transactions, args.window);

  // No capacity.available fallback — empty window ⇒ 0 with clear verdict
  const currentPace = breakdown.periodsUsed > 0 ? breakdown.monthlyPace : 0;
  const noActivity = breakdown.periodsUsed === 0 || (breakdown.totalIncome === 0 && breakdown.totalExpense === 0);

  const { suggested, steps } = computeSuggestedPace({
    currentPace,
    windowBuckets: args.windowBuckets,
    goalsFundingNeedMonthly: args.goalsFundingNeedMonthly,
  });

  const milestones = args.targets.map((t) => {
    const currentMonths = monthsToFund(t.remaining, currentPace);
    const suggestedMonths = monthsToFund(t.remaining, suggested);
    return {
      id: t.id,
      label: t.label,
      remaining: t.remaining,
      currentMonths,
      currentEta: currentMonths == null ? null : etaFromMonths(currentMonths, now),
      suggestedMonths,
      suggestedEta: suggestedMonths == null ? null : etaFromMonths(suggestedMonths, now),
    };
  });

  let verdict: string;
  if (noActivity) {
    verdict = `No transaction activity in this window (${args.window.label}). Current pace is ₹0/mo; add data or widen the window.`;
  } else if (currentPace <= 0) {
    verdict = `At ${formatInr(currentPace)}/mo average net in this window, goals that need surplus stay unreachable until net turns positive. Suggested ${formatInr(suggested)}/mo uses window-scoped plan gaps.`;
  } else {
    verdict = `At ${formatInr(currentPace)}/mo average net in this window; suggested ${formatInr(suggested)}/mo if window plan gaps above are closed.`;
  }

  const timeline = {
    title: 'Goal timeline: current pace vs suggested',
    lookbackLabel: `${args.window.label} · mode=${args.window.mode} · ${breakdown.periodsUsed} period(s)`,
    windowMode: args.window.mode,
    history: breakdown.periodRows,
    currentPaceMonthly: currentPace,
    suggestedPaceMonthly: suggested,
    goalsFundingNeedMonthly:
      args.goalsFundingNeedMonthly != null && args.goalsFundingNeedMonthly > 0
        ? Math.round(args.goalsFundingNeedMonthly * 100) / 100
        : null,
    suggestedSteps: steps,
    milestones,
    verdict,
  };

  const notes = [
    `WINDOW: ${args.window.label} (${args.window.startDate.toISOString().slice(0, 10)} → ${args.window.endDate.toISOString().slice(0, 10)}; mode=${args.window.mode})`,
    `CURRENT_PACE_MO: ${currentPace}`,
    `SUGGESTED_PACE_MO: ${suggested}`,
    args.goalsFundingNeedMonthly != null
      ? `GOALS_FUNDING_NEED_MO: ${args.goalsFundingNeedMonthly}`
      : null,
    `PERIODS: ${breakdown.periodRows.map((m) => `${m.label}=${m.net}`).join(' | ') || 'none'}`,
    ...steps.map((s) => `STEP: ${s}`),
    ...milestones.map(
      (m) =>
        `MILESTONE ${m.label}: need ${m.remaining} | current=${m.currentEta ?? 'unreachable'} | suggested=${m.suggestedEta ?? 'unreachable'}`,
    ),
    verdict,
  ].filter(Boolean) as string[];

  const promptBlock = formatForecastPromptBlock({ timeline, notes });

  const artifact = {
    kind: 'chart' as const,
    title: timeline.title,
    payload: {
      notes,
      timeline,
    },
  };

  return {
    timeline,
    notes,
    promptBlock,
    artifact,
    window: args.window,
    windowBuckets: args.windowBuckets,
  };
}
