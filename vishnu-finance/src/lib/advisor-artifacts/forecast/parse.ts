import type { ForecastPeriod, ForecastRequest, ForecastWindow } from './types';

const WORD_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
};

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

function parseCount(raw: string): number | null {
  const n = WORD_NUM[raw.toLowerCase()] ?? Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function clampPayday(year: number, monthIndex: number, payday: number): Date {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return startOfDay(new Date(year, monthIndex, Math.min(payday, last)));
}

function parseDayMonthToken(dayRaw: string, monthRaw: string, now: Date): Date | null {
  const day = Number(dayRaw);
  const mi = MONTHS.indexOf(monthRaw.toLowerCase() as (typeof MONTHS)[number]);
  if (!Number.isFinite(day) || day < 1 || day > 31 || mi < 0) return null;
  let d = clampPayday(now.getFullYear(), mi, day);
  if (d.getTime() - now.getTime() > 60 * 86400000) {
    d = clampPayday(now.getFullYear() - 1, mi, day);
  }
  return d;
}

export function isPaceForecastQuery(query: string): boolean {
  const q = query.toLowerCase();
  if (
    /\b(predict|prediction|forecast|projection|projected|same\s+pace|current\s+pace|at\s+(this|my|the)\s+pace|when\s+will\s+i|timeline)\b/i.test(
      q,
    )
  ) {
    return true;
  }
  const mentionsTargets = /\b(goal|goals|milestone|milestones|wishlist|wish\s*lists?)\b/i.test(q);
  const mentionsWhenOrYears =
    /\b(when|pace|achieve|reach|hit|complete|year|years|predict|forecast)\b/i.test(q);
  return mentionsTargets && mentionsWhenOrYears;
}

/** Parse "salary on 30th" / "get paid on the 30th". */
export function parsePaydayFromQuery(query: string): number | undefined {
  const m = query.match(
    /\b(?:salary|salaries|paycheck|paid|pay(?:\s*day)?)\s+(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/i,
  );
  if (!m) return undefined;
  const day = Number(m[1]);
  if (!Number.isFinite(day) || day < 1 || day > 31) return undefined;
  return day;
}

export function parsePaceLookbackMonths(query: string, fallback?: number): number {
  const years = query.match(
    /\b(?:last|past|previous|prior)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+years?\b/i,
  );
  if (years) {
    const n = parseCount(years[1]);
    if (n != null) return Math.min(60, n * 12);
  }
  if (/\b(?:last|past|previous|prior)\s+year\b/i.test(query)) return 12;
  const months = query.match(
    /\b(?:last|past|previous|prior)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+months?\b/i,
  );
  if (months) {
    const n = parseCount(months[1]);
    if (n != null) return Math.min(60, n);
  }
  return fallback ?? 3;
}

export function hasExplicitLookback(query: string): boolean {
  return (
    /\b(?:last|past|previous|prior)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(months?|years?)\b/i.test(
      query,
    ) || /\b(?:last|past|previous|prior)\s+year\b/i.test(query)
  );
}

export function lastNMonthsDateRange(
  months: number,
  now = new Date(),
): { startDate: Date; endDate: Date } {
  const endDate = endOfDay(now);
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1, 0, 0, 0, 0);
  return { startDate, endDate };
}

export function buildPayCycleRanges(
  payday: number,
  cycleCount: number,
  endRef: Date,
): ForecastPeriod[] {
  const cycles: ForecastPeriod[] = [];
  let cursorEnd = endOfDay(endRef);

  for (let i = 0; i < Math.max(1, cycleCount); i += 1) {
    let start = clampPayday(cursorEnd.getFullYear(), cursorEnd.getMonth(), payday);
    if (start.getTime() > cursorEnd.getTime()) {
      const prev = new Date(cursorEnd.getFullYear(), cursorEnd.getMonth() - 1, 1);
      start = clampPayday(prev.getFullYear(), prev.getMonth(), payday);
    }
    if (start.getTime() > cursorEnd.getTime()) {
      const prev2 = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      start = clampPayday(prev2.getFullYear(), prev2.getMonth(), payday);
    }

    const label = `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} → ${cursorEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    cycles.unshift({ start, end: cursorEnd, label });
    cursorEnd = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1));
  }

  return cycles;
}

function calendarMonthPeriods(startDate: Date, endDate: Date): ForecastPeriod[] {
  const periods: ForecastPeriod[] = [];
  let y = startDate.getFullYear();
  let m = startDate.getMonth();
  const endY = endDate.getFullYear();
  const endM = endDate.getMonth();

  while (y < endY || (y === endY && m <= endM)) {
    const periodStart = startOfDay(new Date(y, m, 1));
    const periodEnd = endOfDay(new Date(y, m + 1, 0));
    const clippedStart = periodStart < startDate ? startDate : periodStart;
    const clippedEnd = periodEnd > endDate ? endDate : periodEnd;
    periods.push({
      start: clippedStart,
      end: clippedEnd,
      label: new Date(y, m, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return periods;
}

/**
 * Resolve the forecast window from the user prompt.
 * Explicit dates and pay-cycle language win over blind "last N calendar months".
 */
export function resolveForecastWindow(query: string, now = new Date()): ForecastWindow {
  const payday = parsePaydayFromQuery(query);
  const lookbackMentioned = hasExplicitLookback(query);
  const lookbackMonths = parsePaceLookbackMonths(query, 3);

  const startMatch = query.match(
    /\b(?:start\s+from|from)\s+(?:date\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  );
  const endToday = /\btill\s+today\b|\buntil\s+today\b|\bto\s+today\b|\btill\s+todays?\s+date\b/i.test(
    query,
  );
  const endMatch = query.match(
    /\b(?:till|until|to)\s+(?:todays?\s+date\s+(?:that\s+is\s+)?)?(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  );

  if (startMatch) {
    const startDate = parseDayMonthToken(startMatch[1], startMatch[2], now);
    let endDate: Date | null = null;
    if (endMatch) {
      const parsed = parseDayMonthToken(endMatch[1], endMatch[2], now);
      endDate = parsed ? endOfDay(parsed) : null;
    }
    if (!endDate && endToday) endDate = endOfDay(now);
    if (startDate && endDate && endDate >= startDate) {
      if (payday && lookbackMentioned && lookbackMonths > 1) {
        const periods = buildPayCycleRanges(payday, lookbackMonths, endDate);
        return {
          startDate: periods[0].start,
          endDate,
          payday,
          mode: 'pay_cycles',
          label: `${periods.length} pay cycle(s) ending ${endDate.toLocaleDateString('en-IN')} (payday ${payday})`,
          periods,
        };
      }
      return {
        startDate,
        endDate,
        payday,
        mode: 'explicit',
        label: `${startDate.toLocaleDateString('en-IN')} → ${endDate.toLocaleDateString('en-IN')}`,
        periods: [{ start: startDate, end: endDate, label: `${startDate.toLocaleDateString('en-IN')} → ${endDate.toLocaleDateString('en-IN')}` }],
      };
    }
  }

  if (payday) {
    const periods = buildPayCycleRanges(payday, lookbackMonths, now);
    return {
      startDate: periods[0].start,
      endDate: endOfDay(now),
      payday,
      mode: 'pay_cycles',
      label: `${periods.length} pay cycle(s) · payday ${payday}th · through ${now.toLocaleDateString('en-IN')}`,
      periods,
    };
  }

  const cal = lastNMonthsDateRange(lookbackMonths, now);
  const periods = calendarMonthPeriods(cal.startDate, cal.endDate);
  return {
    ...cal,
    mode: 'calendar_months',
    label:
      lookbackMonths >= 12 && lookbackMonths % 12 === 0
        ? `last ${lookbackMonths / 12} calendar year(s)`
        : `last ${lookbackMonths} calendar month(s)`,
    periods,
  };
}

export function parseForecastRequest(query: string, now = new Date()): ForecastRequest {
  const window = resolveForecastWindow(query, now);
  return {
    query,
    window,
    lookbackCount: hasExplicitLookback(query) ? parsePaceLookbackMonths(query, 3) : null,
  };
}
