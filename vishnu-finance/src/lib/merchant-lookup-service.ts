import { prisma } from './db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { retryWithBackoff } from './gemini';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const GOOGLE_CUSTOM_SEARCH_ENGINE_ID = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

export interface MerchantLookupResult {
  categoryName: string | null;
  categoryId: string | null;
  confidence: number;
  source: 'google_search' | 'web_scraping' | 'gemini' | 'cache';
}

/**
 * Normalize merchant name for lookup
 */
function normalizeMerchantName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .substring(0, 100); // Limit length
}

/**
 * Lookup merchant category from database cache
 */
async function lookupFromCache(
  normalizedName: string
): Promise<MerchantLookupResult | null> {
  try {
    // Use raw query for now since Prisma client may not be generated yet
    const cached = await (prisma as any).$queryRaw`
      SELECT 
        id,
        categoryName,
        categoryId,
        confidence,
        source,
        hitCount
      FROM merchant_categories
      WHERE normalizedName = ${normalizedName}
      LIMIT 1
    `;

    if (cached && cached.length > 0) {
      const record = cached[0];
      
      // Update hit count
      await (prisma as any).$executeRaw`
        UPDATE merchant_categories
        SET hitCount = hitCount + 1, updatedAt = NOW()
        WHERE id = ${record.id}
      `;

      return {
        categoryName: record.categoryName,
        categoryId: record.categoryId,
        confidence: record.confidence ? Number(record.confidence) : 0.8,
        source: 'cache',
      };
    }
  } catch (error) {
    console.error('Error looking up merchant from cache:', error);
    // Table might not exist yet, return null
  }

  return null;
}

/**
 * Lookup merchant category using Google Custom Search API
 */
async function lookupWithGoogleSearch(
  merchantName: string
): Promise<MerchantLookupResult | null> {
  if (!GOOGLE_CUSTOM_SEARCH_API_KEY || !GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
    return null;
  }

  try {
    const searchQuery = `${merchantName} merchant category business type India`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=3`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const items = data.items || [];

    // Extract category from search results
    // Look for common category keywords in snippets
    const snippets = items.map((item: any) => 
      (item.snippet || '').toLowerCase() + ' ' + (item.title || '').toLowerCase()
    ).join(' ');

    const categoryKeywords: Record<string, string[]> = {
      'Groceries': ['grocery', 'supermarket', 'food store', 'retail'],
      'Food & Dining': ['restaurant', 'cafe', 'food', 'dining', 'eatery'],
      'Shopping': ['shop', 'store', 'retail', 'mall', 'outlet'],
      'Healthcare': ['pharmacy', 'medical', 'hospital', 'clinic', 'health'],
      'Transportation': ['fuel', 'petrol', 'gas station', 'transport'],
      'Entertainment': ['cinema', 'movie', 'theater', 'entertainment'],
      'Utilities': ['utility', 'bill', 'service', 'provider'],
      'Education': ['school', 'college', 'education', 'institute'],
      'Insurance': ['insurance', 'premium', 'policy'],
      'Investment': ['investment', 'financial', 'mutual fund'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => snippets.includes(keyword))) {
        return {
          categoryName: category,
          categoryId: null,
          confidence: 0.75,
          source: 'google_search',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error in Google Custom Search:', error);
    return null;
  }
}

/**
 * Lookup merchant category using Gemini AI with web search
 */
async function lookupWithGemini(
  merchantName: string
): Promise<MerchantLookupResult | null> {
  if (!genAI) {
    return null;
  }

  try {
    const prompt = `What category does the merchant/store "${merchantName}" belong to? 

Consider common Indian merchant categories:
- Groceries (supermarkets, grocery stores, food stores)
- Food & Dining (restaurants, cafes, food delivery)
- Shopping (retail stores, malls, outlets)
- Healthcare (pharmacies, medical stores, hospitals)
- Transportation (fuel stations, transport services)
- Entertainment (cinemas, theaters, entertainment venues)
- Utilities (service providers, bill payments)
- Education (schools, colleges, institutes)
- Insurance (insurance companies, premium payments)
- Investment (financial services, mutual funds)

Respond with ONLY the category name (e.g., "Groceries", "Food & Dining", etc.) and your confidence (0-1). 
If you're not sure, respond with "null" for category.

Format: {"categoryName": "string or null", "confidence": number}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 100,
      },
    });

    const result = await retryWithBackoff(async () => {
      const response = await model.generateContent(prompt);
      return response.response.text();
    });

    // Parse JSON response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.categoryName && parsed.confidence >= 0.6) {
        return {
          categoryName: parsed.categoryName,
          categoryId: null,
          confidence: parsed.confidence || 0.7,
          source: 'gemini',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error in Gemini merchant lookup:', error);
    return null;
  }
}

/**
 * Save merchant category to database cache
 */
async function saveToCache(
  merchantName: string,
  normalizedName: string,
  result: MerchantLookupResult
): Promise<void> {
  try {
    const id = `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use raw query for upsert
    await (prisma as any).$executeRaw`
      INSERT INTO merchant_categories (
        id, merchantName, normalizedName, categoryName, categoryId, 
        confidence, source, lookupDate, hitCount, createdAt, updatedAt
      ) VALUES (
        ${id}, ${merchantName}, ${normalizedName}, ${result.categoryName}, ${result.categoryId},
        ${result.confidence}, ${result.source}, NOW(), 0, NOW(), NOW()
      )
      ON DUPLICATE KEY UPDATE
        categoryName = VALUES(categoryName),
        categoryId = VALUES(categoryId),
        confidence = VALUES(confidence),
        source = VALUES(source),
        lookupDate = NOW(),
        updatedAt = NOW()
    `;
  } catch (error) {
    console.error('Error saving merchant category to cache:', error);
    // Table might not exist yet, ignore
  }
}

/**
 * Lookup merchant category (main function)
 */
export async function lookupMerchantCategory(
  storeName: string,
  userId: string
): Promise<MerchantLookupResult | null> {
  if (!storeName || storeName.trim().length < MERCHANT_LOOKUP_CONFIG.MIN_STORE_NAME_LENGTH) {
    return null;
  }

  // Check if merchant lookup is enabled
  if (!MERCHANT_LOOKUP_CONFIG.ENABLED) {
    return null;
  }

  // Check quota
  if (!checkMerchantLookupQuota(userId)) {
    console.warn(`⚠️ Merchant lookup quota exceeded for user ${userId}`);
    return null;
  }

  const normalizedName = normalizeMerchantName(storeName);

  // 1. Check database cache first
  const cached = await lookupFromCache(normalizedName);
  if (cached) {
    return cached;
  }

  // 2. Try Google Custom Search API (if available)
  let result: MerchantLookupResult | null = null;
  if (MERCHANT_LOOKUP_CONFIG.USE_GOOGLE_SEARCH) {
    try {
      result = await lookupWithGoogleSearch(storeName);
      if (result && result.categoryName) {
        incrementMerchantLookupUsage(userId);
        await saveToCache(storeName, normalizedName, result);
        return result;
      }
    } catch (error) {
      console.error('Google Search lookup failed:', error);
    }
  }

  // 3. Fallback to Gemini (if enabled)
  if (!result && MERCHANT_LOOKUP_CONFIG.FALLBACK_TO_GEMINI && genAI) {
    try {
      result = await lookupWithGemini(storeName);
      if (result && result.categoryName && result.confidence >= MERCHANT_LOOKUP_CONFIG.CONFIDENCE_THRESHOLD) {
        incrementMerchantLookupUsage(userId);
        await saveToCache(storeName, normalizedName, result);
        return result;
      }
    } catch (error) {
      console.error('Gemini lookup failed:', error);
    }
  }

  return null;
}

// Merchant lookup configuration
const MERCHANT_LOOKUP_CONFIG = {
  ENABLED: process.env.ENABLE_MERCHANT_LOOKUP !== 'false',
  MIN_STORE_NAME_LENGTH: 3,
  CACHE_TTL: 365 * 24 * 60 * 60 * 1000, // 1 year (permanent)
  CONFIDENCE_THRESHOLD: 0.8,
  USE_GOOGLE_SEARCH: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY !== undefined,
  FALLBACK_TO_GEMINI: true,
  MAX_DAILY_LOOKUPS: 50,
} as const;

// Merchant lookup usage tracker
const merchantLookupTracker = new Map<string, {
  count: number;
  resetTime: number;
}>();

function checkMerchantLookupQuota(userId: string): boolean {
  const now = Date.now();
  const usage = merchantLookupTracker.get(userId);

  if (!usage || now > usage.resetTime) {
    merchantLookupTracker.set(userId, {
      count: 0,
      resetTime: now + (24 * 60 * 60 * 1000),
    });
    return true;
  }

  return usage.count < MERCHANT_LOOKUP_CONFIG.MAX_DAILY_LOOKUPS;
}

function incrementMerchantLookupUsage(userId: string): void {
  const usage = merchantLookupTracker.get(userId);
  if (usage) {
    usage.count++;
  }
}

