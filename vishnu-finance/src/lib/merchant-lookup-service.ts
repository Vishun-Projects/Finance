import { prisma } from './db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { retryWithBackoff } from './gemini';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
// Use provided credentials or fallback to environment variables
const GOOGLE_CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || 'AIzaSyBXldcBbMnOvvLISw84bdbGDuo6OJn6STs';
const GOOGLE_CUSTOM_SEARCH_ENGINE_ID = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID || '3711b19706be74dea';

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
 * Enhanced with better category detection and confidence scoring
 */
async function lookupWithGoogleSearch(
  merchantName: string
): Promise<MerchantLookupResult | null> {
  if (!GOOGLE_CUSTOM_SEARCH_API_KEY || !GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
    return null;
  }

  try {
    // Enhanced search query for better results
    const searchQuery = `${merchantName} business type category India merchant store`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=5`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000), // 8 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`Google Custom Search API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const items = data.items || [];

    if (items.length === 0) {
      return null;
    }

    // Extract category from search results with better analysis
    // Combine all text from snippets, titles, and links
    const allText = items.map((item: any) => 
      [
        item.snippet || '',
        item.title || '',
        item.displayLink || '',
        item.link || ''
      ].join(' ').toLowerCase()
    ).join(' ');

    // Enhanced category keywords with more variations
    const categoryKeywords: Record<string, { keywords: string[]; confidence: number }> = {
      'Groceries': { 
        keywords: ['grocery', 'supermarket', 'food store', 'retail', 'kirana', 'provision', 'vegetable', 'fruit'], 
        confidence: 0.85 
      },
      'Food & Dining': { 
        keywords: ['restaurant', 'cafe', 'food', 'dining', 'eatery', 'hotel', 'dhaba', 'tiffin', 'catering'], 
        confidence: 0.85 
      },
      'Shopping': { 
        keywords: ['shop', 'store', 'retail', 'mall', 'outlet', 'boutique', 'showroom', 'market'], 
        confidence: 0.80 
      },
      'Healthcare': { 
        keywords: ['pharmacy', 'medical', 'hospital', 'clinic', 'health', 'medicine', 'doctor', 'diagnostic'], 
        confidence: 0.85 
      },
      'Transportation': { 
        keywords: ['fuel', 'petrol', 'gas station', 'transport', 'taxi', 'auto', 'uber', 'ola'], 
        confidence: 0.80 
      },
      'Entertainment': { 
        keywords: ['cinema', 'movie', 'theater', 'entertainment', 'multiplex', 'amusement'], 
        confidence: 0.80 
      },
      'Utilities': { 
        keywords: ['utility', 'bill', 'service', 'provider', 'recharge', 'mobile', 'internet', 'electricity'], 
        confidence: 0.80 
      },
      'Education': { 
        keywords: ['school', 'college', 'education', 'institute', 'university', 'tuition', 'coaching'], 
        confidence: 0.85 
      },
      'Insurance': { 
        keywords: ['insurance', 'premium', 'policy', 'lic', 'health insurance'], 
        confidence: 0.85 
      },
      'Investment': { 
        keywords: ['investment', 'financial', 'mutual fund', 'stock', 'trading', 'broker'], 
        confidence: 0.80 
      },
      'Family': {
        keywords: ['family', 'relative', 'personal', 'friend'],
        confidence: 0.75
      },
    };

    // Find best matching category with highest confidence
    let bestMatch: { category: string; confidence: number } | null = null;
    
    for (const [category, config] of Object.entries(categoryKeywords)) {
      const keywordMatches = config.keywords.filter(keyword => allText.includes(keyword));
      if (keywordMatches.length > 0) {
        // More keyword matches = higher confidence
        const matchScore = Math.min(1.0, config.confidence + (keywordMatches.length * 0.05));
        if (!bestMatch || matchScore > bestMatch.confidence) {
          bestMatch = { category, confidence: matchScore };
        }
      }
    }

    if (bestMatch) {
      return {
        categoryName: bestMatch.category,
        categoryId: null,
        confidence: Math.min(0.95, bestMatch.confidence),
        source: 'google_search',
      };
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

  // 3. Fallback to Gemini (if enabled and quota not exceeded)
  if (!result && MERCHANT_LOOKUP_CONFIG.FALLBACK_TO_GEMINI && genAI) {
    // Check if Gemini quota is exceeded (skip to avoid wasted API calls)
    const { isGeminiQuotaExceeded } = await import('./gemini');
    if (isGeminiQuotaExceeded()) {
      console.log(`⏭️ Skipping Gemini merchant lookup for "${storeName}" - quota exceeded`);
      return null;
    }
    
    try {
      result = await lookupWithGemini(storeName);
      if (result && result.categoryName && result.confidence >= MERCHANT_LOOKUP_CONFIG.CONFIDENCE_THRESHOLD) {
        incrementMerchantLookupUsage(userId);
        await saveToCache(storeName, normalizedName, result);
        return result;
      }
    } catch (error) {
      // Check if quota was exceeded during the call
      const { isGeminiQuotaExceeded: checkQuota } = await import('./gemini');
      if (checkQuota()) {
        console.log(`⏭️ Gemini quota exceeded during lookup for "${storeName}"`);
      } else {
        console.error('Gemini lookup failed:', error);
      }
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

