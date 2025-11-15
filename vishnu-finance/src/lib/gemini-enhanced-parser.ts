/**
 * Gemini-Enhanced Transaction Parser
 * ===================================
 * Uses Gemini AI to extract structured data from complex transaction descriptions
 * when quota allows. Falls back to rule-based parsing when quota is exceeded.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { retryWithBackoff, isGeminiQuotaExceeded } from './gemini';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

export interface ParsedTransactionData {
  store?: string | null;
  personName?: string | null;
  upiId?: string | null;
  commodity?: string | null;
  transferType?: string | null;
  transactionId?: string | null;
  accountNumber?: string | null;
  branch?: string | null;
  cleanDescription?: string;
}

/**
 * Parse transaction description using Gemini AI
 * Returns null if quota exceeded or parsing fails
 */
export async function parseTransactionWithGemini(
  description: string
): Promise<ParsedTransactionData | null> {
  // Check if quota is exceeded
  if (isGeminiQuotaExceeded()) {
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent extraction
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 512,
      },
    });

    const prompt = `Extract structured data from this Indian bank transaction description. 
Fix any spacing issues in UPI IDs, person names, and store names.

Transaction Description: "${description}"

Extract and return a JSON object with the following fields:
- store: Store/merchant name (if available, null otherwise)
- personName: Person name from UPI transactions (if available, null otherwise)
- upiId: UPI ID (format: name@bank, fix spacing issues like "mamtavishw akarma0948@okhdfcbank" -> "mamtavishwakarma0948@okhdfcbank")
- commodity: Product/item purchased (if available, null otherwise)
- transferType: Type of transfer (UPI, NEFT, RTGS, IMPS, etc., null otherwise)
- transactionId: Transaction reference number (if available, null otherwise)
- accountNumber: Account number (masked or partial, null otherwise)
- branch: Branch name (if available, null otherwise)
- cleanDescription: Cleaned description without technical codes and UPI details

IMPORTANT:
1. Fix spacing in UPI IDs: "/mamtavishw akarma0948@okhdfcbank" -> "mamtavishwakarma0948@okhdfcbank"
2. Extract person names from patterns like "HDFC0002504/MAMTA - INR 60.00 MUNSHEELAL VISHWAKARMA" -> "MAMTA MUNSHEELAL VISHWAKARMA"
3. Remove technical terms like "ANCH : ATM SERVICE BRANCH", "XXXXX", "UPI/", etc. from cleanDescription
4. For YES Bank format: "/mamtavishwakarma0948@okhdfcbank ANCH : ATM SERVICE BRANCH" -> extract upiId and personName from UPI ID

Return ONLY valid JSON, no other text. Example:
{
  "store": "Sangam Stationery Stores",
  "personName": null,
  "upiId": null,
  "commodity": "pens",
  "transferType": "UPI",
  "transactionId": "411950138862",
  "accountNumber": null,
  "branch": "ATM SERVICE BRANCH",
  "cleanDescription": "Sangam Stationery Stores - pens"
}`;

    const result = await retryWithBackoff(async () => {
      const response = await model.generateContent(prompt);
      return response.response.text();
    });

    // Parse JSON response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ParsedTransactionData;
      return parsed;
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if quota exceeded
    if (
      errorMessage.includes('quota exceeded') ||
      errorMessage.includes('Quota exceeded') ||
      errorMessage.includes('exceeded your current quota')
    ) {
      return null; // Quota exceeded, will fallback to rule-based
    }

    console.error('Error parsing transaction with Gemini:', errorMessage);
    return null;
  }
}

/**
 * Batch parse multiple transaction descriptions
 * Returns array of parsed data (null entries for failed/quota-exceeded)
 */
export async function parseTransactionsBatchWithGemini(
  descriptions: string[]
): Promise<(ParsedTransactionData | null)[]> {
  // Check if quota is exceeded
  if (isGeminiQuotaExceeded()) {
    return descriptions.map(() => null);
  }

  // Process in smaller batches to avoid token limits
  const batchSize = 10;
  const results: (ParsedTransactionData | null)[] = [];

  for (let i = 0; i < descriptions.length; i += batchSize) {
    const batch = descriptions.slice(i, i + batchSize);
    
    // Check quota before each batch
    if (isGeminiQuotaExceeded()) {
      results.push(...batch.map(() => null));
      continue;
    }

    try {
      const batchResults = await Promise.all(
        batch.map((desc) => parseTransactionWithGemini(desc))
      );
      results.push(...batchResults);
    } catch (error) {
      console.error(`Error parsing batch ${i / batchSize + 1}:`, error);
      results.push(...batch.map(() => null));
    }

    // Small delay between batches
    if (i + batchSize < descriptions.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

