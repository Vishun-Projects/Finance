export interface ISODateRange {
  startDate: string;
  endDate: string;
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]!;
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


