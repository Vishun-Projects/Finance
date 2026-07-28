import type { WindowBucketRow } from './types';

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/**
 * suggestedMonthly = max(0, currentPace) + Σ overspends + Σ unused savings-like
 * All bucket rows must be window-scoped (same clock as currentPace).
 */
export function computeSuggestedPace(args: {
  currentPace: number;
  windowBuckets: WindowBucketRow[];
  goalsFundingNeedMonthly?: number | null;
}): { suggested: number; steps: string[] } {
  const steps: string[] = [];
  let overspendCut = 0;
  let unusedSavings = 0;

  for (const b of args.windowBuckets) {
    const over = Math.round((b.actualMonthly - b.plannedMonthly) * 100) / 100;
    if (over > 0) {
      overspendCut += over;
      steps.push(
        `${b.label}: ${formatInr(over)} over plan/mo in this window (actual ${formatInr(b.actualMonthly)} vs ${formatInr(b.plannedMonthly)}).`,
      );
    }
    const unused = Math.round((b.plannedMonthly - b.actualMonthly) * 100) / 100;
    if (unused > 0 && b.plannedMonthly > 0 && b.isSavingsLike) {
      unusedSavings += unused;
      steps.push(
        `${b.label}: ${formatInr(unused)} planned but unused/mo — redirect to goals.`,
      );
    }
  }

  if (args.currentPace < 0) {
    steps.unshift(
      `This window averages ${formatInr(args.currentPace)}/mo net (expenses above credited income).`,
    );
  } else if (args.currentPace > 0) {
    steps.unshift(`This window averages ${formatInr(args.currentPace)}/mo net surplus.`);
  } else {
    steps.unshift('No surplus in this window (net ≈ ₹0/mo).');
  }

  if (
    args.goalsFundingNeedMonthly != null &&
    Number.isFinite(args.goalsFundingNeedMonthly) &&
    args.goalsFundingNeedMonthly > 0
  ) {
    steps.push(
      `Goals/dues/wishlist funding need (discipline): ${formatInr(args.goalsFundingNeedMonthly)}/mo — shown separately, not folded into suggested.`,
    );
  }

  const suggested =
    Math.round((Math.max(0, args.currentPace) + overspendCut + unusedSavings) * 100) / 100;

  if (steps.length <= 1 && overspendCut === 0 && unusedSavings === 0) {
    steps.push('No plan gaps in this window — suggested equals max(0, current pace).');
  }

  return { suggested, steps };
}
