import type { BreakdownCategory } from '@/features/money-plan/data/money-plan';
import { mapCategoryToBucket } from '@/features/dashboard/config/category-bucket-map';
import { isNonPlanExpenseCategory } from '@/features/dashboard/config/plan-expense-categories';
import type { IncomeBudgetBucketDto } from '@/lib/income-budget-service';
import type { BucketAdherence } from '@/lib/plan-adherence-service';
import type { TransactionDetail } from '@/lib/financial-analysis';

/** Words that must never become free-text transaction search terms. */
export const ADVISOR_SEARCH_STOP_WORDS = new Set([
  'income',
  'expense',
  'expenses',
  'transaction',
  'transactions',
  'spending',
  'spent',
  'data',
  'summary',
  'month',
  'months',
  'year',
  'years',
  'last',
  'this',
  'total',
  'average',
  'analyze',
  'analysis',
  'explain',
  'show',
  'list',
  'for',
  'about',
  'the',
  'check',
  'find',
  'overall',
  'related',
  'give',
  'amount',
  'amounts',
  'recheck',
  'search',
  'details',
  'detail',
  'want',
  'just',
  'why',
  'how',
  'what',
  'when',
  'where',
  'which',
  'over',
  'under',
  'budget',
  'planned',
  'actual',
  'please',
  'yes',
  'yeah',
  'yep',
  'look',
  'investigate',
  'further',
  'within',
  'category',
  'categories',
  'bucket',
  'buckets',
  'plan',
  'discipline',
  'adherence',
  'people',
  'person',
  'store',
  'stores',
  'all',
  'can',
  'could',
  'would',
  'should',
  'simple',
  'direct',
  'math',
  'breakdown',
  'ever',
  'lifetime',
  'history',
  'time',
  'times',
  'received',
  'paid',
  'much',
  'many',
  'tell',
  'something',
  'someone',
  'anyone',
  'everything',
  'anything',
  'right',
  'good',
  'dying',
  'now',
  'matches',
  'match',
  'matching',
  'weird',
  'show',
  'chart',
  'charts',
  'graph',
  'graphs',
  'plot',
  'plots',
  'visualize',
  'visualise',
  'line',
  'bar',
  'pie',
  'area',
  'related',
  'names',
  'name',
  'months',
  'weeks',
  'days',
  'last',
  'same',
  'pace',
  'predict',
  'prediction',
  'forecast',
  'projection',
  'projected',
  'achieve',
  'achievement',
  'hit',
  'reach',
  'complete',
  'goal',
  'goals',
  'milestone',
  'milestones',
  'wishlist',
  'wishlists',
  'timeline',
  'interactive',
  'calendar',
  'mindmap',
  'three',
  'four',
  'five',
  'six',
  'ill',
  "i'll",
  'youll',
  "you'll",
  'vs',
  'versus',
  'with',
  'from',
  'since',
  'did',
  'will',
  'make',
  'export',
  'png',
  'svg',
  'pdf',
  'csv',
  'excel',
  'word',
  'html',
  'download',
  'preview',
  'three',
  'those',
  'these',
  'january',
  'february',
  'march',
  'april',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  // Plan rollup labels — these are not narration/category search strings
  'needs',
  'wants',
  'savings',
  'invest',
  'investment',
  'investments',
  'emi',
  'insurance',
]);

export interface PlanBucketFocus {
  key: string;
  label: string;
  mapFrom: BreakdownCategory[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWord(haystack: string, word: string): boolean {
  if (!word.trim()) return false;
  return new RegExp(`\\b${escapeRegExp(word.trim())}\\b`, 'i').test(haystack);
}

/**
 * Detect Needs/Wants/Savings (or custom budget bucket labels) from the query
 * and recent conversation — never as free-text search keywords.
 */
export function detectPlanBucketFocus(
  query: string,
  conversationHistory: Array<{ role: string; content: string }>,
  budgetBuckets: IncomeBudgetBucketDto[],
  adherenceBuckets: BucketAdherence[] = [],
): PlanBucketFocus | undefined {
  const candidates = [...budgetBuckets].sort(
    (a, b) => b.label.length - a.label.length || b.key.length - a.key.length,
  );

  const overBudgetKeys = new Set(
    adherenceBuckets.filter((b) => b.status === 'over').map((b) => b.key),
  );

  const resolveFromText = (text: string): PlanBucketFocus | undefined => {
    const matches = candidates.filter(
      (bucket) => hasWord(text, bucket.label) || hasWord(text, bucket.key),
    );
    if (matches.length === 0) return undefined;

    const preferred =
      matches.find((b) => overBudgetKeys.has(b.key)) ??
      matches[0];

    return {
      key: preferred.key,
      label: preferred.label,
      mapFrom: preferred.mapFrom,
    };
  };

  const fromQuery = resolveFromText(query);
  if (fromQuery) return fromQuery;

  // Newest messages first so "yes, list those" follows the latest bucket discussed
  for (const msg of [...conversationHistory].reverse().slice(0, 8)) {
    const found = resolveFromText(msg.content);
    if (found) return found;
  }

  // Fallback: adherence labels when budget plan keys differ slightly
  for (const msg of [query, ...[...conversationHistory].reverse().slice(0, 8).map((m) => m.content)]) {
    for (const bucket of adherenceBuckets) {
      if (!hasWord(msg, bucket.label) && !hasWord(msg, bucket.key)) continue;
      const fromPlan = budgetBuckets.find(
        (b) =>
          b.key === bucket.key ||
          b.label.toLowerCase() === bucket.label.toLowerCase(),
      );
      if (fromPlan) {
        return {
          key: fromPlan.key,
          label: fromPlan.label,
          mapFrom: fromPlan.mapFrom,
        };
      }
      const variant = bucket.variant;
      if (variant) {
        return {
          key: bucket.key,
          label: bucket.label,
          mapFrom: [variant as BreakdownCategory],
        };
      }
    }
  }

  return undefined;
}

/**
 * Extract a person/store/entity keyword for free-text search.
 * Prefer extractEntitySearchTerms for multi-name / fuzzy queries.
 */
export function extractSearchKeyword(query: string): string | undefined {
  const terms = extractEntitySearchTerms(query);
  if (terms.length > 0) {
    // Prefer shortest distinctive token (riz before fathma) for broad matching
    return [...terms].sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
  }
  return undefined;
}

/**
 * Parse one or many name variants from natural language, e.g.
 * "check for riz, riza, riza noor fathma anything matches"
 */
export function extractEntitySearchTerms(query: string): string[] {
  const terms = new Set<string>();

  const urlMatch = query.match(/[?&]search=([^&]+)/i);
  if (urlMatch) {
    const decoded = decodeURIComponent(urlMatch[1]).toLowerCase().trim();
    if (decoded && !ADVISOR_SEARCH_STOP_WORDS.has(decoded)) terms.add(decoded);
  }

  const quotedMatch = query.match(/"([^"]+)"|'([^']+)'/g);
  if (quotedMatch) {
    for (const q of quotedMatch) {
      const inner = q.replace(/^["']|["']$/g, '').toLowerCase().trim();
      if (inner && !ADVISOR_SEARCH_STOP_WORDS.has(inner)) terms.add(inner);
    }
  }

  // "check for A, B, C" / "look for A or B" / "matching A, B"
  const listCue = query.match(
    /(?:check\s+for|look\s+for|search\s+for|find|matching|match(?:es)?(?:\s+for)?|names?\s+like|for)\s+(.+?)(?=\s+anything|\s+for\s+last|\s+in\s+(?:the\s+)?(?:last|this)|\s+show|\s+and\s+show|\s+as\s+a|\s+in\s+line|\s+in\s+bar|\s+in\s+chart|\s+please|$)/i,
  );
  if (listCue?.[1]) {
    for (const term of parseNameListSegment(listCue[1])) terms.add(term);
  }

  // Comma-separated name list anywhere: "riz, riza, riza noor"
  if (/,/.test(query)) {
    const commaChunk = query.match(
      /([a-zA-Z][a-zA-Z\s]{1,40}(?:,\s*[a-zA-Z][a-zA-Z\s]{0,40}){1,6})/,
    );
    if (commaChunk?.[1]) {
      for (const term of parseNameListSegment(commaChunk[1])) terms.add(term);
    }
  }

  const entityMatch = query.match(
    /(?:to|from|paid|payout|gave|sent|received from|spent on|spend on|spending on|about|on|at|named|called|related to|with|between\s+me\s+and|between\s+us\s+and)\s+([a-zA-Z][a-zA-Z\s]{1,40})/i,
  );
  if (entityMatch) {
    for (const term of parseNameListSegment(entityMatch[1])) terms.add(term);
  }

  const capitalizedMatch = query.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3}\b/g) ?? [];
  for (const raw of capitalizedMatch) {
    for (const term of parseNameListSegment(raw)) terms.add(term);
  }

  return [...terms].filter((t) => t.length >= 2);
}

function parseNameListSegment(segment: string): string[] {
  const truncated = segment
    .split(
      /\b(?:anything|matches?|matching|for\s+last|last\s+\d|show|chart|charts|graph|plot|months?|weeks?|days?|and\s+show|in\s+line|in\s+bar|as\s+a)\b/i,
    )[0]
    .trim();
  const parts = truncated.split(/\s*,\s*|\s+or\s+/i);
  const out: string[] = [];
  for (const part of parts) {
    const cleaned = part
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) continue;
    const words = cleaned
      .split(' ')
      .filter((w) => w.length >= 2 && !ADVISOR_SEARCH_STOP_WORDS.has(w));
    if (words.length === 0) continue;
    if (words.length >= 2) {
      out.push(words.join(' '));
      for (const w of words) out.push(w);
    } else {
      out.push(words[0]);
    }
  }
  return [...new Set(out)];
}

/** Fuzzy person/store match: "riz" matches "Riza Noor…", full phrases match contains. */
export function textMatchesEntityTerm(haystack: string, term: string): boolean {
  const hay = haystack.toLowerCase();
  const t = term.toLowerCase().trim();
  if (!t || t.length < 2) return false;
  if (hay.includes(t)) return true;
  const words = hay.split(/[^a-z0-9]+/).filter(Boolean);
  return words.some(
    (w) =>
      w.startsWith(t) || (t.startsWith(w) && w.length >= Math.min(3, t.length)),
  );
}

export function transactionMatchesEntityTerms(
  tx: {
    description?: string;
    store?: string;
    personName?: string;
    category?: { name: string } | null;
  },
  terms: string[],
): boolean {
  if (terms.length === 0) return false;
  const hay = [tx.description, tx.store, tx.personName, tx.category?.name]
    .filter(Boolean)
    .join(' ');
  return terms.some((term) => textMatchesEntityTerm(hay, term));
}

/** Explicit all-history intent — must beat month defaults and "July" mentions. */
export function wantsAllTimeData(query: string): boolean {
  const q = query.toLowerCase();
  return (
    /\b(all\s*[- ]?\s*time|alltime|lifetime|entire\s+history|full\s+history|since\s+beginning|ever\b|across\s+all\s+months|whole\s+history)\b/.test(
      q,
    ) ||
    /\bnot\s+just\s+(this\s+month|july|june|january|february|march|april|may|august|september|october|november|december)\b/.test(
      q,
    ) ||
    /\b(overall|complete)\s+(history|data|transactions|picture)\b/.test(q)
  );
}

export function hasExplicitMonthOrPeriod(query: string): boolean {
  const q = query.toLowerCase();
  if (wantsAllTimeData(q)) return false;
  return (
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(
      q,
    ) ||
    /\bthis\s+month\b/.test(q) ||
    /\blast\s+\d+\s+(month|months|week|weeks|day|days)\b/.test(q) ||
    /\bthis\s+year\b/.test(q) ||
    /\b(in|during|for)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(
      q,
    ) ||
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/.test(
      q,
    )
  );
}

/**
 * Parse specific day-month mentions like:
 * "30th may and 30th june", "on 5 july", "for 14th august 2025"
 */
export function extractSpecificDatesFromQuery(
  query: string,
  now = new Date(),
): Date[] {
  const q = query.toLowerCase();
  const months = [
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
  ];
  const re =
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?\b/g;
  const out: Date[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(q))) {
    const day = Number(m[1]);
    const month = months.indexOf(m[2]);
    if (!Number.isFinite(day) || day < 1 || day > 31 || month < 0) continue;
    let year = m[3] ? Number(m[3]) : now.getFullYear();
    let d = new Date(year, month, day, 0, 0, 0, 0);
    // If no explicit year and date is clearly in the future, assume previous year.
    if (!m[3] && d.getTime() - now.getTime() > 60 * 86400000) {
      year -= 1;
      d = new Date(year, month, day, 0, 0, 0, 0);
    }
    if (d.getMonth() !== month) continue; // invalid date like 31 Feb
    out.push(d);
  }
  const key = (d: Date) => d.toISOString().slice(0, 10);
  return [...new Map(out.map((d) => [key(d), d])).values()].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
}

export function isSpecificDateLookupQuery(query: string): boolean {
  const q = query.toLowerCase();
  return (
    /\b(show|list|find|give|fetch|display)\b/.test(q) &&
    /\b(transaction|transactions|entries|entry|income|expense|spent|received|credited)\b/.test(
      q,
    ) &&
    extractSpecificDatesFromQuery(query).length > 0
  );
}

/** Person/store lookup — default to all-time unless a period is named. */
export function isEntityLookupQuery(query: string, keywordOrTerms?: string | string[]): boolean {
  const hasTerms = Array.isArray(keywordOrTerms)
    ? keywordOrTerms.length > 0
    : Boolean(keywordOrTerms);
  if (!hasTerms) {
    // Still detect intent cues even before terms resolve
    if (!/\b(check\s+for|look\s+for|matching|between\s+me\s+and)\b/i.test(query)) {
      return false;
    }
  }
  const q = query.toLowerCase();
  return (
    /\b(spent on|spend on|spending on|paid to|paid|received from|from her|from him|about|how much|transactions? with|with|between\s+me\s+and|check\s+for|look\s+for|search\s+for|matching|anything\s+matches)\b/.test(
      q,
    ) ||
    /\bon\s+[a-z]{3,}\b/.test(q) ||
    /,/.test(query)
  );
}

/**
 * Resolve entity name variants from current message, else recent chat.
 */
export function detectEntitySearchTerms(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
): string[] {
  const fromQuery = extractEntitySearchTerms(query);
  const hasPersonCue =
    /\b(about|on|with|from|to|paid|spent|spend|spending|received|check\s+for|look\s+for|matching|between\s+me\s+and)\b/i.test(
      query,
    ) ||
    /,/.test(query) ||
    /\b[A-Z][a-z]{2,}\b/.test(query);

  if (fromQuery.length > 0 && !(wantsAllTimeData(query) && !hasPersonCue && !/,/.test(query))) {
    return fromQuery;
  }

  for (const msg of [...conversationHistory].reverse().slice(0, 8)) {
    const role = msg.role.toLowerCase();
    if (role !== 'user') continue;
    const prior = extractEntitySearchTerms(msg.content);
    if (prior.length > 0) return prior;
  }

  return fromQuery;
}

/** @deprecated Prefer detectEntitySearchTerms */
export function detectEntityKeyword(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
): string | undefined {
  const terms = detectEntitySearchTerms(query, conversationHistory);
  if (terms.length === 0) return undefined;
  return [...terms].sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
}

export function shouldDefaultToCurrentMonth(
  query: string,
  bucketFocus?: PlanBucketFocus,
  keywordOrTerms?: string | string[],
): boolean {
  if (wantsAllTimeData(query)) return false;

  const hasEntity =
    (Array.isArray(keywordOrTerms) && keywordOrTerms.length > 0) ||
    (typeof keywordOrTerms === 'string' && Boolean(keywordOrTerms));

  // Person/entity questions → all history unless user named a month
  if (hasEntity && isEntityLookupQuery(query, keywordOrTerms) && !hasExplicitMonthOrPeriod(query)) {
    return false;
  }

  if (bucketFocus) return true;

  const q = query.toLowerCase();
  return (
    /\bthis\s+month\b/.test(q) ||
    (/\b(budget|over\s*budget|under\s*budget|adherence|discipline|planned|actual|performance)\b/.test(
      q,
    ) &&
      !hasEntity) ||
    /\bwhy\s+is\b.+\bover\b/.test(q)
  );
}

export function currentMonthDateRange(now = new Date()): {
  startDate: Date;
  endDate: Date;
} {
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  return { startDate, endDate };
}

export function transactionMatchesPlanBucket(
  tx: TransactionDetail,
  mapFrom: BreakdownCategory[],
): boolean {
  if (tx.type !== 'EXPENSE') return false;
  const categoryName = tx.category?.name;
  if (!categoryName) return false;
  // Match plan-adherence: non-plan expense categories are excluded from bucket totals
  if (isNonPlanExpenseCategory(categoryName)) return false;
  const bucket = mapCategoryToBucket(categoryName);
  return mapFrom.includes(bucket);
}

export function filterTransactionsByPlanBucket(
  transactions: TransactionDetail[],
  mapFrom: BreakdownCategory[],
): TransactionDetail[] {
  return transactions.filter((tx) => transactionMatchesPlanBucket(tx, mapFrom));
}
