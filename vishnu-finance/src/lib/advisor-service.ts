import { prisma } from './db';
import { generateResponse } from './gemini';
import {
  analyzeUserFinances,
  DateRange,
  type FinancialSummary,
} from './financial-analysis';
import {
  classifyAdvisorIntent,
  validateAdvisorResponse,
  buildAdvisorSystemPreamble,
} from './advisor-guardrails';
import {
  currentMonthDateRange,
  detectEntitySearchTerms,
  detectPlanBucketFocus,
  extractSpecificDatesFromQuery,
  isSpecificDateLookupQuery,
  isEntityLookupQuery,
  shouldDefaultToCurrentMonth,
  transactionMatchesEntityTerms,
  wantsAllTimeData,
} from './advisor-query-filters';
import { ensureDefaultIncomeBudgetPlan } from './income-budget-service';
import { buildAdvisorContextPack } from './advisor-context-pack';
import {
  detectRequestedFormat,
  formatInstructionForPrompt,
  type AdvisorOutputFormat,
} from './advisor-format';
import { exportAdvisorMarkdown } from './advisor-export';
import type { ChartConfig } from '@/lib/advisor-chart-types';
import type { AdvisorArtifact } from '@/lib/advisor-artifacts/types';
import {
  detectAndBuildArtifacts,
  formatArtifactsPromptBlock,
  artifactsSystemHint,
  wantsAnyInteractiveArtifact,
  isPaceForecastQuery,
  runForecast,
} from '@/lib/advisor-artifacts';
import { GeminiQuotaExceededError } from '@/lib/gemini-quota';
import { GroqRateLimitError } from '@/lib/groq';
import { suggestedFollowUps, buildTurnStatus } from '@/lib/advisor-followups';

export interface AdvisorContext {
  userId: string;
  conversationId?: string;
  userMessage: string;
  /** Streaming callbacks for SSE chat */
  onToken?: (delta: string) => void;
  onEvent?: (event: {
    type: 'status' | 'artifact' | 'meta';
    data: Record<string, unknown>;
  }) => void;
}

export interface AdvisorExportAttachment {
  format: Exclude<AdvisorOutputFormat, 'chat' | 'table'>;
  filename: string;
  mimeType: string;
  /** Base64 payload for immediate download in the client */
  base64: string;
}

export interface AdvisorResponse {
  response: string;
  sources: Array<{
    type: 'document' | 'internet' | 'chart' | 'interactive';
    id?: string;
    title?: string;
    url?: string;
    chartConfig?: ChartConfig;
    kind?: AdvisorArtifact['kind'];
    payload?: AdvisorArtifact['payload'];
  }>;
  blocked?: boolean;
  intent?: string;
  requestedFormat?: AdvisorOutputFormat;
  attachment?: AdvisorExportAttachment;
  /** @deprecated Prefer artifacts[]; kept for older clients */
  chartConfig?: ChartConfig;
  artifacts?: AdvisorArtifact[];
  provider?: 'gemini' | 'groq';
  providerNotice?: string;
  groqRateLimit?: {
    remainingRequests?: number;
    limitRequests?: number;
    remainingTokens?: number;
    limitTokens?: number;
    resetRequests?: string;
    resetTokens?: string;
    message: string;
    model?: string;
  };
  /** ChatGPT-style suggested next prompts */
  followUps?: string[];
  /** Compact status strip for the UI */
  turnStatus?: string;
}

/**
 * Parse transaction filters from natural language query
 * Returns filters for amount, date range, category, etc.
 */
interface TransactionQueryFilters {
  dateRange?: DateRange;
  minAmount?: number;
  maxAmount?: number;
  category?: string;
  transactionType?: 'INCOME' | 'EXPENSE' | 'ALL';
}

function parseTransactionFiltersFromQuery(query: string): TransactionQueryFilters {
  const lowerQuery = query.toLowerCase();
  const filters: TransactionQueryFilters = {};
  const specificDates = extractSpecificDatesFromQuery(query);
  const likelyDateLookup = isSpecificDateLookupQuery(query);

  // Parse date range
  const dateRange = parseDateRangeFromQuery(query);
  if (dateRange) {
    filters.dateRange = dateRange;
  } else if (specificDates.length > 0) {
    // Load the full span covering requested specific dates; exact-day filter is applied later.
    filters.dateRange = {
      startDate: new Date(
        specificDates[0].getFullYear(),
        specificDates[0].getMonth(),
        specificDates[0].getDate(),
        0,
        0,
        0,
        0,
      ),
      endDate: new Date(
        specificDates[specificDates.length - 1].getFullYear(),
        specificDates[specificDates.length - 1].getMonth(),
        specificDates[specificDates.length - 1].getDate(),
        23,
        59,
        59,
        999,
      ),
    };
  }

  // Parse amount filters
  // "above ₹15,000", "more than 15000", "over 15k", ">= 15000"
  const amountAboveMatch = lowerQuery.match(/(?:above|more than|over|greater than|>=|>\s*)(?:₹|rs\.?|inr\s*)?(\d+(?:,\d{3})*(?:k|thousand)?)/i);
  if (amountAboveMatch && !likelyDateLookup) {
    const amount = parseAmount(amountAboveMatch[1]);
    if (amount) {
      filters.minAmount = amount;
    }
  }

  // "below ₹10,000", "less than 10000", "under 10k", "<= 10000"
  const amountBelowMatch = lowerQuery.match(/(?:below|less than|under|<=|<\s*)(?:₹|rs\.?|inr\s*)?(\d+(?:,\d{3})*(?:k|thousand)?)/i);
  if (amountBelowMatch && !likelyDateLookup) {
    const amount = parseAmount(amountBelowMatch[1]);
    if (amount) {
      filters.maxAmount = amount;
    }
  }

  // "between ₹5,000 and ₹10,000"
  const amountBetweenMatch = lowerQuery.match(/(?:between|from)\s*(?:₹|rs\.?|inr\s*)?(\d+(?:,\d{3})*(?:k|thousand)?)\s*(?:and|to)\s*(?:₹|rs\.?|inr\s*)?(\d+(?:,\d{3})*(?:k|thousand)?)/i);
  if (amountBetweenMatch && !likelyDateLookup) {
    const minAmount = parseAmount(amountBetweenMatch[1]);
    const maxAmount = parseAmount(amountBetweenMatch[2]);
    if (minAmount) filters.minAmount = minAmount;
    if (maxAmount) filters.maxAmount = maxAmount;
  }

  // Parse transaction type
  if (lowerQuery.includes('income') || lowerQuery.includes('earning')) {
    filters.transactionType = 'INCOME';
  } else if (lowerQuery.includes('expense') || lowerQuery.includes('spending') || lowerQuery.includes('expenditure')) {
    filters.transactionType = 'EXPENSE';
  }

  return filters;
}

/**
 * Helper to parse amount strings like "15k", "15,000", "15000"
 */
function parseAmount(amountStr: string): number | undefined {
  try {
    let cleaned = amountStr.trim().toLowerCase();
    // Remove commas
    cleaned = cleaned.replace(/,/g, '');
    // Handle "k" or "thousand"
    if (cleaned.endsWith('k')) {
      cleaned = cleaned.slice(0, -1) + '000';
    } else if (cleaned.includes('thousand')) {
      cleaned = cleaned.replace('thousand', '000');
    }
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? undefined : amount;
  } catch {
    return undefined;
  }
}

/**
 * Parse date range from natural language query
 * Examples: "last 3 months", "from January to March", "in 2024", "this year", etc.
 */
function parseDateRangeFromQuery(query: string): DateRange | undefined {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // All-time wins even if the message also says "not just July"
  if (
    /(all\s*[- ]?\s*time|alltime|lifetime|entire\s+history|full\s+history|since\s+beginning|\bever\b|across\s+all\s+months|whole\s+history|not\s+just\s+(this\s+month|january|february|march|april|may|june|july|august|september|october|november|december))/i.test(
      query,
    )
  ) {
    return undefined; // no date filter = all available history
  }

  // Patterns for relative dates
  const patterns = [
    // "last N months/weeks/days"
    {
      regex: /last\s+(\d+)\s+(month|months|week|weeks|day|days)/i,
      handler: (match: RegExpMatchArray) => {
        const num = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const startDate = new Date(today);

        if (unit.startsWith('month')) {
          startDate.setMonth(startDate.getMonth() - num);
        } else if (unit.startsWith('week')) {
          startDate.setDate(startDate.getDate() - (num * 7));
        } else if (unit.startsWith('day')) {
          startDate.setDate(startDate.getDate() - num);
        }

        return { startDate, endDate: today };
      },
    },
    // "this month/year"
    {
      regex: /this\s+(month|year)/i,
      handler: (match: RegExpMatchArray) => {
        const unit = match[1].toLowerCase();
        if (unit === 'month') {
          const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          return { startDate, endDate: today };
        } else if (unit === 'year') {
          const startDate = new Date(today.getFullYear(), 0, 1);
          return { startDate, endDate: today };
        }
        return undefined;
      },
    },
    // "in 2024" or "during 2024"
    {
      regex: /(in|during)\s+(\d{4})/i,
      handler: (match: RegExpMatchArray) => {
        const year = parseInt(match[2]);
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        return { startDate, endDate };
      },
    },
    // "from [month] to [month]" or "from [date] to [date]"
    {
      regex: /from\s+([a-z]+\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\s+to\s+([a-z]+\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i,
      handler: (match: RegExpMatchArray) => {
        try {
          const startStr = match[1].trim();
          const endStr = match[2].trim();
          const startDate = parseDateString(startStr);
          const endDate = parseDateString(endStr);
          if (startDate && endDate) {
            return { startDate, endDate };
          }
        } catch {
          // Ignore parsing errors
        }
        return undefined;
      },
    },
    // Month names: "in January", "during March", "september 2025", "july 2025", "september data of 2025"
    // Pattern: (optional prefix) month name (optional words like "data", "of") year
    {
      regex: /(?:in|during|for|explain|analyze)?\s*(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(?:data|transactions|of|in))?\s*(?:of\s*)?(\d{4})/i,
      handler: (match: RegExpMatchArray) => {
        const monthNames = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december',
        ];
        const monthName = match[1].toLowerCase();
        const monthIndex = monthNames.indexOf(monthName);
        if (monthIndex !== -1) {
          // Extract year from match[2]
          const year = match[2] ? parseInt(match[2]) : today.getFullYear();
          // Set to start of month at 00:00:00
          const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0);
          // Set to end of month at 23:59:59
          const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
          return { startDate, endDate };
        }
        return undefined;
      },
    },
    // Month names without year: "in January", "during March" (defaults to current year)
    {
      regex: /(?:in|during|for|explain|analyze)\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(?:data|transactions))?(?!\s+\d{4})/i,
      handler: (match: RegExpMatchArray) => {
        const monthNames = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december',
        ];
        const monthName = match[1].toLowerCase();
        const monthIndex = monthNames.indexOf(monthName);
        if (monthIndex !== -1) {
          const year = today.getFullYear();
          // Set to start of month at 00:00:00
          const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0);
          // Set to end of month at 23:59:59
          const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
          return { startDate, endDate };
        }
      },
    },
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern.regex);
    if (match) {
      const result = pattern.handler(match);
    if (result) {
      if (
        /\b\d{1,2}(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(
          query,
        )
      ) {
        return undefined;
      }
      return result;
      }
    }
  }

  return undefined;
}

/**
 * Helper to parse date strings in various formats
 */
function parseDateString(dateStr: string): Date | undefined {
  try {
    // Try ISO format first
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
    }

    // Try DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const [, d, m, y] = slashMatch;
      // Try DD/MM/YYYY first (Indian format)
      const date1 = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      if (!isNaN(date1.getTime())) return date1;
      // Try MM/DD/YYYY
      const date2 = new Date(parseInt(y), parseInt(d) - 1, parseInt(m));
      if (!isNaN(date2.getTime())) return date2;
    }

    // Try natural language month names
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ];
    const monthMatch = dateStr.match(/([a-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?/i);
    if (monthMatch) {
      const monthName = monthMatch[1].toLowerCase();
      const monthIndex = monthNames.indexOf(monthName);
      if (monthIndex !== -1) {
        const day = parseInt(monthMatch[2]);
        const year = monthMatch[3] ? parseInt(monthMatch[3]) : new Date().getFullYear();
        const date = new Date(year, monthIndex, day);
        if (!isNaN(date.getTime())) return date;
      }
    }

    // Fallback to Date constructor
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
  } catch {
    // Ignore errors
  }
  return undefined;
}

function applyInMemoryTxnFilters(
  summary: FinancialSummary,
  opts: {
    minAmount?: number;
    maxAmount?: number;
    transactionType?: 'INCOME' | 'EXPENSE' | 'ALL';
    specificAmount?: number;
  },
): FinancialSummary {
  let filtered = summary.transactions;
  if (opts.minAmount) filtered = filtered.filter((t) => t.amount >= opts.minAmount!);
  if (opts.maxAmount) filtered = filtered.filter((t) => t.amount <= opts.maxAmount!);
  if (opts.transactionType && opts.transactionType !== 'ALL') {
    filtered = filtered.filter((t) => t.type === opts.transactionType);
  }
  if (opts.specificAmount != null) {
    const tolerance = opts.specificAmount * 0.1;
    filtered = filtered.filter(
      (t) =>
        Math.abs(t.amount - opts.specificAmount!) <= tolerance ||
        t.amount === opts.specificAmount,
    );
  }
  if (filtered === summary.transactions) return summary;
  return {
    ...summary,
    transactions: filtered,
    totalTransactionCount: filtered.length,
  };
}

/**
 * Deterministic ForecastEngine path — no chat amount/type filters, no double window resolve.
 */
async function processForecastQuery(args: {
  userId: string;
  userMessage: string;
  requestedFormat: AdvisorOutputFormat;
  onToken?: (delta: string) => void;
  onEvent?: AdvisorContext['onEvent'];
}): Promise<AdvisorResponse> {
  const { userId, userMessage, requestedFormat, onToken, onEvent } = args;
  const forecast = await runForecast({ userId, query: userMessage });
  const artifacts: AdvisorArtifact[] = [forecast.artifact];
  onEvent?.({
    type: 'artifact',
    data: { artifacts, timeline: forecast.timeline },
  });
  onEvent?.({
    type: 'status',
    data: {
      turnStatus: buildTurnStatus({
        forecastMode: true,
        windowLabel: forecast.window.label,
        txnCount: undefined,
      }),
    },
  });

  const formatHint = formatInstructionForPrompt(requestedFormat);
  const intent = 'goal' as const;

  const aiResponse = await generateResponse(userMessage, {
    financialSummary: [
      'FORECAST-ONLY CONTEXT from ForecastEngine (authoritative numbers).',
      forecast.promptBlock,
    ].join('\n\n'),
    conversationHistory: undefined,
    systemPreamble: `${buildAdvisorSystemPreamble()}\n${formatHint}${artifactsSystemHint(artifacts)}\nFORECAST MODE: Narrate ONLY the deterministic timeline numbers. Do not invent ETAs, paces, steps, or moralizing copy. No Needs/Wants/Savings budget tables.`,
    intent,
    onToken,
    filterContext: {
      searchTerm: 'goal pace forecast timeline',
      dateRange: {
        startDate: forecast.window.startDate,
        endDate: forecast.window.endDate,
      },
      appliedLimit: 5000,
      fullContext: false,
      allTime: false,
      chartRequested: false,
      interactiveRequested: true,
    } as any,
  });

  const validated = validateAdvisorResponse(aiResponse.response);

  let attachment: AdvisorExportAttachment | undefined;
  const downloadable = ['html', 'csv', 'xlsx', 'pdf', 'docx'] as const;
  if (
    downloadable.includes(requestedFormat as (typeof downloadable)[number]) &&
    !validated.blocked
  ) {
    try {
      const exported = await exportAdvisorMarkdown({
        markdown: validated.response,
        format: requestedFormat as AdvisorExportAttachment['format'],
        title: `Advisor forecast ${forecast.window.label}`,
      });
      attachment = {
        format: requestedFormat as AdvisorExportAttachment['format'],
        filename: exported.filename,
        mimeType: exported.mimeType,
        base64: exported.buffer.toString('base64'),
      };
    } catch (err) {
      console.error('Advisor export generation failed:', err);
    }
  }

  const sources: AdvisorResponse['sources'] = [
    ...(aiResponse.sources as AdvisorResponse['sources']),
    {
      type: 'chart' as const,
      title: forecast.artifact.title,
      chartConfig: forecast.artifact.payload.config,
      kind: 'chart' as const,
      payload: forecast.artifact.payload,
    },
  ];

  const followUps = suggestedFollowUps({
    userMessage,
    intent,
    isForecast: true,
  });
  const turnStatus = buildTurnStatus({
    forecastMode: true,
    windowLabel: forecast.window.label,
    provider: aiResponse.provider,
    truncated: Boolean(aiResponse.providerNotice?.toLowerCase().includes('truncat')),
  });

  return {
    response: validated.response,
    sources,
    blocked: validated.blocked,
    intent,
    requestedFormat,
    attachment,
    chartConfig: forecast.artifact.payload.config,
    artifacts,
    provider: aiResponse.provider,
    providerNotice: aiResponse.providerNotice,
    groqRateLimit: aiResponse.groqRateLimit,
    followUps,
    turnStatus,
  };
}

/**
 * Main advisor service that handles user queries
 */
export async function processAdvisorQuery(context: AdvisorContext): Promise<AdvisorResponse> {
  try {
    const { userId, conversationId, userMessage } = context;
    const requestedFormat = detectRequestedFormat(userMessage);

    if (isPaceForecastQuery(userMessage)) {
      return await processForecastQuery({
        userId,
        userMessage,
        requestedFormat,
        onToken: context.onToken,
        onEvent: context.onEvent,
      });
    }

    const filters = parseTransactionFiltersFromQuery(userMessage);
    const specificDates = extractSpecificDatesFromQuery(userMessage);
    const specificDateLookup = isSpecificDateLookupQuery(userMessage);

    const historyPromise = conversationId
      ? (prisma as any).advisorMessage.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
          take: 15,
        })
      : Promise.resolve([]);

    const dashboardPromise = import('@/features/dashboard/loaders').then(({ loadDashboard }) =>
      loadDashboard(userId),
    );
    const budgetPlanPromise = ensureDefaultIncomeBudgetPlan(userId);

    const [messages, dashboard, budgetPlan] = await Promise.all([
      historyPromise,
      dashboardPromise,
      budgetPlanPromise,
    ]);

    const conversationHistory = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'USER' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const bucketFocus = detectPlanBucketFocus(
      userMessage,
      conversationHistory,
      budgetPlan.buckets,
      dashboard.adherence.buckets,
    );

    // Plan buckets are never free-text search terms.
    const entityTerms = bucketFocus
      ? []
      : detectEntitySearchTerms(userMessage, conversationHistory);
    const keyword = entityTerms.length > 0
      ? [...entityTerms].sort((a, b) => a.length - b.length || a.localeCompare(b))[0]
      : undefined;
    const entityLabel = entityTerms.length > 0 ? entityTerms.join(' / ') : undefined;

    const allTime = wantsAllTimeData(userMessage);

    let dateRange: DateRange | undefined = filters.dateRange;
    if (
      !allTime &&
      !dateRange &&
      !specificDateLookup &&
      shouldDefaultToCurrentMonth(userMessage, bucketFocus, entityTerms)
    ) {
      dateRange = currentMonthDateRange();
    }
    if (
      !allTime &&
      !dateRange &&
      !specificDateLookup &&
      entityTerms.length === 0 &&
      (requestedFormat !== 'chat' ||
        /\b(budget|planned|actual|performance|where\s+i\s+was)\b/i.test(userMessage))
    ) {
      dateRange = currentMonthDateRange();
    }

    const interactiveEarly = wantsAnyInteractiveArtifact(userMessage);

    // Entity lookups: load the period fully, then fuzzy-match name variants in memory.
    // Do NOT Prisma-search a single bad token like "matches" — that empties results.
    const entityLookup =
      entityTerms.length > 0 &&
      (allTime ||
        isEntityLookupQuery(userMessage, entityTerms) ||
        !dateRange ||
        interactiveEarly);

    const limit = entityTerms.length || bucketFocus || dateRange || allTime ? 5000 : 800;
    let financialSummary = await analyzeUserFinances(
      userId,
      dateRange,
      undefined,
      limit,
    );

    const specificAmountMatch = specificDateLookup
      ? null
      : userMessage.match(
          /(?:₹|rs\.?|inr\s*)?(\d+(?:,\d{3})*(?:k|thousand)?)(?!\s*(?:st|nd|rd|th)\b)/i,
        );
    const specificAmount = specificAmountMatch
      ? parseAmount(specificAmountMatch[1])
      : undefined;

    financialSummary = applyInMemoryTxnFilters(financialSummary, {
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount,
      transactionType: filters.transactionType,
      specificAmount,
    });

    if (specificDateLookup && specificDates.length > 0) {
      const dayKeys = new Set(
        specificDates.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()),
      );
      const matched = financialSummary.transactions.filter((t) => {
        const d = new Date(t.date);
        const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return dayKeys.has(key);
      });
      const totalIncome = matched
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = matched
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      financialSummary = {
        ...financialSummary,
        transactions: matched,
        totalTransactionCount: matched.length,
        totalIncome,
        totalExpenses,
        netSavings: totalIncome - totalExpenses,
        searchTerm: `specific dates [${specificDates
          .map((d) => d.toLocaleDateString('en-IN'))
          .join(', ')}]`,
      };
    }

    let focusKeywordMeta:
      | {
          keyword: string;
          matchingCount: number;
          matchingExpenseTotal: number;
          matchingIncomeTotal: number;
        }
      | undefined;
    if (entityTerms.length > 0) {
      const matching = financialSummary.transactions.filter((t) =>
        transactionMatchesEntityTerms(t, entityTerms),
      );
      const expenseTotal = matching
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      const incomeTotal = matching
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      focusKeywordMeta = {
        keyword: entityLabel || keyword || entityTerms[0],
        matchingCount: matching.length,
        matchingExpenseTotal: expenseTotal,
        matchingIncomeTotal: incomeTotal,
      };

      const periodNote = allTime || !dateRange
        ? 'all available history'
        : 'selected period';

      // Always narrow to fuzzy matches for entity questions (even if empty — be honest)
      if (entityLookup || matching.length > 0) {
        financialSummary = {
          ...financialSummary,
          searchTerm: `entity variants [${entityTerms.join(', ')}] (${periodNote})`,
          transactions: matching,
          totalTransactionCount: matching.length,
          totalExpenses: expenseTotal,
          totalIncome: incomeTotal,
          netSavings: incomeTotal - expenseTotal,
        };
      }
    }

    const { formatAdvisorPlanContext } = await import('@/lib/advisor-plan-context');
    const focusedPack = buildAdvisorContextPack({
      dashboard,
      budgetBuckets: budgetPlan.buckets,
      financialSummary,
      focus: bucketFocus
        ? { bucket: bucketFocus }
        : focusKeywordMeta
          ? {
              keyword: focusKeywordMeta.keyword,
              matchingCount: focusKeywordMeta.matchingCount,
              matchingExpenseTotal: focusKeywordMeta.matchingExpenseTotal,
              matchingIncomeTotal: focusKeywordMeta.matchingIncomeTotal,
            }
          : undefined,
    });
    // Entity/bucket asks: skip the huge plan dump to cut TPM and stay on-topic.
    const slimIntent = Boolean(bucketFocus || entityTerms.length > 0);
    const fullPack = slimIntent
      ? focusedPack
      : focusedPack + '\n\n' + formatAdvisorPlanContext(dashboard, budgetPlan.buckets);

    const intent = classifyAdvisorIntent(userMessage);
    const formatHint = formatInstructionForPrompt(requestedFormat);
    const transactionLookupFirst =
      specificDateLookup ||
      (/\b(transaction|transactions|entries|entry|show|list)\b/i.test(userMessage) &&
        !isPaceForecastQuery(userMessage));

    const artifacts = detectAndBuildArtifacts(userMessage, {
      transactions: financialSummary.transactions,
      budgetBuckets: budgetPlan.buckets,
      entityLabel: entityLabel || keyword,
      hasDatedWindow: Boolean(dateRange) || !allTime,
      disciplineSummary: dashboard.disciplineSummary,
      adherenceBuckets: dashboard.adherence?.buckets,
    });

    if (artifacts.length > 0) {
      context.onEvent?.({ type: 'artifact', data: { artifacts } });
    }

    let artifactPromptBlock = formatArtifactsPromptBlock(artifacts);
    if (interactiveEarly && artifacts.length === 0) {
      artifactPromptBlock =
        '\n\nINTERACTIVE NOTE: User asked for an interactive view but no matching transactions/plan data were found. Say that clearly.';
    }

    const financialSummaryText = fullPack + artifactPromptBlock;
    const turnStatusEarly = buildTurnStatus({
      windowLabel: dateRange
        ? `${dateRange.startDate?.toLocaleDateString?.('en-IN') || '…'} → ${dateRange.endDate?.toLocaleDateString?.('en-IN') || '…'}`
        : allTime
          ? 'all history'
          : undefined,
      txnCount: financialSummary.transactions.length,
      truncated: slimIntent,
    });
    context.onEvent?.({ type: 'status', data: { turnStatus: turnStatusEarly } });

    const chartConfig = artifacts.find((a) => a.kind === 'chart')?.payload.config;

    const aiResponse = await generateResponse(userMessage, {
      financialSummary: financialSummaryText,
      conversationHistory:
        conversationHistory.length === 0 ? undefined : conversationHistory,
      systemPreamble: `${buildAdvisorSystemPreamble()}\n${formatHint}${artifactsSystemHint(artifacts)}${
        transactionLookupFirst
          ? '\nQUERY GUARDRAIL: This is a transaction lookup intent. Do not force forecast framing, milestone framing, or budget coaching unless explicitly asked.'
          : ''
      }`,
      intent,
      onToken: context.onToken,
      filterContext: {
        searchTerm: bucketFocus
          ? `focus plan bucket: ${bucketFocus.label} (full month data also provided)`
          : entityTerms.length > 0
            ? allTime || !dateRange
              ? `focus entity variants [${entityTerms.join(', ')}] across ALL available history (fuzzy match)`
              : `focus entity variants [${entityTerms.join(', ')}] (fuzzy match)`
            : undefined,
        dateRange: allTime ? undefined : dateRange,
        appliedLimit: limit,
        fullContext: !slimIntent,
        allTime: allTime || (!dateRange && entityTerms.length > 0),
        chartRequested: artifacts.some((a) => a.kind === 'chart' && a.payload.config),
        interactiveRequested: artifacts.length > 0 || interactiveEarly,
      } as any,
    });

    const validated = validateAdvisorResponse(aiResponse.response);

    let attachment: AdvisorExportAttachment | undefined;
    const downloadable = ['html', 'csv', 'xlsx', 'pdf', 'docx'] as const;
    if (
      downloadable.includes(requestedFormat as (typeof downloadable)[number]) &&
      !validated.blocked
    ) {
      try {
        const exported = await exportAdvisorMarkdown({
          markdown: validated.response,
          format: requestedFormat as AdvisorExportAttachment['format'],
          title: `Advisor ${adherenceMonthTitle(dashboard)}`,
        });
        attachment = {
          format: requestedFormat as AdvisorExportAttachment['format'],
          filename: exported.filename,
          mimeType: exported.mimeType,
          base64: exported.buffer.toString('base64'),
        };
      } catch (err) {
        console.error('Advisor export generation failed:', err);
      }
    }

    const sources: AdvisorResponse['sources'] = [
      ...(aiResponse.sources as AdvisorResponse['sources']),
      ...artifacts.map((artifact) => {
        if (artifact.kind === 'chart') {
          return {
            type: 'chart' as const,
            title: artifact.title,
            chartConfig: artifact.payload.config,
            kind: artifact.kind,
            payload: artifact.payload,
          };
        }
        return {
          type: 'interactive' as const,
          kind: artifact.kind,
          title: artifact.title,
          payload: artifact.payload,
        };
      }),
    ];

    return {
      response: validated.response,
      sources,
      blocked: validated.blocked,
      intent,
      requestedFormat,
      attachment,
      chartConfig,
      artifacts,
      provider: aiResponse.provider,
      providerNotice: aiResponse.providerNotice,
      groqRateLimit: aiResponse.groqRateLimit,
      followUps: suggestedFollowUps({
        userMessage,
        intent,
        entityLabel: entityLabel || keyword,
        bucketLabel: bucketFocus?.label,
      }),
      turnStatus: buildTurnStatus({
        provider: aiResponse.provider,
        windowLabel: dateRange
          ? `${dateRange.startDate?.toLocaleDateString?.('en-IN') || '…'} → ${dateRange.endDate?.toLocaleDateString?.('en-IN') || '…'}`
          : allTime
            ? 'all history'
            : undefined,
        txnCount: financialSummary.transactions.length,
        truncated:
          Boolean(bucketFocus || entityTerms.length) ||
          Boolean(aiResponse.providerNotice?.toLowerCase().includes('truncat')),
      }),
    };
  } catch (error) {
    console.error('Error processing advisor query:', error);
    if (error instanceof GeminiQuotaExceededError || error instanceof GroqRateLimitError) {
      throw error;
    }
    if (error instanceof Error) {
      const msg = error.message;
      // Never surface raw provider HTTP dumps (413 TPM bodies, etc.)
      if (
        msg.includes('Request too large') ||
        msg.includes('tokens per minute') ||
        msg.includes('rate_limit_exceeded') ||
        msg.includes('Groq API error')
      ) {
        throw new Error(
          'The AI provider hit a free-tier size/rate limit. Try a narrower question (one month or one person), or wait a minute and retry.',
        );
      }
      throw new Error(`Advisor service error: ${msg}`);
    }
    throw new Error('Unknown error occurred while processing advisor query');
  }
}

function adherenceMonthTitle(dashboard: {
  adherence: { monthLabel: string };
}): string {
  return dashboard.adherence.monthLabel || 'export';
}

