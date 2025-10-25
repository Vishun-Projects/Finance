import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * A utility function to merge Tailwind CSS classes with clsx.
 *
 * @param {...ClassValue[]} inputs - The class values to merge.
 * @returns {string} The merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as a currency string.
 *
 * @param {number | string} amount - The amount to format.
 * @param {string} [currency='INR'] - The currency code to use.
 * @returns {string} The formatted currency string.
 */
export function formatCurrency(amount: number | string, currency = 'INR'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(numAmount)
}

/**
 * Formats a date as a string.
 *
 * @param {Date | string} date - The date to format.
 * @returns {string} The formatted date string.
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj)
}

/**
 * Formats a date and time as a string.
 *
 * @param {Date | string} date - The date to format.
 * @returns {string} The formatted date and time string.
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

/**
 * Calculates the percentage of a part in relation to a total.
 *
 * @param {number} part - The part value.
 * @param {number} total - The total value.
 * @returns {number} The calculated percentage.
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

/**
 * Calculates the number of days until a given date.
 *
 * @param {Date | string} date - The target date.
 * @returns {number} The number of days until the target date.
 */
export function getDaysUntil(date: Date | string): number {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Generates a random ID.
 *
 * @returns {string} The generated ID.
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds have elapsed since the last time the debounced function was invoked.
 *
 * @param {T} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {(...args: Parameters<T>) => void} The new debounced function.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}