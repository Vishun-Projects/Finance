import { prisma } from './db';

export interface ShopCategoryPattern {
  shopName: string;
  categoryId: string;
  categoryName: string;
  frequency: number;
  confidence: number; // 0-1, based on frequency / total transactions for this shop
  totalTransactions: number;
  patternType: 'store' | 'upi' | 'person'; // Pattern type for better categorization
}

export interface CategorizationSuggestion {
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  source: 'pattern' | 'ai' | 'rule';
}

// Confidence thresholds for different pattern types
// Lower thresholds allow more patterns to be learned, confidence will be used for prioritization
const CONFIDENCE_THRESHOLDS = {
  STORE: 0.5,   // Store patterns are most reliable (lower threshold = learn more patterns)
  UPI: 0.5,     // UPI patterns are reliable (lower threshold = learn more patterns)
  PERSON: 0.6,  // PersonName patterns (lower threshold = learn more patterns, confidence will prioritize)
} as const;

/**
 * Learn patterns from existing transactions
 * Separates store, UPI, and personName patterns for better categorization
 * Returns separate pattern maps with type prefixes
 */
export interface PatternMaps {
  storePatterns: Map<string, ShopCategoryPattern>;
  upiPatterns: Map<string, ShopCategoryPattern>;
  personPatterns: Map<string, ShopCategoryPattern>;
}

export async function learnShopCategoryPatterns(
  userId: string
): Promise<PatternMaps> {
  try {
    // Load patterns in parallel for better performance
    const [storePatterns, upiPatterns, personPatterns] = await Promise.all([
      learnStorePatterns(userId, CONFIDENCE_THRESHOLDS.STORE),
      learnUPIPatterns(userId, CONFIDENCE_THRESHOLDS.UPI),
      learnPersonPatterns(userId, CONFIDENCE_THRESHOLDS.PERSON),
    ]);

    return {
      storePatterns,
      upiPatterns,
      personPatterns,
    };
  } catch (error) {
    console.error('Error learning shop category patterns:', error);
    return {
      storePatterns: new Map(),
      upiPatterns: new Map(),
      personPatterns: new Map(),
    };
  }
}

/**
 * Learn store-based patterns (HIGHEST PRIORITY)
 */
async function learnStorePatterns(
  userId: string,
  minConfidence: number
): Promise<Map<string, ShopCategoryPattern>> {
  try {
    const patterns = await (prisma as any).$queryRaw`
      SELECT 
        t.store as shopName,
        t.categoryId,
        c.name as categoryName,
        COUNT(*) as frequency
      FROM transactions t
      LEFT JOIN categories c ON t.categoryId = c.id
      WHERE t.userId = ${userId}
        AND t.store IS NOT NULL
        AND t.store != ''
        AND t.categoryId IS NOT NULL
        AND t.isDeleted = false
      GROUP BY t.store, t.categoryId, c.name
      ORDER BY shopName, frequency DESC
    `;

    const patternMap = new Map<string, ShopCategoryPattern>();
    const storeTotals = new Map<string, number>();

    // Get totals for all stores
    if (patterns.length > 0) {
      const totalsQuery = await (prisma as any).$queryRaw`
        SELECT 
          LOWER(TRIM(t.store)) as shopName,
          COUNT(*) as totalCount
        FROM transactions t
        WHERE t.userId = ${userId}
          AND t.store IS NOT NULL
          AND t.store != ''
          AND t.isDeleted = false
        GROUP BY LOWER(TRIM(t.store))
      `;

      for (const row of totalsQuery as any[]) {
        const shopName = String(row.shopName || '').trim().toLowerCase();
        if (shopName) {
          storeTotals.set(shopName, Number(row.totalCount) || 0);
        }
      }
    }

    // Calculate confidence and build pattern map
    for (const pattern of patterns as any[]) {
      const shopName = String(pattern.shopName || '').trim();
      if (!shopName) continue;

      const normalizedShopName = shopName.toLowerCase();
      const totalCount = storeTotals.get(normalizedShopName) || 0;
      const frequency = Number(pattern.frequency);
      
      // Confidence based on:
      // 1. Frequency ratio (how many times this category was used for this store)
      // 2. Absolute frequency (more transactions = higher confidence)
      // Formula: (frequency/totalCount) + log10(frequency+1)/10
      // This gives higher confidence for more repeated transactions
      const frequencyRatio = totalCount > 0 ? frequency / totalCount : 0;
      const frequencyBonus = Math.min(0.3, Math.log10(frequency + 1) / 10); // Max 0.3 bonus
      const confidence = Math.min(1.0, frequencyRatio + frequencyBonus);

      if (confidence < minConfidence) continue;

      const existing = patternMap.get(normalizedShopName);
      if (!existing || confidence > existing.confidence) {
        patternMap.set(normalizedShopName, {
          shopName: shopName,
          categoryId: String(pattern.categoryId),
          categoryName: String(pattern.categoryName || ''),
          frequency,
          confidence,
          totalTransactions: totalCount,
          patternType: 'store',
        });
      }
    }

    return patternMap;
  } catch (error) {
    console.error('Error learning store patterns:', error);
    return new Map();
  }
}

/**
 * Learn UPI-based patterns (HIGH PRIORITY)
 */
async function learnUPIPatterns(
  userId: string,
  minConfidence: number
): Promise<Map<string, ShopCategoryPattern>> {
  try {
    const patterns = await (prisma as any).$queryRaw`
      SELECT 
        t.upiId as shopName,
        t.categoryId,
        c.name as categoryName,
        COUNT(*) as frequency
      FROM transactions t
      LEFT JOIN categories c ON t.categoryId = c.id
      WHERE t.userId = ${userId}
        AND t.upiId IS NOT NULL
        AND t.upiId != ''
        AND t.categoryId IS NOT NULL
        AND t.isDeleted = false
      GROUP BY t.upiId, t.categoryId, c.name
      ORDER BY shopName, frequency DESC
    `;

    const patternMap = new Map<string, ShopCategoryPattern>();
    const upiTotals = new Map<string, number>();

    // Get totals for all UPI IDs
    if (patterns.length > 0) {
      const totalsQuery = await (prisma as any).$queryRaw`
        SELECT 
          LOWER(TRIM(t.upiId)) as shopName,
          COUNT(*) as totalCount
        FROM transactions t
        WHERE t.userId = ${userId}
          AND t.upiId IS NOT NULL
          AND t.upiId != ''
          AND t.isDeleted = false
        GROUP BY LOWER(TRIM(t.upiId))
      `;

      for (const row of totalsQuery as any[]) {
        const shopName = String(row.shopName || '').trim().toLowerCase();
        if (shopName) {
          upiTotals.set(shopName, Number(row.totalCount) || 0);
        }
      }
    }

    // Calculate confidence and build pattern map
    for (const pattern of patterns as any[]) {
      const shopName = String(pattern.shopName || '').trim();
      if (!shopName) continue;

      const normalizedShopName = shopName.toLowerCase();
      const totalCount = upiTotals.get(normalizedShopName) || 0;
      const frequency = Number(pattern.frequency);
      
      // Confidence based on:
      // 1. Frequency ratio (how many times this category was used for this UPI)
      // 2. Absolute frequency (more transactions = higher confidence)
      // Formula: (frequency/totalCount) * (1 + log10(frequency+1)/10)
      // This gives higher confidence for more repeated transactions
      const frequencyRatio = totalCount > 0 ? frequency / totalCount : 0;
      const frequencyBonus = Math.min(0.3, Math.log10(frequency + 1) / 10); // Max 0.3 bonus
      const confidence = Math.min(1.0, frequencyRatio + frequencyBonus);

      if (confidence < minConfidence) continue;

      const existing = patternMap.get(normalizedShopName);
      if (!existing || confidence > existing.confidence) {
        patternMap.set(normalizedShopName, {
          shopName: shopName,
          categoryId: String(pattern.categoryId),
          categoryName: String(pattern.categoryName || ''),
          frequency,
          confidence,
          totalTransactions: totalCount,
          patternType: 'upi',
        });
      }
    }

    return patternMap;
  } catch (error) {
    console.error('Error learning UPI patterns:', error);
    return new Map();
  }
}

/**
 * Learn personName-based patterns (IMPROVED - works even when store exists if confidence is high)
 * Confidence increases with more repeated transactions
 */
async function learnPersonPatterns(
  userId: string,
  minConfidence: number
): Promise<Map<string, ShopCategoryPattern>> {
  try {
    // Learn from ALL personName transactions (not just when store is NULL)
    // This allows person patterns to work even when store exists
    const patterns = await (prisma as any).$queryRaw`
      SELECT 
        t.personName as shopName,
        t.categoryId,
        c.name as categoryName,
        COUNT(*) as frequency
      FROM transactions t
      LEFT JOIN categories c ON t.categoryId = c.id
      WHERE t.userId = ${userId}
        AND t.personName IS NOT NULL
        AND t.personName != ''
        AND t.categoryId IS NOT NULL
        AND t.isDeleted = false
      GROUP BY t.personName, t.categoryId, c.name
      ORDER BY shopName, frequency DESC
    `;

    const patternMap = new Map<string, ShopCategoryPattern>();
    const personTotals = new Map<string, number>();

    // Get totals for all personNames (from ALL transactions, not just when store is NULL)
    // This allows person patterns to work even when store exists
    if (patterns.length > 0) {
      const totalsQuery = await (prisma as any).$queryRaw`
        SELECT 
          LOWER(TRIM(t.personName)) as shopName,
          COUNT(*) as totalCount
        FROM transactions t
        WHERE t.userId = ${userId}
          AND t.personName IS NOT NULL
          AND t.personName != ''
          AND t.isDeleted = false
        GROUP BY LOWER(TRIM(t.personName))
      `;

      for (const row of totalsQuery as any[]) {
        const shopName = String(row.shopName || '').trim().toLowerCase();
        if (shopName) {
          personTotals.set(shopName, Number(row.totalCount) || 0);
        }
      }
    }

    // Calculate confidence and build pattern map
    for (const pattern of patterns as any[]) {
      const shopName = String(pattern.shopName || '').trim();
      if (!shopName) continue;

      const normalizedShopName = shopName.toLowerCase();
      const totalCount = personTotals.get(normalizedShopName) || 0;
      const frequency = Number(pattern.frequency);
      
      // Confidence based on:
      // 1. Frequency ratio (how many times this category was used for this person)
      // 2. Absolute frequency (more transactions = higher confidence)
      // Formula: (frequency/totalCount) * (1 + log10(frequency+1)/10)
      // This gives higher confidence for more repeated transactions
      const frequencyRatio = totalCount > 0 ? frequency / totalCount : 0;
      const frequencyBonus = Math.min(0.3, Math.log10(frequency + 1) / 10); // Max 0.3 bonus
      const confidence = Math.min(1.0, frequencyRatio + frequencyBonus);

      if (confidence < minConfidence) continue;

      const existing = patternMap.get(normalizedShopName);
      if (!existing || confidence > existing.confidence) {
        patternMap.set(normalizedShopName, {
          shopName: shopName,
          categoryId: String(pattern.categoryId),
          categoryName: String(pattern.categoryName || ''),
          frequency,
          confidence,
          totalTransactions: totalCount,
          patternType: 'person',
        });
      }
    }

    return patternMap;
  } catch (error) {
    console.error('Error learning person patterns:', error);
    return new Map();
  }
}

/**
 * Load patterns for a user (cached, called once per batch)
 * Returns separate pattern maps with type prefixes for proper priority handling
 */
export interface LoadedPatterns {
  storePatterns: Map<string, CategorizationSuggestion>;
  upiPatterns: Map<string, CategorizationSuggestion>;
  personPatterns: Map<string, CategorizationSuggestion>;
}

export async function loadPatternsForUser(
  userId: string
): Promise<LoadedPatterns> {
  try {
    const patternMaps = await learnShopCategoryPatterns(userId);
    
    // Convert to CategorizationSuggestion maps with type prefixes
    const storePatterns = new Map<string, CategorizationSuggestion>();
    const upiPatterns = new Map<string, CategorizationSuggestion>();
    const personPatterns = new Map<string, CategorizationSuggestion>();
    
    // Store patterns with prefix
    for (const [shopName, pattern] of patternMaps.storePatterns.entries()) {
      if (pattern.confidence >= CONFIDENCE_THRESHOLDS.STORE) {
        storePatterns.set(`store:${shopName}`, {
          categoryId: pattern.categoryId,
          categoryName: pattern.categoryName,
          confidence: pattern.confidence,
          source: 'pattern',
        });
        // Also add without prefix for backward compatibility
        storePatterns.set(shopName, {
          categoryId: pattern.categoryId,
          categoryName: pattern.categoryName,
          confidence: pattern.confidence,
          source: 'pattern',
        });
      }
    }
    
    // UPI patterns with prefix
    for (const [upiId, pattern] of patternMaps.upiPatterns.entries()) {
      if (pattern.confidence >= CONFIDENCE_THRESHOLDS.UPI) {
        upiPatterns.set(`upi:${upiId}`, {
          categoryId: pattern.categoryId,
          categoryName: pattern.categoryName,
          confidence: pattern.confidence,
          source: 'pattern',
        });
        // Also add without prefix for backward compatibility
        upiPatterns.set(upiId, {
          categoryId: pattern.categoryId,
          categoryName: pattern.categoryName,
          confidence: pattern.confidence,
          source: 'pattern',
        });
      }
    }
    
    // PersonName patterns with prefix (only when store is NULL)
    for (const [personName, pattern] of patternMaps.personPatterns.entries()) {
      if (pattern.confidence >= CONFIDENCE_THRESHOLDS.PERSON) {
        personPatterns.set(`person:${personName}`, {
          categoryId: pattern.categoryId,
          categoryName: pattern.categoryName,
          confidence: pattern.confidence,
          source: 'pattern',
        });
        // Also add without prefix for backward compatibility
        personPatterns.set(personName, {
          categoryId: pattern.categoryId,
          categoryName: pattern.categoryName,
          confidence: pattern.confidence,
          source: 'pattern',
        });
      }
    }
    
    return {
      storePatterns,
      upiPatterns,
      personPatterns,
    };
  } catch (error) {
    console.error('Error loading patterns:', error);
    return {
      storePatterns: new Map(),
      upiPatterns: new Map(),
      personPatterns: new Map(),
    };
  }
}

/**
 * Get category suggestion for a transaction based on learned patterns (DEPRECATED - use loadPatternsForUser)
 */
export async function getCategorySuggestionFromPatterns(
  userId: string,
  store: string | null | undefined
): Promise<CategorizationSuggestion | null> {
  if (!store || !store.trim()) {
    return null;
  }

  try {
    const patterns = await learnShopCategoryPatterns(userId);
    const normalizedStore = store.trim().toLowerCase();

    // Try exact match first in store patterns
    let pattern = patterns.storePatterns.get(normalizedStore);

    // Try partial match if exact match not found
    if (!pattern) {
      for (const [shopName, p] of patterns.storePatterns.entries()) {
        if (
          normalizedStore.includes(shopName) ||
          shopName.includes(normalizedStore)
        ) {
          pattern = p;
          break;
        }
      }
    }

    if (pattern && pattern.confidence >= 0.5) {
      return {
        categoryId: pattern.categoryId,
        categoryName: pattern.categoryName,
        confidence: pattern.confidence,
        source: 'pattern',
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting category suggestion from patterns:', error);
    return null;
  }
}

/**
 * Get all patterns for a user (for debugging/admin)
 */
export async function getAllPatterns(
  userId: string
): Promise<ShopCategoryPattern[]> {
  const patternMaps = await learnShopCategoryPatterns(userId);
  const allPatterns = [
    ...Array.from(patternMaps.storePatterns.values()),
    ...Array.from(patternMaps.upiPatterns.values()),
    ...Array.from(patternMaps.personPatterns.values()),
  ];
  return allPatterns.sort((a, b) => b.confidence - a.confidence);
}

