import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './db';
import { loadPatternsForUser, type CategorizationSuggestion, type LoadedPatterns } from './transaction-pattern-service';
import { retryWithBackoff } from './gemini';
import { lookupMerchantCategory } from './merchant-lookup-service';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Frequency ranges for auto-pay detection
const FREQUENCY_RANGES = {
  DAILY: { min: 1, max: 3 },
  WEEKLY: { min: 5, max: 12 },
  MONTHLY: { min: 25, max: 35 },
} as const;

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  AUTO_PAY: 0.8,
  PATTERN: 0.5,
  COMMODITY: 0.95,
} as const;

// AI usage configuration
const AI_USAGE_CONFIG = {
  MIN_BATCH_SIZE: 5,
  MAX_BATCH_SIZE: 50,
  MIN_UNCATEGORIZED_PERCENT: 0.2, // 20% uncategorized
  MIN_UNCATEGORIZED_COUNT: 5,
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  DEDUPLICATION_THRESHOLD: 0.85,
  MAX_DAILY_AI_CALLS: 100,
  MAX_DAILY_MERCHANT_LOOKUPS: 50,
} as const;

// Merchant lookup configuration
const MERCHANT_LOOKUP_CONFIG = {
  ENABLED: process.env.ENABLE_MERCHANT_LOOKUP !== 'false',
  MIN_STORE_NAME_LENGTH: 3,
  CACHE_TTL: 365 * 24 * 60 * 60 * 1000, // 1 year (permanent)
  CONFIDENCE_THRESHOLD: 0.8,
  USE_GOOGLE_SEARCH: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY !== undefined,
  FALLBACK_TO_GEMINI: true,
} as const;

export interface TransactionToCategorize {
  description: string;
  store?: string | null;
  commodity?: string | null;
  amount: number;
  date: string;
  financialCategory: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER';
  personName?: string | null;
  upiId?: string | null;
  accountHolderName?: string | null; // For family detection
}

export interface CategorizationResult {
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  source: 'pattern' | 'ai' | 'rule';
  reasoning?: string;
}

/**
 * Get available categories for a user (includes both user-specific and default categories)
 */
async function getUserCategories(
  userId: string,
  type: 'INCOME' | 'EXPENSE'
): Promise<Array<{ id: string; name: string }>> {
  try {
    const categories = await (prisma as any).category.findMany({
      where: {
        type: type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        OR: [
          { userId }, // User-specific categories
          { isDefault: true, userId: null }, // Default categories available to all users
        ],
      },
      select: {
        id: true,
        name: true,
      },
    });
    return categories;
  } catch (error) {
    console.error('Error fetching user categories:', error);
    return [];
  }
}

/**
 * Categorize a batch of transactions using AI
 */
export async function categorizeTransactionsWithAI(
  userId: string,
  transactions: TransactionToCategorize[],
  existingPatterns?: string // JSON string of existing patterns for context
): Promise<CategorizationResult[]> {
  if (transactions.length === 0) {
    return [];
  }

  try {
    // Get user's categories (including default categories)
    const expenseCategories = await getUserCategories(userId, 'EXPENSE');
    const incomeCategories = await getUserCategories(userId, 'INCOME');
    
    // Check if we have any categories at all
    if (expenseCategories.length === 0 && incomeCategories.length === 0) {
      console.warn(`⚠️ No categories found for user ${userId}. Cannot perform AI categorization.`);
      console.warn('Please ensure default categories are seeded in the database.');
      // Return rule-based categorization as fallback
      return transactions.map((t) => categorizeWithRules(t));
    }

    // Build context from transactions (include all relevant fields)
    const transactionContext = transactions
      .map(
        (t, idx) => {
          const parts = [`${idx + 1}. ${t.date}: ₹${t.amount.toFixed(2)} - ${t.description}`];
          if (t.store) parts.push(`Store: ${t.store}`);
          if (t.commodity) parts.push(`Item: ${t.commodity}`); // Commodity is MOST IMPORTANT
          if ((t as any).personName) parts.push(`Person: ${(t as any).personName}`);
          if ((t as any).upiId) parts.push(`UPI: ${(t as any).upiId}`);
          return parts.join(' | ');
        }
      )
      .join('\n');

    // Get categories for the transaction type
    const categoriesForType =
      transactions[0].financialCategory === 'INCOME'
        ? incomeCategories
        : expenseCategories;
    
    // If no categories for this type, fall back to rule-based
    if (categoriesForType.length === 0) {
      console.warn(`⚠️ No ${transactions[0].financialCategory} categories found for user ${userId}. Using rule-based categorization.`);
      return transactions.map((t) => categorizeWithRules(t));
    }
    
    const availableCategories = categoriesForType.map((c) => c.name).join(', ');
    console.log(`📋 Available ${transactions[0].financialCategory} categories (${categoriesForType.length}): ${availableCategories.substring(0, 150)}...`);

    const prompt = `You are a financial transaction categorization assistant. Analyze the following transactions and suggest the most appropriate category for each.

Available Categories: ${availableCategories}

Transactions to categorize:
${transactionContext}

${existingPatterns ? `\nExisting patterns (learn from these):\n${existingPatterns}` : ''}

IMPORTANT PRIORITY ORDER (MUST FOLLOW THIS ORDER):
1. **COMMODITY (HIGHEST PRIORITY)**: 
   - If commodity says "milk", it's ALWAYS Groceries, never Transportation. Commodity field is the most reliable indicator.
   - "milk", "doodh" → "Groceries" (NOT Transportation!)
   - "soft drinks", "vada", "gulab jamun", "sev puri", "biryani", "dosa", "idli" → "Food & Dining"
   - "hara masala", "masala", "atta", "rice", "dal", "vegetable", "fruit" → "Groceries"
   - Medicine, pharmacy items → "Healthcare"
   - Commodity takes precedence over store/personName patterns

2. **STORE (HIGH PRIORITY)**:
   - Store name is more reliable than personName for categorization
   - "RANGVEL FOOD KIOSK", "KRISHNA CAFE UDUPI", cafes, restaurants → "Food & Dining"
   - "NARSINGH LALSINGH GUPTA", grocery stores, supermarkets → "Groceries"
   - "swiggy", "zomato" → "Food & Dining"
   - "meesho", "flipkart", "amazon" → "Shopping"
   - "jio", "vi", "airtel", "vodafone" → "Utilities" (recharges)
   - Pharmacies, medical stores → "Healthcare"
   - Fuel stations, "uber", "ola" → "Transportation"

3. **FAMILY DETECTION (HIGH PRIORITY)**: 
   - If personName shares the same surname (last name) as account holder → "Family" (NOT Utilities!)
   - Example: Account holder "VISHNU VISHWAKARMA", transaction to "AMARAWAT IDEVI MUNSHEELAL VISHW" → "Family" (both have "VISHW" surname)
   - Family detection takes precedence over other personName patterns

4. **PERSONNAME (LOW PRIORITY - only if store is NULL)**:
   - Only use personName if:
     - Store is NULL/empty
     - PersonName shares surname with account holder → "Family"
   - Otherwise, personName should NOT override commodity/store patterns
   - If a person/vendor is already categorized in your database, use that same category (but only when store is NULL)

5. **UPI ID patterns**:
   - Same UPI ID monthly → Likely recurring payment/subscription
   - UPI patterns are reliable for categorization

6. **Recurring patterns and subscriptions**:
   - Similar amounts monthly (>= ₹10,000) → Likely salary (if credit) or recurring bill (if debit)
   - "spotify", "netflix", "prime", "hotstar", "zee5", "sonyliv", "youtube premium", "disney" → "Entertainment" (subscriptions)
   - "emi", "loan", "installment", "repayment" → Likely loan/EMI payment
   - Fixed amounts monthly (same merchant, same amount) → Recurring subscription or bill

EXAMPLES OF CORRECT CATEGORIZATION:
- Transaction: Store="Narsingh Lalsingh Gupta", Commodity="milk" → "Groceries" (based on commodity, NOT personName)
- Transaction: Store="Rangvel Food Kiosk", Commodity="dosa" → "Food & Dining" (based on store + commodity)
- Transaction: PersonName="Amarawati Devi Munsheelal Vishw" (same surname) → "Family" (NOT Utilities)
- Transaction: Store="Narsingh Lalsingh Gupta", PersonName="Narsingh Lalsingh Gupta", Commodity="milk" → "Groceries" (commodity takes precedence)
- Transaction: Amount=₹100, Description="Jio recharge" → "Utilities" (round number + recharge keyword)
- Transaction: UPI="spotify@paytm" → "Entertainment" (subscription in UPI)
- Transaction: Description="NEFT credit", Amount=₹50000 → "Salary" (bank transfer + large amount)
- Transaction: Description="Cashback received" → "Income" (cashback keyword)
- Transaction: Description="Late fee charged" → "Fees & Charges" (penalty keyword)

EDGE CASES:
- Very small amounts (< ₹10) without clear indicators → "Miscellaneous" (low confidence)
- Round numbers (100, 200, 500, 1000) with recharge/bill keywords → "Utilities"
- Large amounts (> ₹50,000) with investment keywords → "Investment"
- Large amounts (> ₹50,000) with EMI/loan keywords → "Housing"
- Future dates → Data error, use lower confidence
- Missing/partial data → Use available fields only

AUTO-PAY DETECTION (for context, not categorization):
- Daily shop visits (same store, different days) → NOT auto-pay, just expenses
- Monthly subscriptions (Spotify, Netflix, same amount monthly) → Auto-pay
- EMI payments (same amount monthly, EMI keywords) → Auto-pay
- Daily milk purchase → NOT auto-pay, just recurring expense

IMPORTANT RULES:
- If commodity says "milk", it's ALWAYS Groceries, never Transportation. Commodity field is the most reliable indicator.
- If personName shares surname with account holder, it's ALWAYS Family, not Utilities.
- Store takes precedence over personName for categorization.
- PersonName should only be used when store is NULL or for family detection.
- Salary is only for amounts >= ₹10,000 (not ₹20-30).

IMPORTANT: You MUST use EXACT category names from the available categories list. Match the category name exactly as shown.

Return a JSON array with one object per transaction in the same order, each with:
{
  "index": number (1-based, matching transaction order),
  "categoryName": string (EXACT match from available categories - must be one of: ${availableCategories.split(', ').slice(0, 10).join(', ')}...),
  "confidence": number (0-1, how confident you are),
  "reasoning": string (brief explanation)
}

Example response:
[
  {"index": 1, "categoryName": "Food & Dining", "confidence": 0.95, "reasoning": "RANGVEL FOOD KIOSK with soft drinks indicates food purchase"},
  {"index": 2, "categoryName": "Groceries", "confidence": 0.85, "reasoning": "NARSINGH LALSINGH GUPTA with hara masala suggests grocery shopping"}
]

Return ONLY the JSON array, no other text.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent categorization
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
    });

    const result = await retryWithBackoff(async () => {
      const response = await model.generateContent(prompt);
      return response.response.text();
    });

    // Parse JSON response
    let aiResults: Array<{
      index: number;
      categoryName: string | null;
      confidence: number;
      reasoning?: string;
    }> = [];

    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        aiResults = JSON.parse(jsonMatch[0]);
      } else {
        aiResults = JSON.parse(result);
      }
    } catch (parseError) {
      console.error('Error parsing AI categorization response:', parseError);
      console.error('Raw response:', result);
      // Fall back to rule-based categorization
      return transactions.map((t) => categorizeWithRules(t));
    }

    // Map AI results to transactions
    const results: CategorizationResult[] = transactions.map((t, idx) => {
      const aiResult = aiResults.find((r) => r.index === idx + 1);
      if (aiResult && aiResult.categoryName) {
        const suggestedCategoryName = aiResult.categoryName.trim();
        if (suggestedCategoryName) {
          // Find category ID
          const allCategories = [
            ...expenseCategories,
            ...incomeCategories,
          ];
          const category = allCategories.find(
            (c) =>
              c.name.toLowerCase().trim() ===
              suggestedCategoryName.toLowerCase()
          );

          if (category) {
            return {
              categoryId: category.id,
              categoryName: category.name,
              confidence: Math.min(1, Math.max(0, aiResult.confidence || 0.5)),
              source: 'ai',
              reasoning: aiResult.reasoning,
            };
          } else {
            console.warn(`⚠️ AI suggested category "${suggestedCategoryName}" but it doesn't match any available categories`);
          }
        }
      }

      // Fallback to rule-based
      return categorizeWithRules(t);
    });

    return results;
  } catch (error) {
    console.error('Error in AI categorization:', error);
    // Fall back to rule-based categorization
    return transactions.map((t) => categorizeWithRules(t));
  }
}

/**
 * Extract surname from full name
 */
function extractSurname(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    // Usually last name is the surname
    return parts[parts.length - 1].toLowerCase();
  }
  return null;
}

/**
 * Clean and normalize text for pattern matching
 */
function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[^\w\s]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .toLowerCase();
}

/**
 * Categorize by amount-based heuristics
 */
function categorizeByAmount(
  transaction: TransactionToCategorize
): CategorizationResult | null {
  if (transaction.financialCategory !== 'EXPENSE') {
    return null;
  }

  const amount = transaction.amount;
  const text = cleanText(
    (transaction.description || '') + ' ' + (transaction.store || '')
  );

  // Very small amounts (< ₹10) - likely misc/rounding
  if (amount < 10 && !transaction.commodity && !transaction.store) {
    return {
      categoryId: null,
      categoryName: 'Miscellaneous',
      confidence: 0.6,
      source: 'rule',
      reasoning: 'Very small amount without clear indicators',
    };
  }

  // Round numbers - likely recharges/bills
  const roundNumbers = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
  if (roundNumbers.includes(amount)) {
    if (
      text.includes('recharge') ||
      text.includes('prepaid') ||
      text.includes('postpaid') ||
      text.includes('bill')
    ) {
      return {
        categoryId: null,
        categoryName: 'Utilities',
        confidence: 0.85,
        source: 'rule',
        reasoning: `Round amount (₹${amount}) with recharge/bill keywords`,
      };
    }
  }

  // Very large amounts (> ₹50,000) - likely investments, loans, or major purchases
  if (amount > 50000) {
    if (
      text.includes('mutual fund') ||
      text.includes('sip') ||
      text.includes('equity') ||
      text.includes('investment')
    ) {
      return {
        categoryId: null,
        categoryName: 'Investment',
        confidence: 0.85,
        source: 'rule',
        reasoning: `Large amount (₹${amount}) with investment keywords`,
      };
    }
    if (
      text.includes('emi') ||
      text.includes('loan') ||
      text.includes('installment')
    ) {
      return {
        categoryId: null,
        categoryName: 'Housing',
        confidence: 0.8,
        source: 'rule',
        reasoning: `Large amount (₹${amount}) with loan/EMI keywords`,
      };
    }
  }

  return null;
}

/**
 * Categorize by UPI ID patterns
 */
function categorizeByUPI(
  transaction: TransactionToCategorize
): CategorizationResult | null {
  if (!transaction.upiId) {
    return null;
  }

  const upiLower = transaction.upiId.toLowerCase();
  const text = cleanText(transaction.description || '');

  // Subscription services in UPI
  if (
    upiLower.includes('spotify') ||
    upiLower.includes('netflix') ||
    upiLower.includes('prime') ||
    upiLower.includes('hotstar') ||
    upiLower.includes('zee5') ||
    upiLower.includes('sonyliv') ||
    upiLower.includes('youtube premium') ||
    upiLower.includes('disney')
  ) {
    return {
      categoryId: null,
      categoryName: 'Entertainment',
      confidence: 0.9,
      source: 'rule',
      reasoning: `Subscription service detected in UPI: ${transaction.upiId}`,
    };
  }

  // Payment apps - check description for actual merchant
  if (
    upiLower.includes('paytm') ||
    upiLower.includes('phonepe') ||
    upiLower.includes('gpay') ||
    upiLower.includes('bhim')
  ) {
    if (text.includes('recharge') || text.includes('bill')) {
      return {
        categoryId: null,
        categoryName: 'Utilities',
        confidence: 0.8,
        source: 'rule',
        reasoning: 'Payment app with recharge/bill in description',
      };
    }
  }

  return null;
}

/**
 * Categorize by transaction type keywords
 */
function categorizeByTransactionType(
  transaction: TransactionToCategorize
): CategorizationResult | null {
  const text = cleanText(
    (transaction.description || '') +
      ' ' +
      (transaction.store || '') +
      ' ' +
      (transaction.commodity || '')
  );

  // Cashback/rewards
  if (
    text.includes('cashback') ||
    text.includes('reward') ||
    text.includes('cash back') ||
    text.includes('bonus')
  ) {
    return {
      categoryId: null,
      categoryName: 'Income',
      confidence: 0.9,
      source: 'rule',
      reasoning: 'Cashback/reward detected',
    };
  }

  // Penalty/fine/late fee
  if (
    text.includes('penalty') ||
    text.includes('fine') ||
    text.includes('late fee') ||
    text.includes('late charge') ||
    text.includes('overdue')
  ) {
    return {
      categoryId: null,
      categoryName: 'Fees & Charges',
      confidence: 0.9,
      source: 'rule',
      reasoning: 'Penalty/fine detected',
    };
  }

  // Refund/reversal
  if (
    text.includes('refund') ||
    text.includes('reversal') ||
    text.includes('reversed') ||
    text.includes('credit back')
  ) {
    return {
      categoryId: null,
      categoryName: 'Refund',
      confidence: 0.9,
      source: 'rule',
      reasoning: 'Refund/reversal detected',
    };
  }

  // EMI/loan/installment
  if (
    (text.includes('emi') ||
      text.includes('loan') ||
      text.includes('installment') ||
      text.includes('repayment')) &&
    transaction.amount >= 5000
  ) {
    return {
      categoryId: null,
      categoryName: 'Housing',
      confidence: 0.85,
      source: 'rule',
      reasoning: 'EMI/loan detected with significant amount',
    };
  }

  return null;
}

/**
 * Categorize by bank transfer patterns
 */
function categorizeByBankTransfer(
  transaction: TransactionToCategorize
): CategorizationResult | null {
  if (transaction.financialCategory !== 'INCOME') {
    return null;
  }

  const descUpper = (transaction.description || '').toUpperCase();
  const amount = transaction.amount;

  // NEFT/RTGS/IMPS patterns
  if (descUpper.includes('NEFT') || descUpper.includes('RTGS') || descUpper.includes('IMPS')) {
    if (amount >= 10000) {
      return {
        categoryId: null,
        categoryName: 'Salary',
        confidence: 0.85,
        source: 'rule',
        reasoning: `Bank transfer (${descUpper.includes('NEFT') ? 'NEFT' : descUpper.includes('RTGS') ? 'RTGS' : 'IMPS'}) with large amount`,
      };
    }
    return {
      categoryId: null,
      categoryName: 'Transfer',
      confidence: 0.75,
      source: 'rule',
      reasoning: 'Bank transfer detected',
    };
  }

  // UPI refunds
  if (descUpper.includes('REFUND') || descUpper.includes('REVERSAL')) {
    return {
      categoryId: null,
      categoryName: 'Refund',
      confidence: 0.9,
      source: 'rule',
      reasoning: 'Refund/reversal detected',
    };
  }

  // Auto-debit
  if (descUpper.includes('AUTO DEBIT') || descUpper.includes('AUTO-DEBIT')) {
    const text = cleanText(transaction.description || '');
    if (
      text.includes('emi') ||
      text.includes('loan') ||
      text.includes('subscription')
    ) {
      return {
        categoryId: null,
        categoryName: text.includes('emi') || text.includes('loan') ? 'Housing' : 'Entertainment',
        confidence: 0.8,
        source: 'rule',
        reasoning: 'Auto-debit with subscription/EMI keywords',
      };
    }
  }

  return null;
}

/**
 * Check commodity-based categorization (HIGHEST PRIORITY)
 * Commodity is the most reliable indicator of transaction category
 */
function categorizeByCommodity(
  transaction: TransactionToCategorize
): CategorizationResult | null {
  if (!transaction.commodity) {
    return null;
  }

  const commodity = transaction.commodity.toLowerCase().trim();
  
  // Only check for EXPENSE transactions
  if (transaction.financialCategory !== 'EXPENSE') {
    return null;
  }

  // GROCERIES - Highest priority for commodity-based
  if (
    commodity.includes('milk') ||
    commodity.includes('doodh') ||
    commodity.includes('masala') ||
    commodity.includes('hara masala') ||
    commodity.includes('bread') ||
    commodity.includes('roti') ||
    commodity.includes('atta') ||
    commodity.includes('rice') ||
    commodity.includes('dal') ||
    commodity.includes('grocery') ||
    commodity.includes('vegetable') ||
    commodity.includes('sabzi') ||
    commodity.includes('fruit') ||
    commodity.includes('phal')
  ) {
    return {
      categoryId: null,
      categoryName: 'Groceries',
      confidence: CONFIDENCE_THRESHOLDS.COMMODITY,
      source: 'rule',
      reasoning: `Commodity "${transaction.commodity}" indicates groceries`,
    };
  }

  // FOOD & DINING
  if (
    commodity.includes('vada') ||
    commodity.includes('dosa') ||
    commodity.includes('idli') ||
    commodity.includes('biryani') ||
    commodity.includes('pizza') ||
    commodity.includes('burger') ||
    commodity.includes('soft drink') ||
    commodity.includes('cold drink') ||
    commodity.includes('gulab jamun') ||
    commodity.includes('sev puri') ||
    commodity.includes('puri') ||
    commodity.includes('samosa') ||
    commodity.includes('tea') ||
    commodity.includes('coffee')
  ) {
    return {
      categoryId: null,
      categoryName: 'Food & Dining',
      confidence: CONFIDENCE_THRESHOLDS.COMMODITY,
      source: 'rule',
      reasoning: `Commodity "${transaction.commodity}" indicates food & dining`,
    };
  }

  // HEALTHCARE
  if (
    commodity.includes('medicine') ||
    commodity.includes('dawa') ||
    commodity.includes('pharmacy') ||
    commodity.includes('tablet') ||
    commodity.includes('syrup') ||
    commodity.includes('injection')
  ) {
    return {
      categoryId: null,
      categoryName: 'Healthcare',
      confidence: CONFIDENCE_THRESHOLDS.COMMODITY,
      source: 'rule',
      reasoning: `Commodity "${transaction.commodity}" indicates healthcare`,
    };
  }

  return null;
}

/**
 * Rule-based categorization with comprehensive Indian merchant patterns
 * Enhanced with edge case handling
 */
function categorizeWithRules(
  transaction: TransactionToCategorize
): CategorizationResult {
  // Check edge cases first (before general patterns)
  
  // 1. Amount-based heuristics
  const amountResult = categorizeByAmount(transaction);
  if (amountResult) return amountResult;
  
  // 2. UPI patterns
  const upiResult = categorizeByUPI(transaction);
  if (upiResult) return upiResult;
  
  // 3. Transaction type keywords
  const typeResult = categorizeByTransactionType(transaction);
  if (typeResult) return typeResult;
  
  // 4. Bank transfer patterns
  const transferResult = categorizeByBankTransfer(transaction);
  if (transferResult) return transferResult;
  
  // 5. Date validation (future dates - data error)
  const transactionDate = new Date(transaction.date);
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < -1) {
    // Future date - likely data error, but still categorize with lower confidence
    console.warn(`⚠️ Future date detected: ${transaction.date} (${daysDiff} days ahead)`);
  }
  
  // 6. Partial/missing data handling
  const store = transaction.store?.trim() || '';
  if (store && (store.length < 3 || /^\d+$/.test(store))) {
    // Very short store name or only numbers - likely transaction ID, skip pattern matching
  }
  
  const text = cleanText(
    (transaction.description || '') +
    ' ' +
    (transaction.store || '') +
    ' ' +
    (transaction.commodity || '')
  );
  
  // FAMILY DETECTION (high priority) - Check if personName shares surname with account holder
  if (transaction.personName && transaction.accountHolderName) {
    const personSurname = extractSurname(transaction.personName);
    const accountSurname = extractSurname(transaction.accountHolderName);
    
    if (personSurname && accountSurname && personSurname === accountSurname) {
      // Same surname = family member (not Utilities!)
      return {
        categoryId: null,
        categoryName: 'Family',
        confidence: 0.95, // Very high confidence for family detection
        source: 'rule',
      };
    }
  }

  // EXPENSE CATEGORIES
  if (transaction.financialCategory === 'EXPENSE') {
    // GROCERIES - Store/description patterns (only if commodity doesn't match)
    if (
      text.includes('grocery') ||
      text.includes('masala') ||
      text.includes('hara masala') ||
      text.includes('milk') ||
      text.includes('doodh') ||
      text.includes('bread') ||
      text.includes('roti') ||
      text.includes('atta') ||
      text.includes('rice') ||
      text.includes('dal') ||
      text.includes('supermarket') ||
      text.includes('big bazaar') ||
      text.includes('dmart') ||
      text.includes('reliance fresh') ||
      text.includes('more') ||
      text.includes('spencer')
    ) {
      return {
        categoryId: null,
        categoryName: 'Groceries',
        confidence: 0.9,
        source: 'rule',
      };
    }
    
    // Groceries - Store/description patterns (only if commodity doesn't match)
    if (
      text.includes('grocery') ||
      text.includes('masala') ||
      text.includes('hara masala') ||
      text.includes('milk') ||
      text.includes('doodh') ||
      text.includes('bread') ||
      text.includes('roti') ||
      text.includes('atta') ||
      text.includes('rice') ||
      text.includes('dal') ||
      text.includes('supermarket') ||
      text.includes('big bazaar') ||
      text.includes('dmart') ||
      text.includes('reliance fresh') ||
      text.includes('more') ||
      text.includes('spencer')
    ) {
      return {
        categoryId: null,
        categoryName: 'Groceries',
        confidence: 0.9,
        source: 'rule',
      };
    }
    
    // Food & Dining - Indian merchants (only if not groceries)
    if (
      text.includes('swiggy') ||
      text.includes('zomato') ||
      text.includes('food') ||
      text.includes('restaurant') ||
      text.includes('cafe') ||
      text.includes('kiosk') ||
      text.includes('udupi') ||
      text.includes('dosa') ||
      text.includes('idli') ||
      text.includes('vada') ||
      text.includes('puri') ||
      text.includes('samosa') ||
      text.includes('gulab jamun') ||
      text.includes('sev puri') ||
      text.includes('biryani') ||
      text.includes('pizza') ||
      text.includes('burger') ||
      text.includes('soft drink') ||
      text.includes('cold drink')
    ) {
      return {
        categoryId: null,
        categoryName: 'Food & Dining',
        confidence: 0.9,
        source: 'rule',
      };
    }
    
    // Shopping - Indian e-commerce
    if (
      text.includes('meesho') ||
      text.includes('flipkart') ||
      text.includes('amazon') ||
      text.includes('myntra') ||
      text.includes('nykaa') ||
      text.includes('ajio') ||
      text.includes('snapdeal') ||
      text.includes('shopclues') ||
      text.includes('paytm mall')
    ) {
      return {
        categoryId: null,
        categoryName: 'Shopping',
        confidence: 0.95,
        source: 'rule',
      };
    }
    
    // Recharges & Bills - Telecom & Utilities
    if (
      text.includes('jio') ||
      text.includes('vi ') ||
      text.includes('vodafone') ||
      text.includes('idea') ||
      text.includes('airtel') ||
      text.includes('bsnl') ||
      text.includes('recharge') ||
      text.includes('prepaid') ||
      text.includes('postpaid') ||
      text.includes('electricity') ||
      text.includes('bills') ||
      text.includes('gas') ||
      text.includes('water bill') ||
      text.includes('internet') ||
      text.includes('broadband')
    ) {
      return {
        categoryId: null,
        categoryName: 'Utilities',
        confidence: 0.9,
        source: 'rule',
      };
    }
    
    // Transportation
    if (
      text.includes('uber') ||
      text.includes('ola') ||
      text.includes('rapido') ||
      text.includes('fuel') ||
      text.includes('petrol') ||
      text.includes('diesel') ||
      text.includes('bpcl') ||
      text.includes('hpcl') ||
      text.includes('ioc') ||
      text.includes('transport') ||
      text.includes('metro') ||
      text.includes('bus') ||
      text.includes('train') ||
      text.includes('irctc')
    ) {
      return {
        categoryId: null,
        categoryName: 'Transportation',
        confidence: 0.9,
        source: 'rule',
      };
    }
    
    // Healthcare
    if (
      text.includes('pharmacy') ||
      text.includes('medical') ||
      text.includes('hospital') ||
      text.includes('clinic') ||
      text.includes('apollo') ||
      text.includes('fortis') ||
      text.includes('max') ||
      text.includes('health') ||
      text.includes('medicine') ||
      text.includes('dawa')
    ) {
      return {
        categoryId: null,
        categoryName: 'Healthcare',
        confidence: 0.9,
        source: 'rule',
      };
    }
    
    // Entertainment
    if (
      text.includes('netflix') ||
      text.includes('prime') ||
      text.includes('hotstar') ||
      text.includes('zee5') ||
      text.includes('sonyliv') ||
      text.includes('spotify') ||
      text.includes('youtube') ||
      text.includes('cinema') ||
      text.includes('movie') ||
      text.includes('theater')
    ) {
      return {
        categoryId: null,
        categoryName: 'Entertainment',
        confidence: 0.9,
        source: 'rule',
      };
    }
    
    // Investment
    if (
      text.includes('mutual fund') ||
      text.includes('sip') ||
      text.includes('equity') ||
      text.includes('stock') ||
      text.includes('nse') ||
      text.includes('bse') ||
      text.includes('investment') ||
      text.includes('portfolio') ||
      text.includes('demat')
    ) {
      return {
        categoryId: null,
        categoryName: 'Investment',
        confidence: 0.9,
        source: 'rule',
      };
    }
    
    // Education
    if (
      text.includes('school') ||
      text.includes('college') ||
      text.includes('tuition') ||
      text.includes('education') ||
      text.includes('course') ||
      text.includes('training') ||
      text.includes('university') ||
      text.includes('institute')
    ) {
      return {
        categoryId: null,
        categoryName: 'Education',
        confidence: 0.85,
        source: 'rule',
      };
    }
    
    // Insurance
    if (
      text.includes('insurance') ||
      text.includes('premium') ||
      text.includes('lic') ||
      text.includes('policy') ||
      text.includes('life insurance') ||
      text.includes('health insurance')
    ) {
      return {
        categoryId: null,
        categoryName: 'Insurance',
        confidence: 0.9,
        source: 'rule',
      };
    }
    
    // Rent/EMI (already handled in categorizeByTransactionType, but add here for store-based)
    if (
      (text.includes('rent') || text.includes('emi') || text.includes('loan')) &&
      transaction.amount >= 5000
    ) {
      return {
        categoryId: null,
        categoryName: 'Housing',
        confidence: 0.85,
        source: 'rule',
      };
    }
  }
  
  // INCOME CATEGORIES
  if (transaction.financialCategory === 'INCOME') {
    const amount = transaction.amount;
    const description = (transaction.description || '').toUpperCase();
    
    // Check for bank transfer keywords (NEFT, RTGS, IMPS, TRANSFER FROM)
    const isBankTransfer = description.includes('NEFT') || 
                          description.includes('RTGS') || 
                          description.includes('IMPS') ||
                          (description.includes('TRANSFER FROM') && !description.includes('UPI'));
    
    // Salary patterns - only if amount is significant (>= ₹10,000) and usually bank transfer
    // Small amounts (₹20-30) are NOT salary
    if (amount >= 10000) {
      // Explicit salary keywords
      if (
        text.includes('salary') ||
        text.includes('payroll') ||
        text.includes('wage') ||
        text.includes('credit salary') ||
        text.includes('salary credit')
      ) {
        return {
          categoryId: null,
          categoryName: 'Salary',
          confidence: 0.95,
          source: 'rule',
        };
      }
      
      // Large bank transfers (NEFT/RTGS/IMPS) >= ₹10,000 are likely salary
      // Especially if they're recurring similar amounts
      if (isBankTransfer) {
        return {
          categoryId: null,
          categoryName: 'Salary',
          confidence: amount >= 15000 ? 0.9 : 0.75, // Higher confidence for larger amounts
          source: 'rule',
        };
      }
      
      // Large credit without UPI/merchant indicators - likely salary
      if (!text.includes('upi') && !text.includes('@') && !text.includes('merchant') && amount >= 15000) {
        return {
          categoryId: null,
          categoryName: 'Salary',
          confidence: 0.7,
          source: 'rule',
        };
      }
    }
  }

  return {
    categoryId: null,
    categoryName: null,
    confidence: 0,
    source: 'rule',
  };
}

// Cache for pattern learning (avoid re-querying for same user)
const patternCache = new Map<string, { patterns: LoadedPatterns, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// AI result cache (similarity-based)
const aiResultCache = new Map<string, {
  result: CategorizationResult;
  timestamp: number;
  hitCount: number;
}>();

// AI usage tracker (rate limiting)
const aiUsageTracker = new Map<string, {
  count: number;
  resetTime: number;
}>();

// Merchant lookup usage tracker
/**
 * Calculate similarity between two transactions (0-1 score)
 */
function calculateSimilarity(
  t1: TransactionToCategorize,
  t2: TransactionToCategorize
): number {
  let score = 0;
  let maxScore = 0;

  // Description similarity (40% weight)
  if (t1.description && t2.description) {
    const desc1 = cleanText(t1.description);
    const desc2 = cleanText(t2.description);
    if (desc1 === desc2) {
      score += 0.4;
    } else if (desc1.includes(desc2) || desc2.includes(desc1)) {
      score += 0.2;
    }
    maxScore += 0.4;
  }

  // Store similarity (30% weight)
  if (t1.store && t2.store) {
    const store1 = cleanText(t1.store);
    const store2 = cleanText(t2.store);
    if (store1 === store2) {
      score += 0.3;
    }
    maxScore += 0.3;
  }

  // Amount similarity (20% weight) - within 5% tolerance
  const amountDiff = Math.abs(t1.amount - t2.amount) / Math.max(t1.amount, t2.amount);
  if (amountDiff <= 0.05) {
    score += 0.2;
  }
  maxScore += 0.2;

  // UPI/PersonName similarity (10% weight)
  if (t1.upiId && t2.upiId && t1.upiId === t2.upiId) {
    score += 0.1;
  } else if (
    t1.personName &&
    t2.personName &&
    cleanText(t1.personName) === cleanText(t2.personName)
  ) {
    score += 0.1;
  }
  maxScore += 0.1;

  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Get cached AI result for similar transaction
 */
function getCachedAIResult(
  transaction: TransactionToCategorize
): CategorizationResult | null {
  const now = Date.now();

  for (const [key, cached] of aiResultCache.entries()) {
    if (now - cached.timestamp > AI_USAGE_CONFIG.CACHE_TTL) {
      aiResultCache.delete(key);
      continue;
    }

    try {
      const cachedTxn = JSON.parse(key) as TransactionToCategorize;
      const similarity = calculateSimilarity(transaction, cachedTxn);

      if (similarity >= AI_USAGE_CONFIG.DEDUPLICATION_THRESHOLD) {
        cached.hitCount++;
        return cached.result;
      }
    } catch {
      // Invalid cache entry, remove it
      aiResultCache.delete(key);
    }
  }

  return null;
}

/**
 * Cache AI result for future similar transactions
 */
function cacheAIResult(
  transaction: TransactionToCategorize,
  result: CategorizationResult
): void {
  const key = JSON.stringify(transaction);
  aiResultCache.set(key, {
    result,
    timestamp: Date.now(),
    hitCount: 0,
  });

  // Limit cache size (keep most recent 1000 entries)
  if (aiResultCache.size > 1000) {
    const entries = Array.from(aiResultCache.entries());
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    aiResultCache.clear();
    entries.slice(0, 1000).forEach(([k, v]) => aiResultCache.set(k, v));
  }
}

/**
 * Check AI quota for user
 */
function checkAIQuota(userId: string): boolean {
  const now = Date.now();
  const usage = aiUsageTracker.get(userId);

  if (!usage || now > usage.resetTime) {
    // Reset daily
    aiUsageTracker.set(userId, {
      count: 0,
      resetTime: now + (24 * 60 * 60 * 1000),
    });
    return true;
  }

  return usage.count < AI_USAGE_CONFIG.MAX_DAILY_AI_CALLS;
}

/**
 * Increment AI usage counter
 */
function incrementAIUsage(userId: string): void {
  const usage = aiUsageTracker.get(userId);
  if (usage) {
    usage.count++;
  }
}


/**
 * Deduplicate similar transactions before sending to AI
 */
function deduplicateTransactions(
  transactions: TransactionToCategorize[]
): {
  unique: TransactionToCategorize[];
  duplicates: Map<number, number>; // original index -> unique index
} {
  const unique: TransactionToCategorize[] = [];
  const duplicates = new Map<number, number>();
  const seen = new Set<string>();

  for (let i = 0; i < transactions.length; i++) {
    const txn = transactions[i];
    const key = `${cleanText(txn.description)}_${cleanText(txn.store || '')}_${Math.round(txn.amount / 10) * 10}`;

    if (seen.has(key)) {
      // Find the unique transaction index
      const uniqueIdx = unique.findIndex(
        (u) =>
          cleanText(u.description) === cleanText(txn.description) &&
          cleanText(u.store || '') === cleanText(txn.store || '') &&
          Math.abs(u.amount - txn.amount) < 1
      );
      if (uniqueIdx >= 0) {
        duplicates.set(i, uniqueIdx);
      }
    } else {
      seen.add(key);
      unique.push(txn);
      duplicates.set(i, unique.length - 1);
    }
  }

  return { unique, duplicates };
}

/**
 * Detect recurring patterns (salary, monthly bills, subscriptions)
 */
async function detectRecurringPatterns(
  userId: string,
  transactions: TransactionToCategorize[]
): Promise<Array<{ transactionIndex: number; categoryId: string | null; categoryName: string; confidence: number }>> {
  const results: Array<{ transactionIndex: number; categoryId: string | null; categoryName: string; confidence: number }> = [];
  
  try {
    // Get existing income transactions to detect salary patterns
    // Only consider transactions >= ₹10,000 (salary is usually significant amounts)
    const existingIncome = await (prisma as any).transaction.findMany({
      where: {
        userId,
        financialCategory: 'INCOME',
        isDeleted: false,
        categoryId: { not: null },
        OR: [
          { creditAmount: { gte: 10000 } },
          { debitAmount: { gte: 10000 } },
        ],
      },
      select: {
        creditAmount: true,
        debitAmount: true,
        transactionDate: true,
        categoryId: true,
        category: {
          select: { name: true, id: true },
        },
      },
      orderBy: { transactionDate: 'desc' },
      take: 50, // Last 50 income transactions
    });

    // Group by similar amounts (within 10% tolerance) - likely salary or recurring bills
    const amountGroups = new Map<string, Array<{ amount: number; categoryId: string; categoryName: string; date: Date }>>();
    for (const txn of existingIncome) {
      const amount = Number(txn.creditAmount || 0);
      if (amount > 0) {
        // Group by rounded amount (to nearest 100 for better matching)
        const rounded = Math.round(amount / 100) * 100;
        const key = `${rounded}`;
        if (!amountGroups.has(key)) {
          amountGroups.set(key, []);
        }
        if (txn.categoryId && txn.category) {
          amountGroups.get(key)!.push({
            amount,
            categoryId: txn.categoryId,
            categoryName: txn.category.name,
            date: new Date(txn.transactionDate),
          });
        }
      }
    }

    // Check if new transactions match recurring salary patterns
    // ONLY for amounts >= ₹10,000 (salary is significant, not ₹20-30)
    for (let idx = 0; idx < transactions.length; idx++) {
      const txn = transactions[idx];
      if (txn.financialCategory === 'INCOME' && txn.amount >= 10000) {
        const amount = txn.amount;
        const rounded = Math.round(amount / 100) * 100;
        const key = `${rounded}`;
        const similarGroup = amountGroups.get(key);
        
        if (similarGroup && similarGroup.length >= 2) {
          // Check if amounts are within 10% tolerance (for salary increases)
          const matchingItems = similarGroup.filter(item => {
            const diff = Math.abs(item.amount - amount);
            const tolerance = Math.max(item.amount, amount) * 0.1; // 10% tolerance
            return diff <= tolerance;
          });
          
          if (matchingItems.length >= 2) {
            // Found recurring pattern - use most common category
            const categoryCounts = new Map<string, number>();
            for (const item of matchingItems) {
              categoryCounts.set(item.categoryId, (categoryCounts.get(item.categoryId) || 0) + 1);
            }
            
            let maxCount = 0;
            let mostCommonCategory: { categoryId: string; categoryName: string } | null = null;
            for (const [catId, count] of categoryCounts.entries()) {
              if (count > maxCount) {
                maxCount = count;
                const item = matchingItems.find(i => i.categoryId === catId);
                if (item) {
                  mostCommonCategory = { categoryId: item.categoryId, categoryName: item.categoryName };
                }
              }
            }
            
            if (mostCommonCategory && maxCount >= 2) {
              results.push({
                transactionIndex: idx,
                categoryId: mostCommonCategory.categoryId,
                categoryName: mostCommonCategory.categoryName,
                confidence: 0.95, // Very high confidence for recurring patterns
              });
            }
          }
        }
      }
    }
    
    // Batch query for recurring expenses (FAST - one query for all)
    const expenseAmounts = transactions
      .filter(t => t.financialCategory === 'EXPENSE')
      .map(t => t.amount);
    
    if (expenseAmounts.length > 0) {
      const minAmount = Math.min(...expenseAmounts) * 0.9;
      const maxAmount = Math.max(...expenseAmounts) * 1.1;
      
      const existingExpenses = await (prisma as any).transaction.findMany({
        where: {
          userId,
          financialCategory: 'EXPENSE',
          isDeleted: false,
          categoryId: { not: null },
          OR: [
            { creditAmount: { gte: minAmount, lte: maxAmount } },
            { debitAmount: { gte: minAmount, lte: maxAmount } },
          ],
        },
        select: {
          creditAmount: true,
          debitAmount: true,
          categoryId: true,
          category: {
            select: { name: true, id: true },
          },
        },
        take: 100, // Get more for better pattern matching
      });
      
      // Build amount -> category map for fast lookup
      const expensePatternMap = new Map<string, Array<{ categoryId: string; categoryName: string }>>();
      for (const exp of existingExpenses) {
        const amount = Number(exp.creditAmount || exp.debitAmount || 0);
        if (amount > 0 && exp.categoryId && exp.category) {
          const rounded = Math.round(amount / 100) * 100;
          const key = `${rounded}`;
          if (!expensePatternMap.has(key)) {
            expensePatternMap.set(key, []);
          }
          expensePatternMap.get(key)!.push({
            categoryId: exp.categoryId,
            categoryName: exp.category.name,
          });
        }
      }
      
      // Check if new expense transactions match recurring patterns
      for (let idx = 0; idx < transactions.length; idx++) {
        const txn = transactions[idx];
        if (txn.financialCategory === 'EXPENSE') {
          const amount = txn.amount;
          const rounded = Math.round(amount / 100) * 100;
          const key = `${rounded}`;
          const similarGroup = expensePatternMap.get(key);
          
          if (similarGroup && similarGroup.length >= 2) {
            // Check if amounts are within 10% tolerance
            const matchingItems = similarGroup.filter(item => {
              // Find the amount for this category from existing expenses
              const matchingExp = existingExpenses.find((e: any) => {
                const expAmount = Number(e.creditAmount || e.debitAmount || 0);
                const roundedExp = Math.round(expAmount / 100) * 100;
                return roundedExp === rounded && e.categoryId === item.categoryId;
              });
              if (!matchingExp) return false;
              
              const expAmount = Number(matchingExp.creditAmount || matchingExp.debitAmount || 0);
              const diff = Math.abs(expAmount - amount);
              const tolerance = Math.max(expAmount, amount) * 0.1;
              return diff <= tolerance;
            });
            
            if (matchingItems.length >= 2) {
              // Found recurring pattern
              const categoryCounts = new Map<string, number>();
              for (const item of matchingItems) {
                categoryCounts.set(item.categoryId, (categoryCounts.get(item.categoryId) || 0) + 1);
              }
              
              let maxCount = 0;
              let mostCommonCategory: { categoryId: string; categoryName: string } | null = null;
              for (const [catId, count] of categoryCounts.entries()) {
                if (count > maxCount) {
                  maxCount = count;
                  const item = matchingItems.find(i => i.categoryId === catId);
                  if (item) {
                    mostCommonCategory = { categoryId: item.categoryId, categoryName: item.categoryName };
                  }
                }
              }
              
              if (mostCommonCategory && maxCount >= 2) {
                results.push({
                  transactionIndex: idx,
                  categoryId: mostCommonCategory.categoryId,
                  categoryName: mostCommonCategory.categoryName,
                  confidence: 0.85,
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error detecting recurring patterns:', error);
  }
  
  return results;
}

/**
 * Detect auto-pay transactions (EMI, subscriptions, recurring bills)
 * Returns patterns with confidence >= 0.8 and at least 2-3 occurrences
 */
export interface AutoPayPattern {
  title: string;
  amount: number;
  frequency: 'MONTHLY' | 'WEEKLY' | 'DAILY';
  confidence: number;
  categoryId: string | null;
  categoryName: string | null;
  merchantIdentifier: string; // store, upiId, or personName
  lastTransactionDate: Date;
  occurrenceCount: number;
}

export async function detectAutoPayTransactions(
  userId: string,
  transactions: Array<{
    description: string;
    store?: string | null;
    upiId?: string | null;
    personName?: string | null;
    amount: number;
    date: string;
    financialCategory: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER';
    categoryId?: string | null;
    categoryName?: string | null;
  }>
): Promise<AutoPayPattern[]> {
  const patterns: AutoPayPattern[] = [];
  
  try {
    // Only analyze EXPENSE transactions (auto-pay is typically expenses)
    const expenses = transactions.filter(t => t.financialCategory === 'EXPENSE');
    
    if (expenses.length === 0) {
      return patterns;
    }
    
    // Get existing transactions from database to detect patterns
    const existingExpenses = await (prisma as any).transaction.findMany({
      where: {
        userId,
        financialCategory: 'EXPENSE',
        isDeleted: false,
      },
      select: {
        description: true,
        store: true,
        upiId: true,
        personName: true,
        debitAmount: true,
        creditAmount: true,
        transactionDate: true,
        categoryId: true,
        category: {
          select: { name: true, id: true },
        },
      },
      orderBy: { transactionDate: 'desc' },
      take: 500, // Get last 500 expenses for pattern detection
    });
    
    // Combine new and existing transactions for pattern analysis
    const allTransactions = [
      ...expenses.map(t => ({
        description: t.description,
        store: t.store || null,
        upiId: t.upiId || null,
        personName: t.personName || null,
        amount: t.amount,
        date: new Date(t.date),
        categoryId: t.categoryId || null,
        categoryName: t.categoryName || null,
      })),
      ...existingExpenses.map((e: any) => ({
        description: e.description,
        store: e.store || null,
        upiId: e.upiId || null,
        personName: e.personName || null,
        amount: Number(e.debitAmount || e.creditAmount || 0),
        date: new Date(e.transactionDate),
        categoryId: e.categoryId || null,
        categoryName: e.category?.name || null,
      })),
    ];
    
    // Group transactions by merchant identifier (store > upiId > personName > description)
    const merchantGroups = new Map<string, Array<{
      amount: number;
      date: Date;
      categoryId: string | null;
      categoryName: string | null;
      description: string;
    }>>();
    
    for (const txn of allTransactions) {
      // Determine merchant identifier (prefer store, then upiId, then personName, then description)
      let merchantId = '';
      if (txn.store) {
        merchantId = `store:${txn.store.toLowerCase().trim()}`;
      } else if (txn.upiId) {
        merchantId = `upi:${txn.upiId.toLowerCase().trim()}`;
      } else if (txn.personName) {
        merchantId = `person:${txn.personName.toLowerCase().trim()}`;
      } else {
        // Use description for EMI/loan keywords
        const descLower = txn.description.toLowerCase();
        if (descLower.includes('emi') || descLower.includes('loan') || descLower.includes('installment')) {
          merchantId = `desc:${txn.description.substring(0, 50).toLowerCase().trim()}`;
        } else {
          continue; // Skip if no reliable identifier
        }
      }
      
      if (!merchantGroups.has(merchantId)) {
        merchantGroups.set(merchantId, []);
      }
      merchantGroups.get(merchantId)!.push({
        amount: txn.amount,
        date: txn.date,
        categoryId: txn.categoryId,
        categoryName: txn.categoryName,
        description: txn.description,
      });
    }
    
    // Helper function to check for subscription/EMI keywords
    const hasSubscriptionKeywords = (description: string): boolean => {
      const descLower = description.toLowerCase();
      const subscriptionKeywords = ['spotify', 'netflix', 'prime', 'hotstar', 'zee5', 'sonyliv', 'youtube premium', 'disney', 'subscription'];
      return subscriptionKeywords.some(keyword => descLower.includes(keyword));
    };
    
    const hasEMIKeywords = (description: string): boolean => {
      const descLower = description.toLowerCase();
      const emiKeywords = ['emi', 'loan', 'installment', 'repayment', 'equated'];
      return emiKeywords.some(keyword => descLower.includes(keyword));
    };
    
    // Helper function to calculate average days between transactions
    const calculateAverageDaysDiff = (txns: Array<{
      amount: number;
      date: Date;
      categoryId: string | null;
      categoryName: string | null;
      description: string;
    }>): number | null => {
      if (txns.length < 2) return null;
      const sorted = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime());
      let totalDays = 0;
      let count = 0;
      for (let i = 1; i < sorted.length; i++) {
        const daysDiff = (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
        totalDays += daysDiff;
        count++;
      }
      return count > 0 ? totalDays / count : null;
    };
    
    // Analyze each merchant group for recurring patterns
    for (const [merchantId, txns] of merchantGroups.entries()) {
      if (txns.length < 2) continue; // Need at least 2 transactions
      
      // Skip personName groups unless subscription/EMI keywords are present
      if (merchantId.startsWith('person:')) {
        const hasSubscription = txns.some(t => hasSubscriptionKeywords(t.description));
        const hasEMI = txns.some(t => hasEMIKeywords(t.description));
        if (!hasSubscription && !hasEMI) {
          // Skip daily personName transactions (not auto-pay)
          continue;
        }
      }
      
      // Group by amount (within 5% tolerance)
      const amountGroups = new Map<string, typeof txns>();
      for (const txn of txns) {
        const rounded = Math.round(txn.amount / 10) * 10; // Round to nearest 10
        const key = `${rounded}`;
        if (!amountGroups.has(key)) {
          amountGroups.set(key, []);
        }
        amountGroups.get(key)!.push(txn);
      }
      
      // Check each amount group for monthly recurrence
      for (const [, amountTxns] of amountGroups.entries()) {
        if (amountTxns.length < 2) continue; // Need at least 2 occurrences
        
        // Sort by date
        amountTxns.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Calculate average amount
        const avgAmount = amountTxns.reduce((sum, t) => sum + t.amount, 0) / amountTxns.length;
        
        // Calculate average days between transactions
        const avgDaysDiff = calculateAverageDaysDiff(amountTxns);
        if (!avgDaysDiff) continue;
        
        // Exclude daily patterns (1-3 days apart)
        if (avgDaysDiff >= FREQUENCY_RANGES.DAILY.min && avgDaysDiff <= FREQUENCY_RANGES.DAILY.max) {
          continue; // Daily pattern - NOT auto-pay, just recurring expense
        }
        
        // Exclude weekly patterns (5-12 days apart)
        if (avgDaysDiff >= FREQUENCY_RANGES.WEEKLY.min && avgDaysDiff <= FREQUENCY_RANGES.WEEKLY.max) {
          continue; // Weekly pattern - NOT auto-pay, just recurring expense
        }
        
        // Only consider monthly patterns (25-35 days apart)
        if (avgDaysDiff < FREQUENCY_RANGES.MONTHLY.min || avgDaysDiff > FREQUENCY_RANGES.MONTHLY.max) {
          continue; // Not monthly - skip
        }
        
        // Check for monthly pattern matches
        let monthlyMatches = 0;
        let totalDaysDiff = 0;
        let matchCount = 0;
        
        for (let i = 1; i < amountTxns.length; i++) {
          const daysDiff = (amountTxns[i].date.getTime() - amountTxns[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
          // Monthly transactions are typically 25-35 days apart
          if (daysDiff >= FREQUENCY_RANGES.MONTHLY.min && daysDiff <= FREQUENCY_RANGES.MONTHLY.max) {
            monthlyMatches++;
            totalDaysDiff += daysDiff;
            matchCount++;
          }
        }
        
        // Calculate confidence based on pattern strength
        let confidence = 0;
        if (monthlyMatches >= 2 && matchCount > 0) {
          const calculatedAvgDays = totalDaysDiff / matchCount;
          // Higher confidence if more matches and closer to 30 days
          const dayAccuracy = 1 - Math.abs(calculatedAvgDays - 30) / 30;
          confidence = Math.min(0.95, 0.7 + (monthlyMatches / amountTxns.length) * 0.2 + dayAccuracy * 0.1);
        }
        
        // Check for subscription keywords (Spotify, Netflix, etc.)
        const firstTxn = amountTxns[0];
        const isSubscription = hasSubscriptionKeywords(firstTxn.description);
        
        // Check for EMI/loan keywords
        const isEMI = hasEMIKeywords(firstTxn.description);
        
        // Boost confidence for known subscription/EMI patterns
        if (isSubscription || isEMI) {
          confidence = Math.min(0.95, confidence + 0.15);
        }
        
        // Only return patterns with confidence >= 0.8 and monthly frequency
        if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_PAY && amountTxns.length >= 2) {
          // Determine merchant name for title
          let merchantName = '';
          if (merchantId.startsWith('store:')) {
            merchantName = merchantId.replace('store:', '');
          } else if (merchantId.startsWith('upi:')) {
            merchantName = merchantId.replace('upi:', '');
          } else if (merchantId.startsWith('person:')) {
            merchantName = merchantId.replace('person:', '');
          } else {
            merchantName = firstTxn.description.substring(0, 50);
          }
          
          // Get most common category
          const categoryCounts = new Map<string, { count: number; name: string }>();
          for (const txn of amountTxns) {
            if (txn.categoryId && txn.categoryName) {
              const existing = categoryCounts.get(txn.categoryId) || { count: 0, name: txn.categoryName };
              existing.count++;
              categoryCounts.set(txn.categoryId, existing);
            }
          }
          
          let mostCommonCategory: { id: string | null; name: string | null } = { id: null, name: null };
          let maxCount = 0;
          for (const [catId, data] of categoryCounts.entries()) {
            if (data.count > maxCount) {
              maxCount = data.count;
              mostCommonCategory = { id: catId, name: data.name };
            }
          }
          
          // Get last transaction date
          const lastTxn = amountTxns[amountTxns.length - 1];
          
          // Round amount to 2 decimal places to avoid precision issues
          const roundedAmount = Math.round(avgAmount * 100) / 100;
          
          patterns.push({
            title: merchantName,
            amount: roundedAmount,
            frequency: 'MONTHLY',
            confidence,
            categoryId: mostCommonCategory.id,
            categoryName: mostCommonCategory.name,
            merchantIdentifier: merchantId,
            lastTransactionDate: lastTxn.date,
            occurrenceCount: amountTxns.length,
          });
        }
      }
    }
    
    // Remove duplicates (same merchant + similar amount)
    const uniquePatterns: AutoPayPattern[] = [];
    const seen = new Set<string>();
    for (const pattern of patterns) {
      const key = `${pattern.merchantIdentifier}|${Math.round(pattern.amount / 10) * 10}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePatterns.push(pattern);
      }
    }
    
    return uniquePatterns;
  } catch (error) {
    console.error('Error detecting auto-pay transactions:', error);
    return [];
  }
}

/**
 * Categorize transactions with pattern learning and AI fallback (OPTIMIZED)
 * Priority order: 1) Commodity rules, 2) Family detection, 3) Store patterns, 4) UPI patterns, 5) PersonName patterns (only if no store), 6) Rule-based, 7) AI
 */
export async function categorizeTransactions(
  userId: string,
  transactions: TransactionToCategorize[]
): Promise<CategorizationResult[]> {
  const results: CategorizationResult[] = [];

  // Check cache first
  const cacheKey = userId;
  const cached = patternCache.get(cacheKey);
  const now = Date.now();
  let loadedPatterns: LoadedPatterns;
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    loadedPatterns = cached.patterns;
  } else {
    // Load patterns once for all transactions (FAST - parallel loading)
    loadedPatterns = await loadPatternsForUser(userId);
    patternCache.set(cacheKey, { patterns: loadedPatterns, timestamp: now });
  }

  // Detect recurring patterns (salary, monthly bills) BEFORE pattern matching
  const recurringPatterns = await detectRecurringPatterns(userId, transactions);
  
  // Pre-fetch categories for merchant lookup (to avoid repeated queries)
  let allCategoriesCache: Array<{ id: string; name: string }> | null = null;
  const getAllCategories = async () => {
    if (!allCategoriesCache) {
      const expenseCategories = await getUserCategories(userId, 'EXPENSE');
      const incomeCategories = await getUserCategories(userId, 'INCOME');
      allCategoriesCache = [...expenseCategories, ...incomeCategories];
    }
    return allCategoriesCache;
  };

  // Categorize each transaction in priority order
  for (let idx = 0; idx < transactions.length; idx++) {
    const transaction = transactions[idx];
    const store = transaction.store?.trim().toLowerCase() || '';
    const personName = (transaction as any).personName?.trim().toLowerCase() || '';
    const upiId = (transaction as any).upiId?.trim().toLowerCase() || '';
    
    // 1. COMMODITY-BASED RULES (HIGHEST PRIORITY)
    const commodityResult = categorizeByCommodity(transaction);
    if (commodityResult && commodityResult.categoryName) {
      results.push(commodityResult);
      continue; // Early return - commodity takes precedence
    }
    
    // 2. FAMILY DETECTION (HIGH PRIORITY)
    if (transaction.personName && transaction.accountHolderName) {
      const personSurname = extractSurname(transaction.personName);
      const accountSurname = extractSurname(transaction.accountHolderName);
      
      if (personSurname && accountSurname && personSurname === accountSurname) {
        results.push({
          categoryId: null,
          categoryName: 'Family',
          confidence: 0.95,
          source: 'rule',
          reasoning: 'PersonName shares surname with account holder',
        });
        continue; // Early return
      }
    }
    
    // 3. RECURRING PATTERNS (salary, monthly bills)
    const recurringMatch = recurringPatterns.find(p => 
      p.transactionIndex === idx && p.confidence >= 0.7
    );
    if (recurringMatch) {
      results.push({
        categoryId: recurringMatch.categoryId,
        categoryName: recurringMatch.categoryName,
        confidence: recurringMatch.confidence,
        source: 'pattern',
        reasoning: 'Recurring pattern match',
      });
      continue; // Early return
    }
    
    // 4. STORE-BASED PATTERNS (if store exists)
    let patternSuggestion: CategorizationSuggestion | null = null;
    if (store) {
      // Try with prefix first
      patternSuggestion = loadedPatterns.storePatterns.get(`store:${store}`) || 
                         loadedPatterns.storePatterns.get(store) || 
                         null;
    }
    
    // 5. MERCHANT LOOKUP (if store exists but no pattern found) - async but we handle it
    let merchantLookupResult: CategorizationResult | null = null;
    if (!patternSuggestion && store && transaction.store && transaction.store.trim().length >= MERCHANT_LOOKUP_CONFIG.MIN_STORE_NAME_LENGTH) {
      try {
        const merchantLookup = await lookupMerchantCategory(transaction.store, userId);
        if (merchantLookup && merchantLookup.categoryName && merchantLookup.confidence >= MERCHANT_LOOKUP_CONFIG.CONFIDENCE_THRESHOLD) {
          // Find category ID from category name
          const allCategories = await getAllCategories();
          const matchedCategory = allCategories.find(
            (c) => c.name.toLowerCase().trim() === merchantLookup.categoryName?.toLowerCase().trim()
          );
          
          if (matchedCategory) {
            merchantLookupResult = {
              categoryId: matchedCategory.id,
              categoryName: merchantLookup.categoryName,
              confidence: merchantLookup.confidence,
              source: 'pattern',
              reasoning: `Merchant lookup: ${merchantLookup.source}`,
            };
          } else if (merchantLookup.categoryName) {
            // Category name found but ID not matched - use name only
            merchantLookupResult = {
              categoryId: null,
              categoryName: merchantLookup.categoryName,
              confidence: merchantLookup.confidence,
              source: 'pattern',
              reasoning: `Merchant lookup: ${merchantLookup.source}`,
            };
          }
        }
      } catch (error) {
        console.error('Error in merchant lookup:', error);
        // Continue to next step
      }
    }
    
    if (merchantLookupResult) {
      results.push(merchantLookupResult);
      continue; // Early return
    }
    
    // 6. UPI-BASED PATTERNS (if UPI exists and no store pattern found)
    if (!patternSuggestion && upiId) {
      patternSuggestion = loadedPatterns.upiPatterns.get(`upi:${upiId}`) || 
                         loadedPatterns.upiPatterns.get(upiId) || 
                         null;
    }
    
    // 7. PERSONNAME PATTERNS (only if no store and no UPI pattern found)
    if (!patternSuggestion && personName && !store) {
      patternSuggestion = loadedPatterns.personPatterns.get(`person:${personName}`) || 
                         loadedPatterns.personPatterns.get(personName) || 
                         null;
    }

    if (patternSuggestion && patternSuggestion.confidence >= CONFIDENCE_THRESHOLDS.PATTERN) {
      results.push({
        categoryId: patternSuggestion.categoryId,
        categoryName: patternSuggestion.categoryName,
        confidence: patternSuggestion.confidence,
        source: 'pattern',
        reasoning: `Pattern match: ${store ? 'store' : upiId ? 'UPI' : 'personName'}`,
      });
    } else {
      // 8. RULE-BASED CATEGORIZATION (fallback)
      const ruleBased = categorizeWithRules(transaction);
      if (ruleBased.categoryName) {
        results.push(ruleBased);
      } else {
        // Will be filled by AI batch processing if needed
        results.push({
          categoryId: null,
          categoryName: null,
          confidence: 0,
          source: 'rule',
        });
      }
    }
  }

  // Batch process transactions that need AI categorization (with smart optimization)
  const needsAI = transactions.filter(
    (_, idx) => !results[idx].categoryId && !results[idx].categoryName
  );

  if (needsAI.length === 0) {
    return results;
  }

  // Check cache for each uncategorized transaction
  const uncachedAI: TransactionToCategorize[] = [];
  const cachedIndices = new Map<number, CategorizationResult>();

  for (let i = 0; i < needsAI.length; i++) {
    const originalIdx = transactions.findIndex(
      (t, idx) => !results[idx].categoryId && !results[idx].categoryName && t === needsAI[i]
    );

    if (originalIdx >= 0) {
      const cached = getCachedAIResult(needsAI[i]);
      if (cached) {
        cachedIndices.set(originalIdx, cached);
      } else {
        uncachedAI.push(needsAI[i]);
      }
    }
  }

  // Apply cached results
  for (const [idx, result] of cachedIndices.entries()) {
    results[idx] = result;
  }

  // Smart AI usage conditions
  const shouldUseAI =
    uncachedAI.length >= AI_USAGE_CONFIG.MIN_UNCATEGORIZED_COUNT &&
    uncachedAI.length >= transactions.length * AI_USAGE_CONFIG.MIN_UNCATEGORIZED_PERCENT &&
    uncachedAI.length >= AI_USAGE_CONFIG.MIN_BATCH_SIZE &&
    checkAIQuota(userId);

  if (!shouldUseAI) {
    // Apply rule-based fallback for remaining
    const needsAIIndices = transactions
      .map((_, idx) => idx)
      .filter((idx) => !results[idx].categoryId && !results[idx].categoryName);

    for (const idx of needsAIIndices) {
      if (!results[idx].categoryId && !results[idx].categoryName) {
        results[idx] = categorizeWithRules(transactions[idx]);
      }
    }
    return results;
  }

  // Deduplicate before sending to AI
  const { unique, duplicates } = deduplicateTransactions(uncachedAI);

  // Batch into chunks to avoid token limits
  const chunks: TransactionToCategorize[][] = [];
  for (let i = 0; i < unique.length; i += AI_USAGE_CONFIG.MAX_BATCH_SIZE) {
    chunks.push(unique.slice(i, i + AI_USAGE_CONFIG.MAX_BATCH_SIZE));
  }

  // Get existing patterns as context
  const patterns = await (prisma as any).$queryRaw`
    SELECT 
      t.store,
      c.name as categoryName,
      COUNT(*) as frequency
    FROM transactions t
    JOIN categories c ON t.categoryId = c.id
    WHERE t.userId = ${userId}
      AND t.store IS NOT NULL
      AND t.categoryId IS NOT NULL
      AND t.isDeleted = false
    GROUP BY t.store, c.name
    ORDER BY frequency DESC
    LIMIT 20
  `;
  const patternsStr = JSON.stringify(patterns, null, 2);

  // Process chunks sequentially with rate limiting
  const aiResults: CategorizationResult[] = [];

  for (const chunk of chunks) {
    if (!checkAIQuota(userId)) {
      console.warn(`⚠️ AI quota exceeded for user ${userId}. Using rule-based fallback.`);
      // Fallback to rules for remaining chunks
      chunk.forEach((txn) => {
        aiResults.push(categorizeWithRules(txn));
      });
      continue;
    }

    try {
      incrementAIUsage(userId);
      const chunkResults = await categorizeTransactionsWithAI(userId, chunk, patternsStr);

      // Cache results
      for (let i = 0; i < chunk.length; i++) {
        cacheAIResult(chunk[i], chunkResults[i]);
      }

      aiResults.push(...chunkResults);
    } catch (error) {
      console.error('AI categorization error for chunk:', error);
      // Fallback to rules for this chunk
      chunk.forEach((txn) => {
        aiResults.push(categorizeWithRules(txn));
      });
    }
  }

  // Map results back to original indices
  const needsAIIndices = transactions
    .map((_, idx) => idx)
    .filter((idx) => !results[idx].categoryId && !results[idx].categoryName);

  for (let i = 0; i < needsAIIndices.length; i++) {
    const originalIdx = needsAIIndices[i];
    const duplicateIdx = duplicates.get(i);
    const resultIdx = duplicateIdx !== undefined ? duplicateIdx : i - cachedIndices.size;

    if (resultIdx >= 0 && resultIdx < aiResults.length) {
      results[originalIdx] = aiResults[resultIdx];
    } else if (!results[originalIdx].categoryId && !results[originalIdx].categoryName) {
      // Fallback to rules if mapping failed
      results[originalIdx] = categorizeWithRules(transactions[originalIdx]);
    }
  }

  return results;
}

