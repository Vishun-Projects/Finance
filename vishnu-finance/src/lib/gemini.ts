import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFile } from 'fs/promises';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not set in environment variables');
}

export const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

/**
 * Text models known to work with current Google AI keys.
 * Override primary with GEMINI_MODEL=… in env. Do not use retired ids
 * (gemini-pro, gemini-1.5-*, gemma-3-*).
 */
export const GEMINI_TEXT_MODELS: string[] = [
  ...(process.env.GEMINI_MODEL?.trim() ? [process.env.GEMINI_MODEL.trim()] : []),
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest',
];

export function getPreferredGeminiModel(): string {
  return GEMINI_TEXT_MODELS[0] ?? 'gemini-2.5-flash';
}

function isModelUnavailableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('not found') ||
    m.includes('404') ||
    m.includes('is not supported') ||
    m.includes('no longer available') ||
    m.includes('deprecated')
  );
}

// Global flag to track if Gemini quota is exceeded (prevents unnecessary API calls)
import {
  clearGeminiQuotaBlock,
  getGeminiQuotaStatus,
  isGeminiQuotaBlocked,
  parseGeminiQuotaError,
  recordGeminiRequest,
  GeminiQuotaExceededError,
  type GeminiQuotaStatus,
} from '@/lib/gemini-quota';
import {
  generateGroqChatCompletion,
  getGroqRateLimitStatus,
  isGroqConfigured,
  truncateToTokenBudget,
  estimateTokens,
  type GroqRateLimitStatus,
} from '@/lib/groq';
import {
  withAiRetry,
  isNonRetryableQuotaError,
  parseRetryAfterMs,
} from '@/lib/ai-retry';

export type { GeminiQuotaStatus };
export { getGeminiQuotaStatus, clearGeminiQuotaBlock, getGroqRateLimitStatus };

export type AiProviderId = 'gemini' | 'groq';

export interface GenerateAiResult {
  response: string;
  sources: Array<{ type: 'document' | 'internet'; id?: string; title?: string; url?: string }>;
  provider: AiProviderId;
  /** Short note shown to the user (e.g. free-tier fallback) */
  providerNotice?: string;
  groqRateLimit?: GroqRateLimitStatus;
}

/**
 * Check if Gemini quota is exceeded
 */
export function isGeminiQuotaExceeded(error?: any): boolean {
  if (isGeminiQuotaBlocked()) return true;

  if (error) {
    const errorString = typeof error === 'string' ? error : JSON.stringify(error).toLowerCase();
    const isQuotaError =
      errorString.includes('429') ||
      errorString.includes('quota') ||
      errorString.includes('rate_limit') ||
      errorString.includes('too many requests') ||
      errorString.includes('input_token_count') ||
      errorString.includes('exceeded your current quota');

    if (isQuotaError) {
      parseGeminiQuotaError(error);
      console.warn('🚫 Gemini API quota exceeded detected:', errorString.substring(0, 200));
      return true;
    }
  }
  return false;
}

/**
 * Reset quota exceeded flag (useful for testing or after quota reset)
 */
export function resetGeminiQuotaFlag(): void {
  clearGeminiQuotaBlock();
}

export interface DocumentSearchResult {
  documentId: string;
  title: string;
  relevanceScore: number;
  excerpt: string;
}

export interface InternetSearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Extract text from a PDF file
 * Returns empty string if extraction fails (allows fallback to other methods)
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  // PDF text extraction temporarily disabled due to build issues with @napi-rs/canvas in Next.js 16
  // Main bank statement parsing uses Python and is unaffected.
  return '';
}

/**
 * Search documents using semantic search with Gemini
 */
export async function searchDocuments(
  query: string,
  documents: Array<{ id: string; title: string; processedText: string | null }>
): Promise<DocumentSearchResult[]> {
  if (documents.length === 0) {
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: getPreferredGeminiModel() });

    // Create a prompt to find relevant documents
    const documentList = documents
      .map((doc, idx) => `${idx + 1}. ${doc.title}\n   Text: ${doc.processedText?.substring(0, 500) || 'No text available'}`)
      .join('\n\n');

    const prompt = `You are a financial document search assistant. Given the following query and a list of documents, identify which documents are most relevant.

Query: "${query}"

Documents:
${documentList}

For each relevant document, provide:
1. Document number (1-based index)
2. Relevance score (0-1, where 1 is most relevant)
3. A brief excerpt showing why it's relevant

Format your response as JSON array:
[
  {
    "documentNumber": 1,
    "relevanceScore": 0.9,
    "excerpt": "relevant text excerpt"
  }
]

Only include documents with relevance score > 0.3.`;

    // Use retry logic for API calls - Reduced for helper task speed
    const result = await retryWithBackoff(async () => {
      return await model.generateContent(prompt);
    }, 1, 500);

    const response = result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Fallback: simple keyword matching
      return simpleKeywordSearch(query, documents);
    }

    const results = JSON.parse(jsonMatch[0]) as Array<{
      documentNumber: number;
      relevanceScore: number;
      excerpt: string;
    }>;

    return results
      .filter((r) => r.documentNumber > 0 && r.documentNumber <= documents.length)
      .map((r) => ({
        documentId: documents[r.documentNumber - 1].id,
        title: documents[r.documentNumber - 1].title,
        relevanceScore: r.relevanceScore,
        excerpt: r.excerpt,
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error searching documents with Gemini:', errorMessage);

    // If it's a 503 or overloaded error after retries, fallback to keyword search
    if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
    }

    // Fallback to simple keyword search
    return simpleKeywordSearch(query, documents);
  }
}

/**
 * Simple keyword-based search fallback
 */
function simpleKeywordSearch(
  query: string,
  documents: Array<{ id: string; title: string; processedText: string | null }>
): DocumentSearchResult[] {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);

  return documents
    .map((doc) => {
      const text = (doc.processedText || doc.title).toLowerCase();
      let score = 0;
      let matches = 0;

      keywords.forEach((keyword) => {
        if (text.includes(keyword)) {
          matches++;
          score += 0.2;
        }
      });

      if (doc.title.toLowerCase().includes(queryLower)) {
        score += 0.3;
      }

      if (matches === keywords.length) {
        score += 0.2;
      }

      const excerpt = doc.processedText
        ? doc.processedText.substring(0, 200) + '...'
        : 'No content available';

      return {
        documentId: doc.id,
        title: doc.title,
        relevanceScore: Math.min(score, 1),
        excerpt,
      };
    })
    .filter((r) => r.relevanceScore > 0.3)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Helper function to retry API calls with Retry-After + full-jitter backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  try {
    return await withAiRetry(fn, {
      maxAttempts: maxRetries,
      baseMs: initialDelay,
      capMs: 30_000,
      shouldRetry: (error) => {
        if (isNonRetryableQuotaError(error)) return false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorObj = error as { status?: number; statusCode?: number };
        const status = errorObj?.status || errorObj?.statusCode;
        const isQuotaExceeded =
          errorMessage.includes('quota exceeded') ||
          errorMessage.includes('Quota exceeded') ||
          errorMessage.includes('exceeded your current quota') ||
          (status === 429 && /quota/i.test(errorMessage));
        if (isQuotaExceeded) return false;
        return (
          status === 503 ||
          status === 429 ||
          errorMessage.includes('503') ||
          errorMessage.includes('429') ||
          errorMessage.includes('overloaded') ||
          errorMessage.includes('Service Unavailable') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('The model is overloaded')
        );
      },
      getRetryAfterMs: (error) =>
        parseRetryAfterMs({
          retryAfterSeconds: (error as { status?: { retryAfterSeconds?: number } })?.status
            ?.retryAfterSeconds,
          message: error instanceof Error ? error.message : String(error),
        }),
    });
  } catch (error) {
    if (error instanceof GeminiQuotaExceededError) throw error;
    if (isGeminiQuotaExceeded(error) || isNonRetryableQuotaError(error)) {
      console.error('Gemini API quota exceeded');
      throw new GeminiQuotaExceededError(parseGeminiQuotaError(error));
    }
    throw error;
  }
}

const GEMINI_MAX_INPUT_TOKENS = Number(process.env.GEMINI_MAX_INPUT_TOKENS) || 24_000;

function fitGeminiFinancialSummary(summary: string | undefined): {
  text: string | undefined;
  truncated: boolean;
} {
  if (!summary) return { text: undefined, truncated: false };
  if (estimateTokens(summary) <= Math.floor(GEMINI_MAX_INPUT_TOKENS * 0.72)) {
    return { text: summary, truncated: false };
  }
  return {
    text: truncateToTokenBudget(summary, Math.floor(GEMINI_MAX_INPUT_TOKENS * 0.72)),
    truncated: true,
  };
}

function isOverloadOrEmptyError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes('503') ||
    lower.includes('overloaded') ||
    lower.includes('empty response') ||
    lower.includes('service unavailable') ||
    lower.includes('high demand')
  );
}

/**
 * Generate AI response with context from documents.
 * Uses Gemini first; on free-tier quota OR overload falls back to Groq.
 */
export async function generateResponse(
  userMessage: string,
  context: {
    financialSummary?: string;
    relevantDocuments?: Array<{ id: string; title: string; content: string }>;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    systemPreamble?: string;
    intent?: string;
    filterContext?: {
      searchTerm?: string;
      dateRange?: { startDate?: Date; endDate?: Date };
      appliedLimit?: number;
    };
    onToken?: (delta: string) => void;
  }
): Promise<GenerateAiResult> {
  const fitted = fitGeminiFinancialSummary(context.financialSummary);
  const ctx = {
    ...context,
    financialSummary: fitted.text,
  };

  // Gemini already blocked for the day → go straight to Groq free tier
  if (isGeminiQuotaBlocked() && isGroqConfigured()) {
    const result = await generateViaGroqFallback(userMessage, ctx);
    if (fitted.truncated) {
      result.providerNotice = `${result.providerNotice || ''} Context truncated to fit token budgets.`.trim();
    }
    return result;
  }

  try {
    const geminiResult = await generateGeminiResponse(userMessage, ctx);
    return {
      ...geminiResult,
      provider: 'gemini',
      providerNotice: fitted.truncated
        ? 'Context truncated to fit Gemini token budget.'
        : geminiResult.providerNotice,
    };
  } catch (error) {
    const quotaHit =
      error instanceof GeminiQuotaExceededError || isGeminiQuotaExceeded(error);
    const overloadHit = isOverloadOrEmptyError(error);

    if ((quotaHit || overloadHit) && isGroqConfigured()) {
      console.warn(
        quotaHit
          ? 'Gemini quota exhausted — falling back to Groq free tier'
          : 'Gemini overloaded/empty — falling back to Groq free tier',
      );
      const result = await generateViaGroqFallback(userMessage, ctx);
      if (fitted.truncated) {
        result.providerNotice = `${result.providerNotice || ''} Context truncated to fit token budgets.`.trim();
      }
      if (overloadHit && !quotaHit) {
        result.providerNotice = `Gemini was overloaded — answering with Groq. ${result.providerNotice || ''}`.trim();
      }
      return result;
    }

    if (error instanceof GeminiQuotaExceededError) throw error;
    if (quotaHit) throw new GeminiQuotaExceededError(parseGeminiQuotaError(error));
    throw error;
  }
}

async function generateViaGroqFallback(
  userMessage: string,
  context: {
    financialSummary?: string;
    relevantDocuments?: Array<{ id: string; title: string; content: string }>;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    systemPreamble?: string;
    intent?: string;
    filterContext?: {
      searchTerm?: string;
      dateRange?: { startDate?: Date; endDate?: Date };
      appliedLimit?: number;
    };
    onToken?: (delta: string) => void;
  },
): Promise<GenerateAiResult> {
  const guardrails = truncateToTokenBudget(context.systemPreamble ?? '', 500);
  const intentHint = context.intent
    ? `\nUser intent classification: ${context.intent}. Stay within budgeting/planning scope.`
    : '';

  let contextText = '';
  if (context.filterContext) {
    const { searchTerm, dateRange, appliedLimit } = context.filterContext as {
      searchTerm?: string;
      dateRange?: { startDate?: Date; endDate?: Date };
      appliedLimit?: number;
      allTime?: boolean;
    };
    contextText += '\n\nDATA WINDOW:';
    if (searchTerm) contextText += `\n- Focus: ${searchTerm}`;
    if (dateRange?.startDate || dateRange?.endDate) {
      contextText += `\n- Date Range: ${dateRange.startDate?.toDateString() || '…'} to ${dateRange.endDate?.toDateString() || '…'}`;
    }
    if (appliedLimit) contextText += `\n- Txn cap ~${appliedLimit}`;
  }
  if (context.financialSummary) {
    contextText += `\n\nUser's Financial Summary:\n${truncateToTokenBudget(context.financialSummary, 6500)}\n`;
  }

  const system = truncateToTokenBudget(
    `${guardrails}${intentHint}

You are a knowledgeable financial advisor for Indian personal finance.
Use ONLY the provided financial context. Cite numbers from context.
Prefer compact markdown tables. Never recommend specific stocks/funds.
When a chart is rendered by the app, summarize it — do not say you cannot chart.
Keep answers concise.
Do NOT add repetitive disclaimers. Add at most one brief compliance disclaimer, and only when user explicitly asks investment advice.`,
    700,
  );

  const userContent = `${contextText}\n\nUser Question: ${userMessage}\n\nProvide a helpful, accurate response based on the context above.`;

  const { text, rateLimit, modelUsed } = await generateGroqChatCompletion({
    system,
    userMessage: userContent,
    conversationHistory: (context.conversationHistory ?? []).slice(-4).map((m) => ({
      role: m.role,
      content: truncateToTokenBudget(m.content, 350),
    })),
    temperature: 0.7,
    onToken: context.onToken,
  });

  const shortModel = modelUsed.includes('/') ? modelUsed.split('/').pop()! : modelUsed;

  return {
    response: text,
    sources: [],
    provider: 'groq',
    providerNotice: `Gemini free-tier limit reached — answering with Groq (${shortModel}). Context may be truncated to fit free-tier TPM.`,
    groqRateLimit: rateLimit,
  };
}

async function generateGeminiResponse(
  userMessage: string,
  context: {
    financialSummary?: string;
    relevantDocuments?: Array<{ id: string; title: string; content: string }>;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    systemPreamble?: string;
    intent?: string;
    filterContext?: {
      searchTerm?: string;
      dateRange?: { startDate?: Date; endDate?: Date };
      appliedLimit?: number;
    };
    onToken?: (delta: string) => void;
  }
): Promise<{
  response: string;
  sources: Array<{ type: 'document' | 'internet'; id?: string; title?: string; url?: string }>;
  providerNotice?: string;
}> {
  // Try models in order of preference with fallback (skip retired ids)
  const models = GEMINI_TEXT_MODELS;

  let lastError: Error | null = null;

  for (const modelName of models) {
    try {
      // AI OPTIMIZATION: Check quota before trying next model
      if (isGeminiQuotaBlocked()) {
        const status = getGeminiQuotaStatus();
        throw new GeminiQuotaExceededError(status);
      }

      return await retryWithBackoff(async () => {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            // Long spend analyses need room; 2048 was truncating mid-sentence.
            maxOutputTokens: 8192,
          },
        });

        recordGeminiRequest(modelName);

        const guardrails = context.systemPreamble ?? '';
        const intentHint = context.intent
          ? `\nUser intent classification: ${context.intent}. Stay within budgeting/planning scope.`
          : '';

        const systemPrompt = `${guardrails}${intentHint}

You are a knowledgeable financial advisor specializing in Indian personal finance, tax planning, and financial management. 

Your role is to:
1. Provide accurate, practical financial advice tailored to Indian financial systems
2. Reference official documents and sources when available
3. Suggest actionable steps based on the user's financial situation
4. Be clear, concise, and helpful
5. ANALYZE and DEDUCE information from transaction data when asked

IMPORTANT - DATA ACCESS:
You have FULL ACCESS to the user's individual transaction data. The financial summary includes:
- Complete list of ALL transactions with dates, amounts, descriptions, categories, stores, and person names
- Transaction format: Date, Amount, Description, [Category: name], [Business/Store: name], [Person: name]
- You can filter, analyze, and list transactions based on:
  * Amount thresholds (e.g., "transactions above ₹15,000")
  * Date ranges (e.g., "transactions in January", "last 3 months")
  * Categories (e.g., "food expenses", "transportation")
  * Stores (businesses) or person names
  * Transaction types (income, expense, etc.)
- When users ask for specific transactions, ALWAYS provide the actual transaction list from the data
- Do NOT say you don't have access to individual transactions - you do!

CRITICAL - ATTACHMENT HANDLING:
- Users may attach files (PDFs, documents, images) with their messages
- When attachments are provided, they will be clearly marked with "📎 ATTACHED FILES - HIGH PRIORITY"
- YOU MUST PRIORITIZE attachment content over other context when answering
- Analyze the FULL content of attachments and incorporate ALL relevant information into your response
- For PDFs and documents, the text content has already been extracted - use it directly
- IMPORTANT: Even if the extracted text is partial or imperfect (e.g., from scanned PDFs), work with what you have:
  * Extract any readable information (amounts, dates, descriptions)
  * Use pattern recognition to identify transactions even if formatting is imperfect
  * Look for keywords like "grocery", "food", "supermarket", "retail" in descriptions
  * Identify transaction patterns and categorize them based on available information
- If an attachment contains financial data (statements, receipts, invoices):
  * Extract ALL amounts, dates, and transaction details you can identify
  * Compare with the user's transaction data in the financial summary
  * Identify any discrepancies or missing transactions
  * Provide detailed analysis based on BOTH the attachment and transaction data
  * If the attachment shows transactions not in the user's data, mention them
- If the user asks a question about the attachment (e.g., "analyze my grocery spending from this PDF"), answer based PRIMARILY on the attachment content
- Always mention which attachment(s) you used and cite specific details from them
- If attachment content conflicts with transaction data, mention both and explain the discrepancy
- If the PDF extraction was partial, acknowledge it but work with what's available and provide the best analysis possible

CRITICAL - TRANSACTION ANALYSIS:
When users ask questions about a specific time period (e.g., "september 2025", "july 2025", "last month"):
1. ALWAYS analyze ALL transactions for that time period - do NOT limit to just a few transactions
2. The financial summary includes ALL transactions for the requested date range - use ALL of them
3. When analyzing a month or date range:
   - List ALL transactions found in that period
   - Group them by type (income/expense)
   - Provide comprehensive analysis covering ALL transactions
   - Do NOT say "I found only X transactions" if the data shows more - analyze ALL of them

When users ask questions like "why did I send/pay X amount?" or "what was this for?":
1. ALWAYS search through ALL transaction data to find matching amounts
2. For each matching transaction, analyze and provide:
   - The category (if available) - what type of expense/income it was
   - Whether it was to a PERSON (indicated by [Person: name]) or BUSINESS/STORE (indicated by [Business/Store: name])
   - If it's a business, deduce what type of business it might be based on:
     * The store/business name
     * The category
     * The description
     * Common business patterns (e.g., "Swiggy" = food delivery, "Amazon" = e-commerce, "Uber" = transportation)
   - The date and description to provide context
3. If multiple transactions match, list ALL of them with analysis - do NOT skip any
4. Use smart filtering - if user mentions an amount, find transactions with that exact or similar amount
5. If the amount is approximate (e.g., "around 15k"), find transactions within a reasonable range (±10%)
6. Group similar transactions together for better analysis
7. Provide clear explanations with proper markdown formatting
8. ALWAYS provide a response - even if no exact match is found, search for similar amounts and explain what you found
9. If you find transactions, format them clearly with:
   **Transaction Analysis:**
   - Date: [date]
   - Amount: ₹[amount]
   - Category: [category] (if available)
   - Type: [Person/Business]
   - Business Type: [deduced business type] (if business)
   - Description: [description]
   - Analysis: [your deduction about why this transaction happened]

IMPORTANT - DATE RANGE QUERIES:
- When a user asks about a specific month/year (e.g., "september 2025", "july 2025"), the financial summary contains ALL transactions for that entire period
- You MUST analyze ALL transactions shown in the summary, not just a subset
- If the summary shows "X total transactions", analyze ALL X transactions
- Provide a comprehensive overview covering ALL transactions in the requested period

IMPORTANT FORMATTING REQUIREMENTS:
- Always respond in English (not Hindi, Urdu, or mixed languages)
- Use proper markdown formatting that will render correctly:
  * Use **bold** for emphasis and section headers
  * Use bullet points (- or *) and numbered lists when helpful
  * Use proper line breaks between paragraphs
  * Format currency as ₹X,XXX — backticks around amounts are fine: \`₹15,000\`
  * For comparisons / planned vs actual / multi-metric answers: use GitHub-flavored MARKDOWN TABLES:
    | Bucket | Planned | Actual | Variance | Performance |
    | --- | ---: | ---: | ---: | --- |
    | Needs | 20000 | 18000 | -2000 | Under (Good) |
  * Include a header row AND a separator row (| --- | --- |) so tables render
  * When the user asks for HTML, you may add a fenced \`\`\`html table block in addition to markdown
  * Do NOT invent Excel/PDF binary content in text — tables in markdown are enough; the app exports files
- Keep responses well-structured with clear sections
- Use professional, friendly tone
- When asked about budget performance, cover ALL plan buckets from structured data (good and bad)

Always prioritize the STRUCTURED USER FINANCE DATA and the user's actual transactions over general knowledge.`;

        let contextText = '';

        if (context.filterContext) {
          const { searchTerm, dateRange, appliedLimit, allTime } = context.filterContext as {
            searchTerm?: string;
            dateRange?: { startDate?: Date; endDate?: Date };
            appliedLimit?: number;
            fullContext?: boolean;
            allTime?: boolean;
          };
          contextText += `\n\nDATA WINDOW:`;
          contextText += `\n- Structured finance pack is provided (buckets, categories, people, stores, transactions).`;
          if (allTime) {
            contextText += `\n- Period: ALL AVAILABLE HISTORY (not limited to the current month). Do NOT say data is only for July/this month.`;
          }
          if (searchTerm) {
            contextText += `\n- Focus hint: ${searchTerm}`;
          }
          if (dateRange && !allTime) {
            const s = dateRange.startDate ? dateRange.startDate.toDateString() : 'Beginning';
            const e = dateRange.endDate ? dateRange.endDate.toDateString() : 'Latest';
            contextText += `\n- Date Range: ${s} to ${e}`;
          }
          if (appliedLimit) {
            contextText += `\n- Transaction rows capped around ${appliedLimit} (aggregates remain authoritative when present).`;
          }
        }

        if (context.financialSummary) {
          contextText += `\n\nUser's Financial Summary:\n${context.financialSummary}\n`;
        }

        if (context.relevantDocuments && context.relevantDocuments.length > 0) {
          contextText += '\n\nRelevant Documents:\n';
          context.relevantDocuments.forEach((doc, idx) => {
            contextText += `\n[Document ${idx + 1}: ${doc.title}]\n${doc.content.substring(0, 1000)}...\n`;
          });
          contextText += '\n\nUse information from these documents to answer the question. Cite which document you used.';
        }

        if (context.conversationHistory && context.conversationHistory.length > 0) {
          contextText += '\n\nPrevious Conversation:\n';
          context.conversationHistory.slice(-4).forEach((msg) => {
            contextText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
          });
        }

        const prompt = `${systemPrompt}${contextText}\n\nUser Question: ${userMessage}\n\nProvide a helpful, accurate response based on the context above. If this is a transaction lookup, list matching transactions first (date, amount, category, counterparty) before interpretation. If you reference a document, mention which one.`;

        let text = '';
        if (context.onToken) {
          const streamResult = await retryWithBackoff(async () => {
            return await model.generateContentStream(prompt);
          }, 2, 800);
          for await (const chunk of streamResult.stream) {
            const delta = chunk.text();
            if (delta) {
              text += delta;
              context.onToken(delta);
            }
          }
        } else {
          const result = await retryWithBackoff(async () => {
            return await model.generateContent(prompt);
          }, 2, 800);
          text = result.response.text();
        }

        // Validate that we got a response
        if (!text || text.trim().length === 0) {
          throw new Error(`Model ${modelName} returned an empty response. This could indicate the model is overloaded or there was an issue processing your request.`);
        }

        // Extract sources from response
        const sources: Array<{ type: 'document' | 'internet'; id?: string; title?: string; url?: string }> = [];

        if (context.relevantDocuments) {
          context.relevantDocuments.forEach((doc) => {
            if (text.toLowerCase().includes(doc.title.toLowerCase())) {
              sources.push({
                type: 'document',
                id: doc.id,
                title: doc.title,
              });
            }
          });
        }

        return { response: text, sources };
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // AI OPTIMIZATION: FAIL FAST if it's a quota error
      if (lastError instanceof GeminiQuotaExceededError) {
        throw lastError;
      }
      if (isGeminiQuotaExceeded(error)) {
        console.error('Model failed due to quota limit. Aborting all further models.');
        throw new GeminiQuotaExceededError(parseGeminiQuotaError(error));
      }

      // Retry next model on availability / overload errors
      if (
        !isModelUnavailableError(lastError.message) &&
        !lastError.message.includes('503') &&
        !lastError.message.includes('overloaded')
      ) {
        throw lastError;
      }

      // Continue to next model
      continue;
    }
  }

  // If all models failed
  console.error('Error generating response with Gemini (all models failed):', lastError);
  if (lastError instanceof GeminiQuotaExceededError) {
    throw lastError;
  }
  if (lastError instanceof Error) {
    if (isGeminiQuotaExceeded(lastError)) {
      throw new GeminiQuotaExceededError(parseGeminiQuotaError(lastError));
    }
    // Check for specific Gemini API errors
    if (lastError.message.includes('API_KEY')) {
      throw new Error('Invalid Google API key. Please check your GOOGLE_API_KEY environment variable.');
    }
    if (lastError.message.includes('quota') || lastError.message.includes('rate limit') || lastError.message.includes('429')) {
      throw new GeminiQuotaExceededError(parseGeminiQuotaError(lastError));
    }
    if (lastError.message.includes('503') || lastError.message.includes('overloaded')) {
      throw new Error('Gemini API is currently overloaded. Please try again in a few moments.');
    }
    throw new Error(`Failed to generate AI response: ${lastError.message}`);
  }
  throw new Error('Failed to generate AI response');
}

/**
 * Search internet using Gemini's grounding feature (if available) or return empty
 * Note: Gemini's internet search requires specific API features
 */
export async function searchInternet(query: string): Promise<InternetSearchResult[]> {
  try {
    const model = genAI.getGenerativeModel({ model: getPreferredGeminiModel() });

    const prompt = `Given this financial query: "${query}"

Suggest 3-5 official Indian government or financial regulatory websites that would have relevant information. Format as JSON:

[
  {
    "title": "Website Title",
    "url": "https://example.com",
    "snippet": "Brief description of what information is available"
  }
]

Focus on official sources like:
- Income Tax Department (incometax.gov.in)
- SEBI (sebi.gov.in)
- RBI (rbi.org.in)
- Government financial portals`;

    // Use retry logic for API calls - Reduced for helper task speed
    const result = await retryWithBackoff(async () => {
      return await model.generateContent(prompt);
    }, 1, 500);

    const response = result.response;
    const text = response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as InternetSearchResult[];
    }

    // Fallback: return generic official sources
    return [
      {
        title: 'Income Tax Department - India',
        url: 'https://www.incometax.gov.in',
        snippet: 'Official website for income tax information, ITR filing, and tax-related queries',
      },
      {
        title: 'SEBI - Securities and Exchange Board of India',
        url: 'https://www.sebi.gov.in',
        snippet: 'Regulatory information about investments, securities, and market regulations',
      },
    ];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error searching internet:', errorMessage);

    // If API is overloaded, return fallback sources instead of empty array
    if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
      return [
        {
          title: 'Income Tax Department - India',
          url: 'https://www.incometax.gov.in',
          snippet: 'Official website for income tax information, ITR filing, and tax-related queries',
        },
        {
          title: 'SEBI - Securities and Exchange Board of India',
          url: 'https://www.sebi.gov.in',
          snippet: 'Regulatory information about investments, securities, and market regulations',
        },
        {
          title: 'RBI - Reserve Bank of India',
          url: 'https://www.rbi.org.in',
          snippet: 'Central bank information on monetary policy, banking regulations, and financial stability',
        },
      ];
    }

    return [];
  }
}


/**
 * Auto-categorize a batch of transactions
 */
export async function categorizeTransactionsBatch(
  transactions: Array<{ id: string; description: string; amount: number; store?: string }>,
  categories: Array<{ id: string; name: string; type: string }>
): Promise<Array<{ id: string; categoryId: string; confidence: number }>> {
  if (transactions.length === 0) return [];

  // Create category list string
  const categoryList = categories
    .map(c => `${c.name} (${c.type}) [ID: ${c.id}]`)
    .join('\n');

  const prompt = `You are an expert financial categorization AI for personal finance in India.
  Your job is to categorize bank transactions accurately. AVOID using "Other" unless absolutely necessary.
  
  CATEGORY LIST (Pick the BEST specific match):
  ${categoryList}
  
  TRANSACTIONS TO CATEGORIZE:
  ${transactions.map(t => `ID: ${t.id} | Desc: ${t.description} | Store: ${t.store || 'N/A'} | Amount: ₹${t.amount}`).join('\n')}
  
  IMPORTANT RULES:
  1. UPI transactions (containing @, upi, paytm, phonepe, gpay) are usually Shopping, Food & Dining, or specific stores
  2. NEFT/RTGS/IMPS are usually Transfers (if to a person) or Bills/Investments
  3. ATM/Cash withdrawals = Cash (or create if not available)
  4. Swiggy/Zomato = Food & Dining
  5. Uber/Ola = Transport
  6. Amazon/Flipkart/Myntra = Shopping
  7. Netflix/Hotstar/Spotify = Entertainment or Subscriptions
  8. Insurance/LIC/HDFC Life = Insurance
  9. Mutual Fund/SIP/Zerodha/Groww = Investments
  10. Electricity/Gas/Water/Broadband = Utilities
  11. School/College/Coaching = Education
  12. Hospital/Pharmacy/Apollo/Medplus = Healthcare
  13. Rent/EMI/Loan = Housing/EMI
  14. Salary/Income credited = Income
  15. DO NOT use "Other" or "Miscellaneous" unless truly unidentifiable
  16. If unsure between 2 categories, pick the more SPECIFIC one
  
  Return valid JSON array: [{"id": "...", "categoryId": "...", "confidence": 0.9}, ...]
  JSON ONLY, no markdown, no explanation.`;

  try {
    const model = genAI.getGenerativeModel({ model: getPreferredGeminiModel() });
    const result = await retryWithBackoff(async () => {
      return await model.generateContent(prompt);
    }, 2, 2000);
    const text = result.response.text();
    // Clean json if needed (though responseMimeType helps)
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Batch categorization failed in gemini.ts:", error);
    // Print full error details if available
    if (error && typeof error === 'object' && 'response' in error) {
      console.error("Gemini API Error Response:", JSON.stringify((error as any).response));
    }
    return [];
  }
}

/**
 * Generate an image using Gemini (Imagen model)
 */
export async function generateImage(prompt: string): Promise<string | null> {
  try {
    // Note: This requires the 'imagen-3.0-generate-001' model access
    const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });

    // Add "minimalist, Notion-style linography" keywords to the prompt if not already present,
    // as per the user's aesthetic preference.
    const enhancedPrompt = `${prompt} . Minimalist, Notion-style linography, clean lines, white background, high contrast, symbolist, no text.`;

    // Check if quota is exceeded before trying
    if (isGeminiQuotaBlocked()) {
      return null;
    }

    const result = await retryWithBackoff(async () => {
      return await model.generateContent(enhancedPrompt);
    }, 2, 2000);

    const response = result.response;

    // Check if we have image candidates
    // The structure depends on the specific API version, but typically it contains 'images' or inline data
    // For the current Node SDK with Imagen, it might return parts with inlineData

    // Inspecting response structure for images is tricky without exact types, 
    // but typically for Imagen it returns a blob or base64.
    // Let's assume standard generateContent response with inlineData for now, 
    // or we might need to use a specific property if the SDK exposes it differently.

    // NOTE: As of current SDK, image generation might be valid via generateContent but the response handling is key.
    // However, if the model returns a standard text response stating it can't generate images, we need to handle that.
    // Assuming the user has access to Imagen 3 via the API key.

    // The response.text() would be empty for image only response usually.
    // We look for parts.

    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          return part.inlineData.data; // This is the base64 string
        }
      }
    }

    console.warn('Gemini image generation response did not contain image data');
    return null;

  } catch (error) {
    console.error('Error generating image with Gemini:', error);
    // Determine if it's a model not found error (likely no access to Imagen)
    const err = error as Error;
    if (err.message.includes('not found') || err.message.includes('404')) {
      console.error('Imagen model not found. Ensure your API key has access to imagen-3.0-generate-001.');
    }
    return null;
  }
}

