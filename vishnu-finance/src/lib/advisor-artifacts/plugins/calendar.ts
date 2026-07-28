import type { TransactionDetail } from '@/lib/financial-analysis';
import type {
  ArtifactPlugin,
  AdvisorArtifact,
  CalendarDayEntry,
} from '@/lib/advisor-artifacts/types';

const CALENDAR_RE =
  /\b(calendar|heatmap|heat\s*map|daily\s+spend|spend(ing)?\s+by\s+day|by\s+day|day[- ]?by[- ]?day)\b/i;

export function detectCalendarRequest(query: string): boolean {
  return CALENDAR_RE.test(query);
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildCalendarDays(transactions: TransactionDetail[]): CalendarDayEntry[] {
  const map = new Map<string, CalendarDayEntry>();
  for (const tx of transactions) {
    const date = isoDay(tx.date instanceof Date ? tx.date : new Date(tx.date));
    const cur = map.get(date) || { date, expense: 0, income: 0, count: 0 };
    cur.count += 1;
    if (tx.type === 'EXPENSE') cur.expense += tx.amount;
    else if (tx.type === 'INCOME') cur.income += tx.amount;
    map.set(date, cur);
  }
  return [...map.values()]
    .map((d) => ({
      ...d,
      expense: Math.round(d.expense * 100) / 100,
      income: Math.round(d.income * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildCalendarArtifact(args: {
  transactions: TransactionDetail[];
  entityLabel?: string;
}): Extract<AdvisorArtifact, { kind: 'calendar' }> | null {
  const days = buildCalendarDays(args.transactions);
  if (days.length === 0) return null;

  const rangeEnd = days[days.length - 1]?.date;
  const title = args.entityLabel
    ? `Daily spending — ${args.entityLabel}`
    : 'Daily spending calendar';

  return {
    kind: 'calendar',
    title,
    payload: { days, rangeEnd },
  };
}

export function formatCalendarContextForPrompt(
  artifact: Extract<AdvisorArtifact, { kind: 'calendar' }>,
): string {
  const { days } = artifact.payload;
  const totalExpense = days.reduce((s, d) => s + d.expense, 0);
  const totalIncome = days.reduce((s, d) => s + d.income, 0);
  const peak = days.reduce(
    (best, d) => (d.expense > best.expense ? d : best),
    days[0],
  );
  const sample = days
    .slice(0, 10)
    .map((d) => `${d.date}: spent=${d.expense} received=${d.income} n=${d.count}`)
    .join('\n');

  return [
    '=== CALENDAR RENDERED BY THE APP ===',
    'The UI shows an interactive spending calendar (heatmap by day). NEVER say you cannot show a calendar.',
    `title: ${artifact.title}`,
    `day_count: ${days.length}`,
    `total_spent: ${Math.round(totalExpense * 100) / 100}`,
    `total_received: ${Math.round(totalIncome * 100) / 100}`,
    peak ? `peak_spend_day: ${peak.date} (${peak.expense})` : null,
    'sample_days:',
    sample,
    'Summarize peaks, quiet days, and totals. Do not invent an ASCII calendar.',
    '=== END CALENDAR ===',
  ]
    .filter(Boolean)
    .join('\n');
}

export const calendarArtifactPlugin: ArtifactPlugin<'calendar'> = {
  kind: 'calendar',
  detect: detectCalendarRequest,
  build: (ctx) =>
    buildCalendarArtifact({
      transactions: ctx.transactions,
      entityLabel: ctx.entityLabel,
    }),
  promptHint: formatCalendarContextForPrompt,
};
