/**
 * Deterministic suggested follow-ups — ChatGPT-style chips without LLM invention.
 */

export function suggestedFollowUps(args: {
  userMessage: string;
  intent?: string | null;
  isForecast?: boolean;
  entityLabel?: string;
  bucketLabel?: string;
}): string[] {
  const q = args.userMessage.toLowerCase();
  const chips: string[] = [];
  const isDateLookup =
    /\b(show|list|find|give|fetch|display)\b/.test(q) &&
    /\b(transaction|transactions|entries|entry)\b/.test(q) &&
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(
      q,
    );

  if (args.isForecast || /\b(pace|predict|when\s+will|timeline|goal)\b/i.test(q)) {
    chips.push(
      'Same pace last 3 months — current vs suggested timeline',
      'I get salary on the 30th — use pay cycles for the forecast',
      'Show only my top 3 goals ETAs at current pace',
    );
    return chips.slice(0, 3);
  }

  if (isDateLookup) {
    chips.push(
      'Show those same dates with category split',
      'Compare these dates against previous month same dates',
      'Export only these date transactions as CSV',
    );
    return chips;
  }

  if (args.entityLabel) {
    chips.push(
      `Break down spending with ${args.entityLabel} this month`,
      `Compare ${args.entityLabel} vs last month`,
      'Show a chart of that spending over time',
    );
    return chips.slice(0, 3);
  }

  if (args.bucketLabel || /\b(budget|wants|needs|savings|planned|actual)\b/i.test(q)) {
    const bucket = args.bucketLabel || 'Wants';
    chips.push(
      `How is my ${bucket} bucket vs plan this month?`,
      'Where can I cut to free ₹5,000/mo for goals?',
      'Export this month’s budget table as CSV',
    );
    return chips.slice(0, 3);
  }

  if (args.intent === 'goal') {
    chips.push(
      'Predict when I’ll hit my goals at this pace',
      'What’s my monthly funding gap for goals?',
      'List goals behind schedule',
    );
    return chips.slice(0, 3);
  }

  if (/\b(transaction|transactions|entries|entry)\b/.test(q)) {
    return [
      'Show top 5 highest-value transactions in this period',
      'Group these transactions by category',
      'Show only income transactions in this period',
    ];
  }

  // Low-confidence generic asks: avoid forcing irrelevant hardcoded chips.
  return [];
}

export function buildTurnStatus(args: {
  provider?: string;
  windowLabel?: string;
  txnCount?: number;
  truncated?: boolean;
  forecastMode?: boolean;
}): string {
  const parts: string[] = [];
  if (args.forecastMode) parts.push('ForecastEngine');
  if (args.windowLabel) parts.push(args.windowLabel);
  if (args.txnCount != null) parts.push(`${args.txnCount} txns`);
  if (args.provider) parts.push(`via ${args.provider}`);
  if (args.truncated) parts.push('context truncated');
  return parts.join(' · ');
}
