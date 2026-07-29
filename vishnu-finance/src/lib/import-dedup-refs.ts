/** Shared reference extraction — safe for client and server bundles (no Node crypto). */

/** Extract a stable bank reference from narration for dedup hashing. */
export function extractStableReference(description: string): string | null {
  if (!description) return null;

  const patterns = [
    /\/UPI\/(\d{10,})\//i,
    /UPI:(\d{10,}):/i,
    /UPI[:\/\s-]+(\d{10,})/i,
    /NEFT[\/\s-]+([A-Z0-9]{8,24})/i,
    /IMPS[\/\s-]+([A-Z0-9]{8,24})/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  const longNums = description.match(/\b(\d{12,})\b/g);
  if (longNums && longNums.length > 0) {
    return longNums[longNums.length - 1];
  }

  return null;
}
