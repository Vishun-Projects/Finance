import { prisma } from './db';
import { generateResponse } from './gemini';
import { analyzeUserFinances, formatFinancialSummary, DateRange } from './financial-analysis';

export interface AdvisorContext {
  userId: string;
  conversationId?: string;
  userMessage: string;
}

export interface AdvisorResponse {
  response: string;
  sources: Array<{
    type: 'document' | 'internet';
    id?: string;
    title?: string;
    url?: string;
  }>;
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

  // Parse date range
  const dateRange = parseDateRangeFromQuery(query);
  if (dateRange) {
    filters.dateRange = dateRange;
  }

  // Parse amount filters
  // "above ₹15,000", "more than 15000", "over 15k", ">= 15000"
  const amountAboveMatch = lowerQuery.match(/(?:above|more than|over|greater than|>=|>\s*)(?:₹|rs\.?|inr\s*)?(\d+(?:,\d{3})*(?:k|thousand)?)/i);
  if (amountAboveMatch) {
    const amount = parseAmount(amountAboveMatch[1]);
    if (amount) {
      filters.minAmount = amount;
    }
  }

  // "below ₹10,000", "less than 10000", "under 10k", "<= 10000"
  const amountBelowMatch = lowerQuery.match(/(?:below|less than|under|<=|<\s*)(?:₹|rs\.?|inr\s*)?(\d+(?:,\d{3})*(?:k|thousand)?)/i);
  if (amountBelowMatch) {
    const amount = parseAmount(amountBelowMatch[1]);
    if (amount) {
      filters.maxAmount = amount;
    }
  }

  // "between ₹5,000 and ₹10,000"
  const amountBetweenMatch = lowerQuery.match(/(?:between|from)\s*(?:₹|rs\.?|inr\s*)?(\d+(?:,\d{3})*(?:k|thousand)?)\s*(?:and|to)\s*(?:₹|rs\.?|inr\s*)?(\d+(?:,\d{3})*(?:k|thousand)?)/i);
  if (amountBetweenMatch) {
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
      regex: /(?:in|during|for|explain|analyze)?\s*(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(?:data|transactions))?(?!\s+\d{4})/i,
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
    // "all time", "overall", "since beginning"
    {
      regex: /(all time|overall|since beginning|full history|everything)/i,
      handler: () => {
        return { startDate: new Date(2000, 0, 1), endDate: new Date(2040, 0, 1) };
      },
    },
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern.regex);
    if (match) {
      const result = pattern.handler(match);
      if (result) {
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

/**
 * Main advisor service that handles user queries
 */
export async function processAdvisorQuery(context: AdvisorContext): Promise<AdvisorResponse> {
  try {
    const { userId, conversationId, userMessage } = context;

    // AI OPTIMIZATION: Smart Filtering & Token Management
    // Detect if the user is asking about a specific entity (Person/Store) or keyword
    const extractKeyword = (query: string): string | undefined => {
      const stopWords = ['income', 'expense', 'transaction', 'transactions', 'spending', 'data', 'summary', 'month', 'year', 'last', 'this', 'total', 'average', 'analyze', 'explain', 'show', 'for', 'about', 'the', 'check', 'find', 'overall', 'related', 'give', 'amount', 'amounts', 'recheck', 'search', 'details', 'detail', 'want', 'just'];
      const words = query.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length >= 3 && !stopWords.includes(w));

      // PRIORITY 1: URL Search Parameter (highest precision if user pastes link)
      const urlMatch = query.match(/[?&]search=([^&]+)/i);
      if (urlMatch) return decodeURIComponent(urlMatch[1]).toLowerCase();

      // PRIORITY 2: Pattern: "to [Name]", "paid [Name]", etc.
      const entityMatch = query.match(/(?:to|from|paid|payout|gave|sent|received from|at|on|for|about|of|named|called|related to)\s+([a-zA-Z]{3,})/i);
      if (entityMatch) {
        const candidate = entityMatch[1].toLowerCase();
        if (!stopWords.includes(candidate)) return candidate;
      }

      // PRIORITY 2: Quoted strings (highest precision)
      const quotedMatch = query.match(/"([^"]+)"|'([^']+)'/);
      if (quotedMatch) return (quotedMatch[1] || quotedMatch[2]).toLowerCase();

      // PRIORITY 3: Capitalized words (likely names/brands)
      const capitalizedMatch = query.match(/\b[A-Z][a-z]{2,}\b/);
      if (capitalizedMatch) {
        const candidate = capitalizedMatch[0].toLowerCase();
        if (!stopWords.includes(candidate)) return candidate;
      }

      // PRIORITY 4: The longest non-stopword (likely the core subject)
      if (words.length > 0) {
        // Tie-breaker: prefer words that look like proper names (not in stopWords)
        return words.sort((a, b) => b.length - a.length)[0];
      }

      return undefined;
    };

    const keyword = extractKeyword(userMessage);
    const filters = parseTransactionFiltersFromQuery(userMessage);

    // AI OPTIMIZATION: Targeted queries get 3000 limit (safely within token limits for specific searches)
    // General summaries get 500 recently active transactions
    const limit = keyword ? 3000 : 500;

    const financialSummaryPromise = analyzeUserFinances(userId, filters.dateRange, keyword, limit);

    const historyPromise = conversationId ? (prisma as any).advisorMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 15,
    }) : Promise.resolve([]);

    // Wait for essential context
    let [financialSummary, messages] = await Promise.all([
      financialSummaryPromise,
      historyPromise
    ]);

    // Step 3: Handle specific amount filters if mentioned (already processed by analyzeUserFinances but we keep for extra safety)
    const specificAmountMatch = userMessage.match(/(?:₹|rs\.?|inr\s*)?(\d+(?:,\d{3})*(?:k|thousand)?)/i);
    let specificAmount: number | undefined;
    if (specificAmountMatch) {
      specificAmount = parseAmount(specificAmountMatch[1]);
    }

    if (filters.minAmount || filters.maxAmount || filters.transactionType || specificAmount) {
      let filteredTransactions = financialSummary.transactions;

      if (filters.minAmount) filteredTransactions = filteredTransactions.filter(t => t.amount >= filters.minAmount!);
      if (filters.maxAmount) filteredTransactions = filteredTransactions.filter(t => t.amount <= filters.maxAmount!);
      if (filters.transactionType && filters.transactionType !== 'ALL') {
        filteredTransactions = filteredTransactions.filter(t => t.type === filters.transactionType);
      }

      if (specificAmount) {
        const tolerance = specificAmount * 0.1;
        filteredTransactions = filteredTransactions.filter(t =>
          Math.abs(t.amount - specificAmount) <= tolerance || t.amount === specificAmount
        );
      }

      financialSummary = {
        ...financialSummary,
        transactions: filteredTransactions,
        totalTransactionCount: filteredTransactions.length,
      };
    }

    const financialSummaryText = formatFinancialSummary(financialSummary);
    const conversationHistory = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'USER' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Step 4: Generate AI response directly (Zero Document/Internet Overhead)
    const aiResponse = await generateResponse(userMessage, {
      financialSummary: financialSummaryText,
      conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
      // Pass filtering metadata to help AI understand its "window" into the data
      filterContext: {
        searchTerm: keyword,
        dateRange: filters.dateRange,
        appliedLimit: limit
      } as any
    });

    return {
      response: aiResponse.response,
      sources: aiResponse.sources as any,
    };
  } catch (error) {
    console.error('Error processing advisor query:', error);
    // Wrap error with more context
    if (error instanceof Error) {
      throw new Error(`Advisor service error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while processing advisor query');
  }
}

