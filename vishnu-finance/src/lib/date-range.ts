export interface ISODateRange {
  startDate: string;
  endDate: string;
}

/** Calendar date in local timezone (avoids UTC shift from toISOString). */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Start of local calendar day for YYYY-MM-DD strings. */
export function parseLocalDateStart(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** End of local calendar day for YYYY-MM-DD strings. */
export function parseLocalDateEnd(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function toISODate(date: Date): string {
  return toLocalISODate(date);
}

function startOfMonth(reference: Date): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

function endOfMonth(reference: Date): Date {
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getCurrentMonthRange(reference: Date = new Date()): ISODateRange {
  const start = startOfMonth(reference);
  const end = endOfMonth(reference);
  return {
    startDate: toISODate(start),
    endDate: toISODate(end),
  };
}

export function formatMonthLabel(reference: Date = new Date(), locale: string | string[] = 'en-US'): string {
  return reference.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}


