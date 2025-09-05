import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amount as Indian Rupees with proper symbol and formatting
 * @param amount - The amount to format
 * @param showDecimals - Whether to show decimal places (default: true)
 * @returns Formatted string with ₹ symbol
 */
export function formatRupees(amount: number | string | null | undefined, showDecimals: boolean = true): string {
  if (amount === null || amount === undefined || amount === '') {
    return '₹0';
  }
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '₹0';
  }
  
  if (showDecimals) {
    return `₹${numAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  } else {
    return `₹${numAmount.toLocaleString('en-IN')}`;
  }
}

/**
 * Format amount as Indian Rupees for display (compact)
 * @param amount - The amount to format
 * @returns Formatted string with ₹ symbol
 */
export function formatRupeesCompact(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '₹0';
  }
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '₹0';
  }
  
  if (numAmount >= 10000000) { // 1 Crore
    return `₹${(numAmount / 10000000).toFixed(1)}Cr`;
  } else if (numAmount >= 100000) { // 1 Lakh
    return `₹${(numAmount / 100000).toFixed(1)}L`;
  } else if (numAmount >= 1000) { // 1 Thousand
    return `₹${(numAmount / 1000).toFixed(1)}K`;
  } else {
    return `₹${numAmount.toLocaleString('en-IN')}`;
  }
}
