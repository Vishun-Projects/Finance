/**
 * Multi-Pass Categorization System
 * =================================
 * Analyzes all transactions, categorizes, rethinks, ensures consistency,
 * and only updates database after all passes are complete.
 */

import { prisma } from './db';
import { 
  categorizeTransactions, 
  type TransactionToCategorize, 
  type CategorizationResult 
} from './transaction-categorization-service';

// Helper to get user categories
async function getUserCategories(
  userId: string,
  type: 'INCOME' | 'EXPENSE'
): Promise<Array<{ id: string; name: string }>> {
  try {
    const categories = await (prisma as any).category.findMany({
      where: {
        type: type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        OR: [
          { userId },
          { isDefault: true, userId: null },
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

interface TransactionWithResult {
  id: string;
  transaction: TransactionToCategorize;
  result: CategorizationResult;
  store?: string | null;
  personName?: string | null;
  upiId?: string | null;
}

interface ConsistencyMap {
  [key: string]: {
    categoryId: string | null;
    categoryName: string | null;
    confidence: number;
    count: number;
    transactions: TransactionWithResult[];
  };
}

/**
 * Multi-pass categorization with consistency checking
 * 
 * Pass 1: Initial categorization of all transactions
 * Pass 2: Consistency check - ensure same store/UPI/person = same category
 * Pass 3: Re-analyze with context from pass 2
 * Pass 4: Final consistency check and confidence boost
 * Then: Batch update all at once
 */
export async function multiPassCategorization(
  userId: string,
  transactionIds: string[]
): Promise<{ categorized: number; updated: number; consistencyFixes: number; integrityFixes: number }> {
  console.log(`🔄 Starting multi-pass categorization for ${transactionIds.length} transactions`);

  // Load all transactions from database
  const transactions = await prisma.transaction.findMany({
    where: {
      id: { in: transactionIds },
      userId,
      isDeleted: false,
    },
    select: {
      id: true,
      description: true,
      store: true,
      personName: true,
      upiId: true,
      transactionDate: true,
      debitAmount: true,
      creditAmount: true,
      financialCategory: true,
      categoryId: true,
      notes: true,
    },
    orderBy: {
      transactionDate: 'desc',
    },
  });

  if (transactions.length === 0) {
    return { categorized: 0, updated: 0, consistencyFixes: 0, integrityFixes: 0 };
  }

  // Convert to TransactionToCategorize format
  const transactionsToCategorize: TransactionToCategorize[] = transactions.map((t) => {
    // Handle transactionDate - could be Date object or string (from Prisma)
    let dateStr = '';
    if (t.transactionDate) {
      if (t.transactionDate instanceof Date) {
        dateStr = t.transactionDate.toISOString().split('T')[0];
      } else {
        const dateValue = t.transactionDate as Date | string;
        if (typeof dateValue === 'string') {
          dateStr = dateValue.split('T')[0].substring(0, 10);
        } else {
          const date = new Date(dateValue as any);
          if (!isNaN(date.getTime())) {
            dateStr = date.toISOString().split('T')[0];
          }
        }
      }
    }
    if (!dateStr) {
      dateStr = new Date().toISOString().split('T')[0];
    }

    // Convert Prisma Decimal to number
    const creditAmount = typeof t.creditAmount === 'object' && 'toNumber' in t.creditAmount 
      ? (t.creditAmount as any).toNumber() 
      : Number(t.creditAmount || 0);
    const debitAmount = typeof t.debitAmount === 'object' && 'toNumber' in t.debitAmount 
      ? (t.debitAmount as any).toNumber() 
      : Number(t.debitAmount || 0);
    
    return {
      description: t.description || '',
      store: t.store || undefined,
      commodity: t.notes || undefined,
      amount: (creditAmount > 0 ? creditAmount : debitAmount) || 0,
      date: dateStr,
      financialCategory: t.financialCategory as 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER',
      personName: t.personName || undefined,
      upiId: t.upiId || undefined,
    };
  });

  // PASS 1: Initial categorization
  console.log(`📊 Pass 1: Initial categorization of ${transactionsToCategorize.length} transactions...`);
  const results: CategorizationResult[] = await categorizeTransactions(userId, transactionsToCategorize);
  
  // Create transaction-result pairs
  let transactionResults: TransactionWithResult[] = transactions.map((t, idx) => ({
    id: t.id,
    transaction: transactionsToCategorize[idx],
    result: results[idx],
    store: t.store,
    personName: t.personName,
    upiId: t.upiId,
  }));

  // PASS 2: Consistency check - ensure same store/UPI/person = same category
  console.log(`🔍 Pass 2: Consistency check and enforcement...`);
  const consistencyFixes = enforceConsistency(transactionResults);
  console.log(`✅ Pass 2: Fixed ${consistencyFixes} inconsistencies`);

  // PASS 2.5: Category integrity verification
  console.log(`🔍 Pass 2.5: Category integrity verification...`);
  const integrityFixes = await verifyCategoryIntegrity(userId, transactionResults);
  console.log(`✅ Pass 2.5: Fixed ${integrityFixes} integrity issues`);

  // PASS 3: Re-analyze with consistency context
  console.log(`🔄 Pass 3: Re-analyzing with consistency context...`);
  const reanalyzedResults = await reanalyzeWithContext(userId, transactionResults);
  
  // Update results with re-analyzed data
  transactionResults = transactionResults.map((tr, idx) => ({
    ...tr,
    result: reanalyzedResults[idx] || tr.result,
  }));

  // PASS 4: Final consistency check and confidence boost
  console.log(`✨ Pass 4: Final consistency check and confidence boost...`);
  const finalConsistencyFixes = enforceConsistency(transactionResults);
  const finalIntegrityFixes = await verifyCategoryIntegrity(userId, transactionResults);
  boostConfidenceForConsistent(transactionResults);
  console.log(`✅ Pass 4: Fixed ${finalConsistencyFixes} more inconsistencies and ${finalIntegrityFixes} integrity issues`);

  // Look up category IDs for results that only have category names
  const allCategories = await Promise.all([
    getUserCategories(userId, 'EXPENSE'),
    getUserCategories(userId, 'INCOME'),
  ]).then(([expense, income]) => [...expense, ...income]);

  // Ensure all results have category IDs
  for (const tr of transactionResults) {
    if (tr.result.categoryName && !tr.result.categoryId) {
      const matched = allCategories.find(
        (c) => c.name.toLowerCase().trim() === tr.result.categoryName?.toLowerCase().trim()
      );
      if (matched) {
        tr.result.categoryId = matched.id;
      }
    }
  }

  // Prepare batch updates (only for transactions that need updates)
  const updates = transactionResults
    .filter((tr) => {
      const originalTxn = transactions.find((t) => t.id === tr.id);
      return tr.result.categoryId && originalTxn?.categoryId !== tr.result.categoryId;
    })
    .map((tr) => ({
      id: tr.id,
      categoryId: tr.result.categoryId!,
    }));

  // Batch update all at once
  if (updates.length > 0) {
    console.log(`💾 Updating ${updates.length} transactions in database...`);
    
    // Update in batches to avoid overwhelming the database
    const BATCH_SIZE = 100;
    let updatedCount = 0;
    
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map((update) =>
          prisma.transaction.update({
            where: { id: update.id },
            data: { categoryId: update.categoryId },
          })
        )
      );
      
      updatedCount += batch.length;
      console.log(`  Updated ${updatedCount}/${updates.length} transactions...`);
    }

    console.log(`✅ Successfully updated ${updatedCount} transactions`);
  }

  const categorized = transactionResults.filter((tr) => tr.result.categoryId).length;

  return {
    categorized,
    updated: updates.length,
    consistencyFixes: consistencyFixes + finalConsistencyFixes,
    integrityFixes: integrityFixes + finalIntegrityFixes,
  };
}

/**
 * Enforce consistency: same store/UPI/person = same category
 */
function enforceConsistency(transactionResults: TransactionWithResult[]): number {
  const consistencyMap: ConsistencyMap = {};
  let fixes = 0;

  // Build consistency map
  for (const tr of transactionResults) {
    if (!tr.result.categoryId) continue;

    // Create key from store, personName, or upiId
    const key = getConsistencyKey(tr);
    if (!key) continue;

    if (!consistencyMap[key]) {
      consistencyMap[key] = {
        categoryId: tr.result.categoryId,
        categoryName: tr.result.categoryName,
        confidence: tr.result.confidence,
        count: 1,
        transactions: [tr],
      };
    } else {
      consistencyMap[key].transactions.push(tr);
      consistencyMap[key].count++;
      
      // If category differs, use the one with higher confidence or more occurrences
      if (consistencyMap[key].categoryId !== tr.result.categoryId) {
        const existingConfidence = consistencyMap[key].confidence;
        const existingCount = consistencyMap[key].count - 1; // Subtract current to get previous count
        
        if (tr.result.confidence > existingConfidence || 
            (tr.result.confidence === existingConfidence && consistencyMap[key].count > existingCount)) {
          // Update to new category
          consistencyMap[key].categoryId = tr.result.categoryId;
          consistencyMap[key].categoryName = tr.result.categoryName;
          consistencyMap[key].confidence = tr.result.confidence;
        }
      }
    }
  }

  // Apply consistency: all transactions with same key get same category
  for (const [, data] of Object.entries(consistencyMap)) {
    if (data.count > 1) {
      // Multiple transactions with same identifier
      for (const tr of data.transactions) {
        if (tr.result.categoryId !== data.categoryId) {
          tr.result.categoryId = data.categoryId;
          tr.result.categoryName = data.categoryName;
          // Boost confidence for consistency
          tr.result.confidence = Math.min(1, tr.result.confidence + 0.1);
          fixes++;
        }
      }
    }
  }

  return fixes;
}

/**
 * Normalize store name for consistent matching
 */
function normalizeStoreName(storeName: string | null | undefined): string {
  if (!storeName) return '';
  return storeName
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
}

/**
 * Normalize person name for consistent matching
 */
function normalizePersonName(personName: string | null | undefined): string {
  if (!personName) return '';
  
  // Extract person name from UPI ID if present
  // e.g., "manishavishwakarma2463@okaxis" -> "manishavishwakarma2463"
  let name = personName;
  if (personName.includes('@')) {
    name = personName.split('@')[0];
  }
  
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
}

/**
 * Get consistency key from transaction (store > personName > upiId)
 * Uses normalized names for case-insensitive matching
 */
function getConsistencyKey(tr: TransactionWithResult): string | null {
  if (tr.store) {
    return `store:${normalizeStoreName(tr.store)}`;
  }
  if (tr.personName) {
    return `person:${normalizePersonName(tr.personName)}`;
  }
  if (tr.upiId) {
    return `upi:${normalizeStoreName(tr.upiId)}`; // UPI IDs should also be normalized
  }
  return null;
}

/**
 * Re-analyze transactions with consistency context
 */
async function reanalyzeWithContext(
  userId: string,
  transactionResults: TransactionWithResult[]
): Promise<CategorizationResult[]> {
  // Build consistency patterns from current results
  const consistencyPatterns = new Map<string, { categoryId: string | null; categoryName: string | null; count: number }>();
  
  for (const tr of transactionResults) {
    if (!tr.result.categoryId) continue;
    
    const key = getConsistencyKey(tr);
    if (!key) continue;
    
    const existing = consistencyPatterns.get(key);
    if (existing) {
      existing.count++;
    } else {
      consistencyPatterns.set(key, {
        categoryId: tr.result.categoryId,
        categoryName: tr.result.categoryName,
        count: 1,
      });
    }
  }

  // Re-categorize transactions that are still uncategorized or have low confidence
  const needsReanalysis = transactionResults.filter(
    (tr) => !tr.result.categoryId || tr.result.confidence < 0.7
  );

  if (needsReanalysis.length === 0) {
    return transactionResults.map((tr) => tr.result);
  }

  // Check if any consistency patterns can help
  const reanalyzed: CategorizationResult[] = [];
  
  for (const tr of transactionResults) {
    if (tr.result.categoryId && tr.result.confidence >= 0.7) {
      // Keep existing result
      reanalyzed.push(tr.result);
      continue;
    }

    // Check consistency patterns
    const key = getConsistencyKey(tr);
    if (key && consistencyPatterns.has(key)) {
      const pattern = consistencyPatterns.get(key)!;
      if (pattern.categoryId && pattern.count >= 2) {
        // Use consistent category with boosted confidence
        reanalyzed.push({
          categoryId: pattern.categoryId,
          categoryName: pattern.categoryName,
          confidence: Math.min(1, 0.7 + (pattern.count * 0.05)), // Boost based on pattern strength
          source: 'pattern',
          reasoning: `Consistent with ${pattern.count} other transactions`,
        });
        continue;
      }
    }

    // Keep original result
    reanalyzed.push(tr.result);
  }

  return reanalyzed;
}

/**
 * Verify category integrity - ensure categories meet their requirements
 */
async function verifyCategoryIntegrity(
  userId: string,
  transactionResults: TransactionWithResult[]
): Promise<number> {
  let fixes = 0;

  for (const tr of transactionResults) {
    if (!tr.result.categoryName) continue;

    const categoryName = tr.result.categoryName.toLowerCase();

    // Salary: Must have recurring pattern (3+ occurrences)
    if (categoryName === 'salary') {
      if (tr.transaction.financialCategory === 'INCOME' && tr.transaction.amount >= 10000) {
        // Check if it has personName/UPI (shouldn't be salary)
        if (tr.personName || tr.upiId) {
          // Downgrade to Transfer or Income
          tr.result.categoryName = tr.personName ? 'Transfer' : 'Income';
          tr.result.categoryId = null;
          tr.result.confidence = 0.7;
          tr.result.reasoning = 'Salary category invalid: personName/UPI present indicates transfer';
          fixes++;
          continue;
        }

        // Check for recurring pattern
        try {
          const existingIncome = await (prisma as any).transaction.findMany({
            where: {
              userId,
              financialCategory: 'INCOME',
              isDeleted: false,
              OR: [
                { creditAmount: { gte: tr.transaction.amount * 0.9, lte: tr.transaction.amount * 1.1 } },
                { debitAmount: { gte: tr.transaction.amount * 0.9, lte: tr.transaction.amount * 1.1 } },
              ],
            },
            select: { creditAmount: true, debitAmount: true },
            take: 5,
          });

          const similarCount = existingIncome.filter((txn: any) => {
            const txnAmount = Number(txn.creditAmount || txn.debitAmount || 0);
            const diff = Math.abs(txnAmount - tr.transaction.amount);
            const tolerance = Math.max(txnAmount, tr.transaction.amount) * 0.1;
            return diff <= tolerance && txnAmount > 0;
          }).length;

          if (similarCount < 2) {
            // Not enough recurring pattern - downgrade
            tr.result.categoryName = 'Income';
            tr.result.categoryId = null;
            tr.result.confidence = 0.6;
            tr.result.reasoning = 'Salary category invalid: insufficient recurring pattern';
            fixes++;
          }
        } catch (error) {
          console.error('Error verifying salary pattern:', error);
        }
      }
    }

    // EMI: Must have EMI keywords in description
    if (categoryName === 'housing' || categoryName === 'transportation' || categoryName === 'debt payment' || categoryName === 'education') {
      const text = (tr.transaction.description || '').toLowerCase() + ' ' + (tr.transaction.store || '').toLowerCase();
      const hasEMIKeywords = text.includes('emi') || text.includes('loan') || text.includes('installment') || text.includes('repayment');
      
      // If categorized as Housing/Transportation/Debt Payment/Education but no EMI keywords and amount < 5000, might be wrong
      if (!hasEMIKeywords && tr.transaction.amount < 5000) {
        // This might be a false positive, but we'll keep it with lower confidence
        tr.result.confidence = Math.max(0.5, tr.result.confidence - 0.2);
      }
    }

    // Family: Must have surname match
    if (categoryName === 'family') {
      if (!tr.personName || !tr.transaction.accountHolderName) {
        // Can't verify family without personName and accountHolderName
        // Keep it but lower confidence
        tr.result.confidence = Math.max(0.6, tr.result.confidence - 0.2);
      }
    }
    
    // Taxes: Must have tax keywords
    if (categoryName === 'taxes') {
      const text = (tr.transaction.description || '').toLowerCase() + ' ' + (tr.transaction.store || '').toLowerCase();
      const hasTaxKeywords = 
        text.includes('tax') ||
        text.includes('gst') ||
        text.includes('tds') ||
        text.includes('income tax') ||
        text.includes('service tax');
      
      if (!hasTaxKeywords) {
        tr.result.confidence = Math.max(0.3, tr.result.confidence - 0.2);
        tr.result.reasoning = 'Taxes category: missing tax keywords';
      }
    }
    
    // Fees & Charges: Must have charge/fee keywords
    if (categoryName === 'fees & charges' || categoryName === 'fees and charges') {
      const text = (tr.transaction.description || '').toLowerCase() + ' ' + (tr.transaction.store || '').toLowerCase();
      const hasChargeKeywords = 
        text.includes('charge') ||
        text.includes('fee') ||
        text.includes('penalty') ||
        text.includes('fine') ||
        text.includes('minimum balance') ||
        text.includes('atm') ||
        text.includes('bounce') ||
        text.includes('dishonour');
      
      if (!hasChargeKeywords) {
        tr.result.confidence = Math.max(0.3, tr.result.confidence - 0.2);
        tr.result.reasoning = 'Fees & Charges category: missing charge/fee keywords';
      }
    }
    
    // Gifts & Donations (INCOME): Must have gift/donation keywords
    if (categoryName === 'gifts & donations' || categoryName === 'gifts and donations') {
      const text = (tr.transaction.description || '').toLowerCase() + ' ' + (tr.transaction.store || '').toLowerCase() + ' ' + (tr.personName || '').toLowerCase();
      const hasGiftKeywords = 
        text.includes('gift') ||
        text.includes('donation received') ||
        text.includes('charity received');
      
      if (!hasGiftKeywords) {
        tr.result.confidence = Math.max(0.3, tr.result.confidence - 0.2);
        tr.result.reasoning = 'Gifts & Donations category: missing gift/donation keywords';
      }
    }
    
    // Charity & Donations (EXPENSE): Must have donation/charity keywords
    if (categoryName === 'charity & donations' || categoryName === 'charity and donations') {
      const text = (tr.transaction.description || '').toLowerCase() + ' ' + (tr.transaction.store || '').toLowerCase() + ' ' + (tr.personName || '').toLowerCase();
      const hasCharityKeywords = 
        text.includes('donation') ||
        text.includes('charity') ||
        text.includes('ngo') ||
        text.includes('foundation') ||
        text.includes('trust');
      
      if (!hasCharityKeywords) {
        tr.result.confidence = Math.max(0.3, tr.result.confidence - 0.2);
        tr.result.reasoning = 'Charity & Donations category: missing donation/charity keywords';
      }
    }
    
    // Refund: Must have refund/reversal keywords
    if (categoryName === 'refund') {
      const text = (tr.transaction.description || '').toLowerCase() + ' ' + (tr.transaction.store || '').toLowerCase();
      const hasRefundKeywords = 
        text.includes('refund') ||
        text.includes('reversal') ||
        text.includes('reversed') ||
        text.includes('credit back');
      
      if (!hasRefundKeywords) {
        tr.result.confidence = Math.max(0.3, tr.result.confidence - 0.2);
        tr.result.reasoning = 'Refund category: missing refund/reversal keywords';
      }
    }
  }

  return fixes;
}

/**
 * Boost confidence for transactions that are consistent with others
 */
function boostConfidenceForConsistent(transactionResults: TransactionWithResult[]): void {
  const keyCounts = new Map<string, number>();
  
  // Count occurrences of each key
  for (const tr of transactionResults) {
    const key = getConsistencyKey(tr);
    if (key && tr.result.categoryId) {
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    }
  }

  // Boost confidence for transactions with multiple occurrences
  for (const tr of transactionResults) {
    const key = getConsistencyKey(tr);
    if (key && tr.result.categoryId) {
      const count = keyCounts.get(key) || 0;
      if (count > 1) {
        // Boost confidence: more occurrences = higher confidence
        const boost = Math.min(0.2, (count - 1) * 0.05);
        tr.result.confidence = Math.min(1, tr.result.confidence + boost);
      }
    }
  }
}

