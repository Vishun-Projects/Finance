const BLOCKED_PATTERNS = [
  /\bbuy\b.*\b(stock|share|fund|etf)\b/i,
  /\bsell\b.*\b(stock|share|fund|etf)\b/i,
  /\brecommend\b.*\b(invest|stock|fund)\b/i,
  /\bbest\b.*\b(fund|stock|mutual fund)\b/i,
  /\bshould i invest in\b/i,
];

const DISCLAIMER =
  'This is general financial planning information based on your data, not SEBI-regulated investment advice.';

export type AdvisorIntent =
  | 'affordability'
  | 'diagnosis'
  | 'scenario'
  | 'tax'
  | 'goal'
  | 'general';

export function classifyAdvisorIntent(message: string): AdvisorIntent {
  const q = message.toLowerCase();
  if (/can i afford|afford this|buy (a|this)|purchase/.test(q)) return 'affordability';
  if (/why (is|did)|decreasing|dropped|where did my money/.test(q)) return 'diagnosis';
  if (/what if|impact of|loan|car|marriage|job loss/.test(q)) return 'scenario';
  if (/tax|80c|80d|save tax|itr/.test(q)) return 'tax';
  if (/goal|on track|retirement|sip needed/.test(q)) return 'goal';
  return 'general';
}

export function isBlockedInvestmentAdvice(text: string): boolean {
  return BLOCKED_PATTERNS.some((re) => re.test(text));
}

export function validateAdvisorResponse(response: string): {
  safe: boolean;
  response: string;
  blocked: boolean;
} {
  if (isBlockedInvestmentAdvice(response)) {
    return {
      safe: false,
      blocked: true,
      response:
        'I can help analyze your spending, savings, and goals using your data, but I cannot recommend specific investments. ' +
        DISCLAIMER,
    };
  }
  const withDisclaimer = response.includes(DISCLAIMER)
    ? response
    : `${response.trim()}\n\n_${DISCLAIMER}_`;
  return { safe: true, blocked: false, response: withDisclaimer };
}

export function buildAdvisorSystemPreamble(): string {
  return [
    'You are Vishnu Finance AI copilot for Indian personal finance.',
    'Use ONLY the structured user finance data provided. Cite specific numbers from it.',
    'The context includes ALL plan buckets, category→bucket mappings, people, stores, and transactions — not only one topic.',
    'Plan buckets (Needs / Wants / Savings / etc.) are rollups of many expense categories — they are not category names on individual transactions.',
    'When asked about budget performance, include EVERY plan bucket (good and bad), not only over-budget ones.',
    'When explaining a bucket, list the actual categories, people, and stores from the structured data.',
    'When the data window says ALL AVAILABLE HISTORY, never claim results are limited to this month.',
    'For person/entity questions, report paid vs received totals and list matching transactions across the provided period.',
    'When a CHART RENDERED BY THE APP block is present, the UI plots it — never say you cannot generate charts; summarize the chart instead.',
    'Prefer markdown tables for comparisons (planned vs actual, category breakdowns).',
    'Never recommend buying or selling specific stocks, mutual funds, or ETFs.',
    'Never say "best fund" or "you should invest in".',
    'Focus on budgeting, cashflow, goals, tax planning hints, and affordability.',
    DISCLAIMER,
  ].join('\n');
}
