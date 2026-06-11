import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Coerce API/Prisma values that may arrive as strings. */
export function toNumber(value: unknown, fallback = 0): number {
  if (value == null || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Compact INR for tight mobile cells — rounds to K/L/Cr. */
export function formatCompactRupees(amount: unknown): string {
  const value = Math.round(toNumber(amount));
  const abs = Math.abs(value);
  if (abs >= 10000000) {
    const cr = abs / 10000000;
    const formatted =
      cr >= 100
        ? Math.round(cr).toLocaleString('en-IN')
        : cr >= 10
          ? String(Math.round(cr))
          : cr.toFixed(1).replace(/\.0$/, '');
    return `${value < 0 ? '-' : ''}₹${formatted}Cr`;
  }
  if (abs >= 100000) {
    const lakhs = abs / 100000;
    const formatted =
      lakhs >= 100
        ? Math.round(lakhs).toLocaleString('en-IN')
        : lakhs >= 10
          ? String(Math.round(lakhs))
          : lakhs.toFixed(1).replace(/\.0$/, '');
    return `${value < 0 ? '-' : ''}₹${formatted}L`;
  }
  if (abs >= 1000) {
    return `${value < 0 ? '-' : ''}₹${Math.round(abs / 1000)}K`;
  }
  return formatRupees(value);
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numAmount);
}
