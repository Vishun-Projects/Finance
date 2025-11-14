import { prisma } from './db';
import { searchDocuments, generateResponse, searchInternet } from './gemini';
import { analyzeUserFinances, formatFinancialSummary, DateRange } from './financial-analysis';
import { getDocumentText } from './document-processor';

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
        return undefined;
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

    // Step 1: Parse transaction filters from query if present
    const transactionFilters = parseTransactionFiltersFromQuery(userMessage);
    const dateRange = transactionFilters.dateRange;

    // Step 2: Get user's financial summary with optional date range
    let financialSummary = await analyzeUserFinances(userId, dateRange);
    
    // Step 3: Check if query is asking about a specific amount (for "why did I send X" type questions)
    const specificAmountMatch = userMessage.match(/(?:₹|rs\.?|inr\s*)?(\d+(?:,\d{3})*(?:k|thousand)?)/i);
    let specificAmount: number | undefined;
    if (specificAmountMatch) {
      specificAmount = parseAmount(specificAmountMatch[1]);
    }
    
    // Step 4: Apply additional filters to transactions if specified
    if (transactionFilters.minAmount || transactionFilters.maxAmount || transactionFilters.transactionType || specificAmount) {
      let filteredTransactions = financialSummary.transactions;
      
      if (transactionFilters.minAmount) {
        filteredTransactions = filteredTransactions.filter(t => t.amount >= transactionFilters.minAmount!);
      }
      if (transactionFilters.maxAmount) {
        filteredTransactions = filteredTransactions.filter(t => t.amount <= transactionFilters.maxAmount!);
      }
      if (transactionFilters.transactionType && transactionFilters.transactionType !== 'ALL') {
        filteredTransactions = filteredTransactions.filter(t => t.type === transactionFilters.transactionType);
      }
      
      // If specific amount is mentioned, find transactions within ±10% range for approximate matching
      if (specificAmount) {
        const tolerance = specificAmount * 0.1; // 10% tolerance
        filteredTransactions = filteredTransactions.filter(t => 
          Math.abs(t.amount - specificAmount) <= tolerance || t.amount === specificAmount
        );
        // Sort by closest match first
        filteredTransactions.sort((a, b) => 
          Math.abs(a.amount - specificAmount) - Math.abs(b.amount - specificAmount)
        );
      }
      
      // Update the summary with filtered transactions
      financialSummary = {
        ...financialSummary,
        transactions: filteredTransactions,
        totalTransactionCount: filteredTransactions.length,
      };
    }
    
    const financialSummaryText = formatFinancialSummary(financialSummary);

    // Step 5: Determine if query is about user's own data or general financial advice
    // Only search external sources for general financial advice, not for user's own data queries
    const lowerQuery = userMessage.toLowerCase();
    const isUserDataQuery = 
      lowerQuery.includes('my ') ||
      lowerQuery.includes('my transactions') ||
      lowerQuery.includes('my expenses') ||
      lowerQuery.includes('my income') ||
      lowerQuery.includes('my spending') ||
      lowerQuery.includes('my savings') ||
      lowerQuery.includes('my goals') ||
      lowerQuery.includes('my wishlist') ||
      lowerQuery.includes('my categories') ||
      lowerQuery.includes('my data') ||
      lowerQuery.includes('my financial') ||
      lowerQuery.includes('tell me about myself') ||
      lowerQuery.includes('tell me about me') ||
      lowerQuery.includes('based on my') ||
      lowerQuery.includes('based on financial trend') ||
      lowerQuery.includes('based on my financial') ||
      (lowerQuery.includes('list') && (lowerQuery.includes('transaction') || lowerQuery.includes('expense'))) ||
      lowerQuery.includes('show me') ||
      lowerQuery.includes('what are my') ||
      lowerQuery.includes('how much did i') ||
      lowerQuery.includes('where did i spend') ||
      lowerQuery.includes('analyze my') ||
      lowerQuery.includes('my spending pattern') ||
      lowerQuery.includes('my financial situation') ||
      lowerQuery.includes('why did i') ||
      lowerQuery.includes('why did i send') ||
      lowerQuery.includes('why did i pay') ||
      lowerQuery.includes('what did i pay') ||
      lowerQuery.includes('what did i send') ||
      lowerQuery.includes('deduce') ||
      lowerQuery.includes('what was') ||
      lowerQuery.includes('who did i pay') ||
      lowerQuery.includes('who did i send') ||
      lowerQuery.includes('category') ||
      lowerQuery.includes('business') ||
      lowerQuery.includes('person');

    const relevantDocs: Array<{ id: string; title: string; content: string }> = [];
    const sources: Array<{ type: 'document' | 'internet'; id?: string; title?: string; url?: string }> = [];

    // Only search external sources if NOT a user data query
    if (!isUserDataQuery) {
      // Search super documents first
      const allSuperDocs = await (prisma as any).superDocument.findMany({
        where: {
          visibility: 'PUBLIC',
        },
        select: {
          id: true,
          title: true,
          processedText: true,
        },
      });

      if (allSuperDocs.length > 0) {
        // Search documents
        const searchResults = await searchDocuments(
          userMessage,
          allSuperDocs.map((doc: { id: string; title: string; processedText: string | null }) => ({
            id: doc.id,
            title: doc.title,
            processedText: doc.processedText,
          }))
        );

        // Get full text for top 3 relevant documents
        const topDocs = searchResults.slice(0, 3);
        for (const result of topDocs) {
          const docText = await getDocumentText(result.documentId);
          if (docText) {
            relevantDocs.push({
              id: result.documentId,
              title: result.title,
              content: docText,
            });
            sources.push({
              type: 'document',
              id: result.documentId,
              title: result.title,
            });
          }
        }
      }

      // Step 6: If no relevant documents found, search internet
      if (relevantDocs.length === 0) {
        const internetResults = await searchInternet(userMessage);
        const internetSources = internetResults.map((result) => ({
          type: 'internet' as const,
          url: result.url,
          title: result.title,
        }));
        sources.push(...internetSources);
      }
    }

    // Step 7: Get conversation history if conversationId exists
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (conversationId) {
      const messages = await (prisma as any).advisorMessage.findMany({
        where: {
          conversationId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 10, // Last 10 messages for context
      });

      conversationHistory = messages.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      }));
    }

    // Step 8: Generate AI response
    const aiResponse = await generateResponse(userMessage, {
      financialSummary: financialSummaryText,
      relevantDocuments: relevantDocs.length > 0 ? relevantDocs : undefined,
      conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
    });

    return {
      response: aiResponse.response,
      sources: [...sources, ...aiResponse.sources.filter((s) => !sources.find((existing) => existing.id === s.id))],
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

