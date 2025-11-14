import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFile } from 'fs/promises';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyBXldcBbMnOvvLISw84bdbGDuo6OJn6STs';

if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

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
  // First check if @napi-rs/canvas is available
  let canvasAvailable = false;
  try {
    require.resolve('@napi-rs/canvas');
    canvasAvailable = true;
  } catch {
    // Canvas not available, skip pdf-parse
    return '';
  }

  // If canvas is available, try pdf-parse
  if (canvasAvailable) {
    try {
      const dataBuffer = await readFile(filePath);
      // Use require for server-side code to avoid ESM import issues
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(dataBuffer);
      return data.text || '';
    } catch (error) {
      // Silently fail - will fallback to Python parser or Gemini Vision API
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('DOMMatrix') || 
          errorMessage.includes('@napi-rs/canvas') ||
          errorMessage.includes('Cannot find module')) {
        // Known issue with canvas dependency, skip silently
        return '';
      }
      // For other errors, also return empty to allow fallback
      return '';
    }
  }

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
    // Try gemini-2.5-flash first, fallback to gemini-1.5-flash if unavailable
    let model;
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    } catch {
      console.log('Falling back to gemini-1.5-flash for document search');
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

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

    // Use retry logic for API calls
    const result = await retryWithBackoff(async () => {
      return await model.generateContent(prompt);
    }, 3, 1000);
    
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
      console.log('Falling back to keyword-based search due to API overload');
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
 * Helper function to retry API calls with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check error message and any nested error properties
      const errorMessage = lastError.message || '';
      const errorObj = error as any;
      const status = errorObj?.status || errorObj?.statusCode || errorObj?.response?.status;
      
      // Check if it's a retryable error (503, 429, or network errors)
      const isRetryable = 
        status === 503 ||
        status === 429 ||
        errorMessage.includes('503') ||
        errorMessage.includes('429') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('Service Unavailable') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('The model is overloaded');
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Exponential backoff: wait longer with each retry
      // Add jitter to avoid thundering herd
      const baseDelay = initialDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
      const delay = Math.floor(baseDelay + jitter);
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay (error: ${errorMessage.substring(0, 100)})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Unknown error');
}

/**
 * Generate AI response with context from documents
 */
export async function generateResponse(
  userMessage: string,
  context: {
    financialSummary?: string;
    relevantDocuments?: Array<{ id: string; title: string; content: string }>;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
): Promise<{ response: string; sources: Array<{ type: 'document' | 'internet'; id?: string; title?: string; url?: string }> }> {
  // Try models in order of preference with fallback
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
  
  let lastError: Error | null = null;
  
  for (const modelName of models) {
    try {
      return await retryWithBackoff(async () => {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        });

        const systemPrompt = `You are a knowledgeable financial advisor specializing in Indian personal finance, tax planning, investments, and financial management. 

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
  * Use **bold** for emphasis and section headers (e.g., **Section Title**)
  * Use bullet points with proper markdown syntax:
    - Use single dash (-) or asterisk (*) followed by space for bullet points
    - Each bullet point should be on its own line
    - Example:
      - First bullet point
      - Second bullet point
  * Use numbered lists (1., 2., 3.) for step-by-step instructions
  * Use proper line breaks (double newline) between paragraphs
  * Use code blocks with backticks for specific amounts: \`₹15,000\`
  * Do NOT use HTML tags or special characters
- Keep responses well-structured with clear sections separated by blank lines
- Use professional, friendly tone
- Format currency as ₹X,XXX (Indian Rupee format) - use backticks for amounts: \`₹15,000\`
- When listing transactions or data, use proper markdown lists:
  * Each item on a new line starting with - or *
  * Use consistent indentation
  * Separate sections with blank lines
- Example of proper formatting:
  **Financial Overview:**
  
  - **Total Income:** \`₹3,38,981\`
  - **Total Expenses:** \`₹3,42,516.83\`
  - **Net Savings:** \`₹-3,535.83\`
  
  **Key Insights:**
  
  - Your expenses exceed income by \`₹3,535.83\`
  - Focus on reducing discretionary spending

Always prioritize information from provided documents and the user's actual transaction data over general knowledge.`;

        let contextText = '';

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

        const prompt = `${systemPrompt}${contextText}\n\nUser Question: ${userMessage}\n\nProvide a helpful, accurate response based on the context above. If you reference a document, mention which one.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

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
      console.log(`Model ${modelName} failed, trying next model...`, lastError.message);
      
      // If it's not a model availability error, don't try other models
      if (!lastError.message.includes('not found') && 
          !lastError.message.includes('503') && 
          !lastError.message.includes('overloaded')) {
        throw lastError;
      }
      
      // Continue to next model
      continue;
    }
  }
  
  // If all models failed
  console.error('Error generating response with Gemini (all models failed):', lastError);
  if (lastError instanceof Error) {
    // Check for specific Gemini API errors
    if (lastError.message.includes('API_KEY')) {
      throw new Error('Invalid Google API key. Please check your GOOGLE_API_KEY environment variable.');
    }
    if (lastError.message.includes('quota') || lastError.message.includes('rate limit')) {
      throw new Error('API rate limit exceeded. Please try again later.');
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
    // For now, we'll use Gemini to suggest search terms and return structured format
    // In production, you might want to use Google Custom Search API or similar
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    // Use retry logic for API calls
    const result = await retryWithBackoff(async () => {
      return await model.generateContent(prompt);
    }, 3, 1000);
    
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
      console.log('API overloaded, returning fallback internet sources');
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

