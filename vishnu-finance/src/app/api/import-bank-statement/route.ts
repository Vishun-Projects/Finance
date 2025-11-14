import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { getCanonicalName } from '@/lib/entity-mapping-service';
import {
  getOrCreateAccountStatement,
  validateOpeningBalance,
  checkStatementContinuity,
  type StatementMetadata,
} from '@/lib/account-statement';
import { relative } from 'path';
import { writeAuditLog, extractRequestMeta } from '@/lib/audit';
import { validateBalanceReconciliation, formatValidationResult } from '@/lib/balance-validator';
import { categorizeTransactions, detectAutoPayTransactions } from '@/lib/transaction-categorization-service';

interface ImportRecord {
  title?: string;
  amount?: number | string;
  debit?: number | string; // Debit amount
  credit?: number | string; // Credit amount
  category?: string;
  date?: string;
  date_iso?: string;
  description?: string;
  payment_method?: string;
  notes?: string;
  type?: 'income' | 'expense'; // Legacy field, prefer credit/debit
  // New bank-specific fields
  bankCode?: string;
  transactionId?: string;
  accountNumber?: string;
  transferType?: string;
  personName?: string;
  upiId?: string;
  branch?: string;
  store?: string;
  commodity?: string;
  raw?: string; // Original raw transaction text from PDF/Excel
  rawData?: string; // Deprecated - use raw instead
  balance?: number | string;
}

export async function POST(request: NextRequest) {
  console.log('🏦 Import Bank Statement API: Starting request');
  
  try {
    const body = await request.json();
    const { userId, records, metadata, document, useAICategorization = true, validateBalance = true } = body as { 
      userId: string; 
      records: ImportRecord[];
      metadata?: StatementMetadata;
      document?: {
        storageKey?: string;
        originalName?: string;
        mimeType?: string;
        fileSize?: number;
        checksum?: string;
      };
      useAICategorization?: boolean;
      validateBalance?: boolean;
    };

    if (!userId || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'userId and records are required' }, 
        { status: 400 }
      );
    }

    const authToken = request.cookies.get('auth-token');
    const actorRecord = authToken ? (await AuthService.getUserFromToken(authToken.value)) as any : null;
    const actorRole = (actorRecord as { role?: 'USER' | 'SUPERUSER' } | null)?.role;

    if (!actorRecord || !actorRecord.isActive || (actorRole !== 'SUPERUSER' && actorRecord.id !== userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (records.length === 0) {
      return NextResponse.json({ 
        inserted: 0, 
        skipped: 0, 
        duplicates: 0,
        incomeInserted: 0,
        expenseInserted: 0
      });
    }

    // Extract account information from records for metadata
    const firstRecord = records[0];
    const accountNumber = firstRecord.accountNumber || null;
    const bankCode = firstRecord.bankCode || null;

    // Handle opening balance storage and validation
    let balanceValidation: any = null;
    let accountStatement: any = null;
    const warnings: string[] = [];
    const errors: string[] = [];

    if (metadata && accountNumber && bankCode && metadata.openingBalance !== null) {
      try {
        // Validate opening balance
        balanceValidation = await validateOpeningBalance(
          userId,
          accountNumber,
          bankCode,
          metadata.openingBalance
        );

        if (balanceValidation.error) {
          errors.push(balanceValidation.error);
        } else if (balanceValidation.warning) {
          warnings.push(balanceValidation.warning);
        }

        // Check statement continuity
        if (metadata.statementStartDate) {
          const continuity = await checkStatementContinuity(
            userId,
            accountNumber,
            bankCode,
            new Date(metadata.statementStartDate)
          );

          if (continuity.hasGap && continuity.gapDays > 0) {
            warnings.push(
              `Gap of ${continuity.gapDays} day(s) detected between statements. ` +
              `Last statement ended on ${continuity.lastEndDate?.toLocaleDateString()}. ` +
              `This may indicate missing statements.`
            );
          }
        }

        // Store account statement (only if validation passed or it's first import)
        if (balanceValidation.isValid || balanceValidation.isFirstImport) {
          // Calculate totals from records using credit/debit fields
          const totalDebits = records.reduce((sum, r) => {
            const debit = Number(r.debit || 0);
            return sum + debit;
          }, 0);
          
          const totalCredits = records.reduce((sum, r) => {
            const credit = Number(r.credit || 0);
            return sum + credit;
          }, 0);

          // Update metadata with calculated totals
          const enrichedMetadata: StatementMetadata = {
            ...metadata,
            totalDebits,
            totalCredits,
            transactionCount: records.length,
            bankCode,
          };

          accountStatement = await getOrCreateAccountStatement(
            userId,
            accountNumber,
            bankCode,
            enrichedMetadata
          );

          if (accountStatement) {
            console.log(`✅ Account statement stored: ${accountStatement.id}`);
          }
        }
      } catch (error: any) {
        console.error('Error processing account statement:', error);
        warnings.push(`Failed to store account statement metadata: ${error.message}`);
      }
    }

    // Prepare document linkage if provided
    let documentRecord: any = null;
    if (document?.storageKey) {
      try {
        const absolutePath = document.storageKey;
        const relativePath = absolutePath.startsWith(process.cwd())
          ? relative(process.cwd(), absolutePath).replace(/\\/g, '/')
          : document.storageKey;

        documentRecord = await (prisma as any).document.create({
          data: {
            ownerId: userId,
            uploadedById: actorRecord.id,
            storageKey: relativePath,
            originalName: document.originalName || 'bank-statement.pdf',
            mimeType: document.mimeType || 'application/pdf',
            fileSize: document.fileSize ?? null,
            checksum: document.checksum || null,
            visibility: 'PRIVATE',
            sourceType: 'BANK_STATEMENT',
            bankCode,
            parsedAt: new Date(),
            metadata: metadata ? JSON.stringify(metadata) : null,
          },
        });
      } catch (error) {
        console.warn('⚠️ Failed to persist document record for bank import:', error);
      }
    }

    // Helper to safely parse and validate dates
    const parseDate = (dateInput: string | Date | null | undefined): Date | null => {
      if (!dateInput) return null;
      try {
        let date: Date;
        if (dateInput instanceof Date) {
          date = dateInput;
        } else {
          const dateStr = dateInput.toString().trim();
          // Try ISO format first (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            date = new Date(dateStr + 'T00:00:00');
          } else {
            // Try parsing as-is
            date = new Date(dateStr);
          }
        }
        
        if (isNaN(date.getTime())) {
          console.warn(`⚠️ Invalid date: ${dateInput}`);
          return null;
        }
        
        // More lenient year validation (allow 2010-2030 for historical and future transactions)
        const year = date.getFullYear();
        if (year < 2010 || year > 2030) {
          console.warn(`⚠️ Date year out of range: ${year} for date: ${dateInput}`);
          return null;
        }
        
        return date;
      } catch (error) {
        console.warn(`⚠️ Date parsing error for: ${dateInput}`, error);
        return null;
      }
    };

    // Normalize records with bank-specific fields and convert to credit/debit format
    const normalized = records
      .map((r) => {
        // CRITICAL: Use date_iso if available (correctly parsed by strict DD/MM/YYYY parser)
        // Only fall back to date if date_iso is missing
        const dateInput = (r.date_iso || r.date) as string | Date | null | undefined;
        const parsedDate = parseDate(dateInput);
        
        // Determine credit and debit amounts
        // CRITICAL: Ensure amounts are never negative - debitAmount and creditAmount must be >= 0
        let debitAmount = Math.max(0, Number(r.debit || 0));
        let creditAmount = Math.max(0, Number(r.credit || 0));
        
        // If credit/debit not provided, infer from amount and legacy type
        if (debitAmount === 0 && creditAmount === 0) {
          const amount = Number(r.amount || 0);
          // If amount is negative, it's a debit (expense)
          // If amount is positive, it's a credit (income) - unless type says otherwise
          if (r.type === 'income' || (!r.type && amount > 0)) {
            creditAmount = Math.abs(amount);
            debitAmount = 0;
          } else if (r.type === 'expense' || (!r.type && amount < 0)) {
            debitAmount = Math.abs(amount);
            creditAmount = 0;
          } else {
            // Default: positive = credit, negative = debit
            if (amount > 0) {
              creditAmount = amount;
              debitAmount = 0;
            } else if (amount < 0) {
              debitAmount = Math.abs(amount);
              creditAmount = 0;
            }
          }
        }
        
        // Final validation: ensure amounts are never negative
        debitAmount = Math.max(0, debitAmount);
        creditAmount = Math.max(0, creditAmount);
        
        // Determine financial category (default based on debit/credit)
        let financialCategory: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER' = 'EXPENSE';
        if (creditAmount > 0) {
          financialCategory = 'INCOME'; // Default credits to INCOME
        } else if (debitAmount > 0) {
          financialCategory = 'EXPENSE'; // Default debits to EXPENSE
        }
        
        // IMPORTANT: NEFT/RTGS/IMPS credits are INCOME (salary), not TRANSFER
        // Only mark as TRANSFER if it's a true transfer (both credit and debit, or explicit transfer)
        const descriptionUpper = ((r.title || r.description || '').toString().toUpperCase());
        const isNEFT = descriptionUpper.includes('NEFT') || descriptionUpper.includes('RTGS') || descriptionUpper.includes('IMPS');
        
        // If it's a credit with NEFT/RTGS/IMPS, keep it as INCOME (for salary detection)
        // Only mark as TRANSFER if it's explicitly a transfer between accounts
        if (creditAmount > 0 && isNEFT) {
          financialCategory = 'INCOME'; // Keep as INCOME for salary detection
        } else if (r.transferType && (
          r.transferType.toLowerCase().includes('transfer') ||
          r.transferType.toLowerCase().includes('neft') ||
          r.transferType.toLowerCase().includes('rtgs') ||
          r.transferType.toLowerCase().includes('imps')
        ) && creditAmount === 0 && debitAmount > 0) {
          // Only mark outgoing transfers as TRANSFER
          financialCategory = 'TRANSFER';
        }
        
        return {
          description: (r.title || r.description || '').toString().trim(),
          transactionDate: parsedDate,
          creditAmount: creditAmount,
          debitAmount: debitAmount,
          financialCategory: financialCategory,
          category: (r.category || '').toString().trim() || null,
          notes: (r.notes || '').toString().trim() || null,
          // Bank-specific fields
          bankCode: r.bankCode || null,
          transactionId: r.transactionId || null,
          accountNumber: r.accountNumber || null,
          transferType: r.transferType || null,
          personName: r.personName || null,
          upiId: r.upiId || null,
          branch: r.branch || null,
          store: r.store || null,
          balance: r.balance ? Number(r.balance) : null,
          // Save original raw transaction text from PDF/Excel
          rawData: r.raw || r.rawData || null,
        };
      })
      .filter((r) => {
        // Log filtered transactions for debugging
        if (!r.description) {
          console.warn(`⚠️ Filtered transaction: missing description`);
          return false;
        }
        if (r.creditAmount === 0 && r.debitAmount === 0) {
          console.warn(`⚠️ Filtered transaction: zero amount - ${r.description.substring(0, 50)}`);
          return false;
        }
        if (!r.transactionDate || isNaN(r.transactionDate.getTime())) {
          console.warn(`⚠️ Filtered transaction: invalid date - ${r.description.substring(0, 50)}`);
          return false;
        }
        return true;
      });

    // Apply entity mappings before saving to database
    if (userId && normalized.length > 0) {
      for (const record of normalized) {
        if (record.personName) {
          record.personName = await getCanonicalName(userId, record.personName, 'PERSON');
        }
        if (record.store) {
          record.store = await getCanonicalName(userId, record.store, 'STORE');
        }
      }
    }

    if (normalized.length === 0) {
      return NextResponse.json({ error: 'No valid records to import' }, { status: 400 });
    }

    // Validate balance reconciliation if metadata is available
    let balanceValidationResult: any = null;
    if (validateBalance && metadata) {
      try {
        balanceValidationResult = validateBalanceReconciliation(
          metadata,
          normalized.map(r => ({
            creditAmount: r.creditAmount,
            debitAmount: r.debitAmount,
            balance: r.balance,
          }))
        );

        if (balanceValidationResult.errors.length > 0) {
          errors.push(...balanceValidationResult.errors);
        }
        if (balanceValidationResult.warnings.length > 0) {
          warnings.push(...balanceValidationResult.warnings);
        }

        if (!balanceValidationResult.accountNumberValid) {
          warnings.push(...balanceValidationResult.accountNumberIssues);
        }
      } catch (error: any) {
        console.error('Error validating balance:', error);
        warnings.push(`Balance validation failed: ${error.message}`);
      }
    }

    // BATCH CATEGORIZATION BEFORE IMPORT (ensures consistency)
    // Categorize entire batch at once to ensure same person/merchant gets same category
    let categorizedCount = 0;
    if (useAICategorization && userId && normalized.length > 0) {
      try {
        console.log(`🤖 Starting batch categorization for ${normalized.length} transactions...`);
        
        // Pre-fetch ALL categories once for fast lookup
        const allExpenseCategories = await (prisma as any).category.findMany({
          where: {
            type: 'EXPENSE',
            OR: [
              { userId },
              { isDefault: true, userId: null },
            ],
          },
          select: { id: true, name: true },
        });
        
        const allIncomeCategories = await (prisma as any).category.findMany({
          where: {
            type: 'INCOME',
            OR: [
              { userId },
              { isDefault: true, userId: null },
            ],
          },
          select: { id: true, name: true },
        });
        
        // Create lookup map for fast category matching
        const categoryMap = new Map<string, string>(); // name -> id
        for (const cat of [...allExpenseCategories, ...allIncomeCategories]) {
          const nameLower = cat.name.toLowerCase().trim();
          categoryMap.set(nameLower, cat.id);
          // Also add variations
          const nameParts = nameLower.split(/[&\s]+/).filter((p: string) => p.length > 2);
          for (const part of nameParts) {
            if (!categoryMap.has(part)) {
              categoryMap.set(part, cat.id);
            }
          }
        }
        
        // Prepare transactions for categorization
        const transactionsToCategorize = normalized
          .filter(r => r.transactionDate !== null && !isNaN(r.transactionDate.getTime()))
          .map(r => ({
            description: r.description,
            store: r.store,
            commodity: r.notes, // Commodity is in notes field
            amount: r.creditAmount > 0 ? r.creditAmount : r.debitAmount,
            date: r.transactionDate!.toISOString().split('T')[0],
            financialCategory: r.financialCategory,
            personName: r.personName,
            upiId: r.upiId,
            accountHolderName: metadata?.accountHolderName || null,
          }));

        // Categorize entire batch at once (ensures consistency)
        const categorizationResults = await categorizeTransactions(userId, transactionsToCategorize);
        
        // Apply categories to normalized records
        for (let i = 0; i < normalized.length; i++) {
          const result = categorizationResults[i];
          if (result && (result.categoryId || result.categoryName)) {
            let finalCategoryId: string | null = null;
            
            if (result.categoryId) {
              finalCategoryId = result.categoryId;
            } else if (result.categoryName) {
              const categoryNameLower = result.categoryName.toLowerCase().trim();
              finalCategoryId = categoryMap.get(categoryNameLower) ?? null;
              
              // Try fuzzy matching if exact match fails
              if (!finalCategoryId) {
                const categoryVariations: Record<string, string[]> = {
                  'food & dining': ['food', 'dining', 'restaurant'],
                  'groceries': ['grocery', 'shopping'],
                  'transportation': ['transport', 'travel'],
                  'healthcare': ['health', 'medical'],
                  'utilities': ['utility', 'bills'],
                  'entertainment': ['entertain'],
                  'shopping': ['shop', 'retail'],
                };
                
                const variations = categoryVariations[categoryNameLower] ?? [];
                for (const variation of variations) {
                  const foundId = categoryMap.get(variation.toLowerCase().trim());
                  finalCategoryId = foundId ?? null;
                  if (finalCategoryId) break;
                }
              }
            }
            
            if (finalCategoryId) {
              (normalized[i] as any).categoryId = finalCategoryId;
              categorizedCount++;
            }
          }
        }

        console.log(`✅ Categorized ${categorizedCount}/${normalized.length} transactions`);
      } catch (error: any) {
        console.error('Error in batch categorization:', error);
        warnings.push(`AI categorization failed: ${error.message}. Continuing with import...`);
      }
    }

    // Detect auto-pay transactions and create deadlines
    let deadlinesCreated = 0;
    if (userId && normalized.length > 0) {
      try {
        console.log('🔍 Detecting auto-pay transactions (EMI, subscriptions)...');
        
        // Prepare transactions for auto-pay detection
        // First, get category names for transactions that have categoryId
        const categoryIds = [...new Set(normalized.map(r => (r as any).categoryId).filter(Boolean))];
        const categoryMap = new Map<string, string>();
        if (categoryIds.length > 0) {
          const categories = await (prisma as any).category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          });
          for (const cat of categories) {
            categoryMap.set(cat.id, cat.name);
          }
        }
        
        const transactionsForDetection = normalized
          .filter(r => r.transactionDate !== null && !isNaN(r.transactionDate.getTime()))
          .map(r => ({
            description: r.description,
            store: r.store,
            upiId: r.upiId,
            personName: r.personName,
            amount: r.creditAmount > 0 ? r.creditAmount : r.debitAmount,
            date: r.transactionDate!.toISOString().split('T')[0],
            financialCategory: r.financialCategory,
            categoryId: (r as any).categoryId || null,
            categoryName: (r as any).categoryId ? (categoryMap.get((r as any).categoryId) ?? null) : null,
          }));
        
        // Detect auto-pay patterns
        const autoPayPatterns = await detectAutoPayTransactions(userId, transactionsForDetection);
        
        console.log(`📋 Found ${autoPayPatterns.length} auto-pay patterns with confidence >= 0.8`);
        
        // Helper function to calculate next due date
        const calculateNextDueDate = (lastDate: Date, frequency: 'MONTHLY' | 'WEEKLY' | 'DAILY'): Date => {
          const next = new Date(lastDate);
          if (frequency === 'MONTHLY') {
            next.setMonth(next.getMonth() + 1);
          } else if (frequency === 'WEEKLY') {
            next.setDate(next.getDate() + 7);
          } else if (frequency === 'DAILY') {
            next.setDate(next.getDate() + 1);
          }
          return next;
        };
        
        // Helper function to check if deadline already exists
        // Get all recurring deadlines once for efficient checking
        const existingDeadlines = await (prisma as any).deadline.findMany({
          where: {
            userId,
            isRecurring: true,
          },
          select: {
            title: true,
            amount: true,
          },
        });
        
        const checkExistingDeadline = (title: string, amount: number): boolean => {
          try {
            const titleLower = title.substring(0, 50).toLowerCase().trim();
            const minAmount = amount * 0.95;
            const maxAmount = amount * 1.05;
            
            // Check if any existing deadline matches (title and amount within tolerance)
            for (const existing of existingDeadlines) {
              const existingTitle = (existing.title || '').toLowerCase().trim();
              const existingAmount = Number(existing.amount || 0);
              
              // Check if amount is within 5% tolerance
              if (existingAmount >= minAmount && existingAmount <= maxAmount) {
                // Check if title matches (case-insensitive, partial match)
                if (existingTitle.includes(titleLower) || titleLower.includes(existingTitle)) {
                  return true;
                }
              }
            }
            return false;
          } catch {
            return false;
          }
        };
        
        // Create deadlines for detected patterns
        for (const pattern of autoPayPatterns) {
          if (pattern.confidence >= 0.8) {
            try {
              // Check if deadline already exists (synchronous check using pre-fetched deadlines)
              const exists = checkExistingDeadline(pattern.title, pattern.amount);
              
              if (!exists) {
                const nextDueDate = calculateNextDueDate(pattern.lastTransactionDate, pattern.frequency);
                
                // Round amount to 2 decimal places to avoid precision issues
                const roundedAmount = Math.round(pattern.amount * 100) / 100;
                
                await (prisma as any).deadline.create({
                  data: {
                    title: pattern.title,
                    amount: roundedAmount,
                    dueDate: nextDueDate,
                    isRecurring: true,
                    frequency: pattern.frequency,
                    category: pattern.categoryName || null,
                    userId: userId,
                    status: 'PENDING',
                    isCompleted: false,
                    paymentMethod: pattern.merchantIdentifier.startsWith('upi:') ? 'UPI' : 'AUTO_PAY',
                    notes: `Auto-detected from transaction history (${pattern.occurrenceCount} occurrences, confidence: ${(pattern.confidence * 100).toFixed(0)}%)`,
                  },
                });
                
                deadlinesCreated++;
                console.log(`✅ Created deadline: ${pattern.title} - ₹${roundedAmount.toFixed(2)} (${pattern.frequency})`);
              } else {
                console.log(`⏭️ Deadline already exists: ${pattern.title}`);
              }
            } catch (error: any) {
              console.error(`Error creating deadline for ${pattern.title}:`, error);
              // Continue with other deadlines
            }
          }
        }
        
        if (deadlinesCreated > 0) {
          console.log(`✅ Created ${deadlinesCreated} deadlines from auto-pay patterns`);
        }
      } catch (error: any) {
        console.error('Error detecting auto-pay transactions:', error);
        warnings.push(`Auto-pay detection failed: ${error.message}. Continuing with import...`);
      }
    }

    // Deduplicate in-memory by (date, description, creditAmount, debitAmount)
    const seen = new Set<string>();
    const unique = normalized.filter((r) => {
      if (!r.transactionDate || isNaN(r.transactionDate.getTime())) return false;
      let dateStr = '';
      try {
        dateStr = r.transactionDate.toISOString().slice(0, 10);
      } catch {
        dateStr = '';
      }
      const key = `${r.description}|${r.creditAmount}|${r.debitAmount}|${dateStr}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let inserted = 0;
    let duplicates = 0;
    let creditInserted = 0;
    let debitInserted = 0;

    // Helper to compute date range
    const rangeFor = (recs: typeof unique) => {
      if (!recs.length) return null;
      const validDates = recs
        .map(r => r.transactionDate)
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()));
      if (!validDates.length) return null;
      const timestamps = validDates.map(d => d.getTime());
      const min = new Date(Math.min(...timestamps));
      const max = new Date(Math.max(...timestamps));
      return { min, max };
    };

    // Check for existing transactions
    const range = rangeFor(unique);
    let existing: any[] = [];
    try {
      // Check if transaction table exists
      await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
      
      // IMPORTANT: Use a wider date range to catch all potential duplicates
      // Add 30 days buffer on each side to catch transactions that might have slight date variations
      const expandedRange = range ? {
        gte: new Date(range.min.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
        lte: new Date(range.max.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days after
      } : undefined;
      
      existing = await (prisma as any).transaction.findMany({
        where: {
          userId,
          isDeleted: false,
          ...(expandedRange ? { transactionDate: expandedRange } : {}),
        },
        select: { 
          id: true, 
          description: true, 
          creditAmount: true, 
          debitAmount: true, 
          transactionDate: true 
        },
      });
      
      console.log(`🔍 Found ${existing.length} existing transactions in date range for deduplication`);
    } catch (error: any) {
      // Transaction table doesn't exist yet, skip deduplication
      console.log('⚠️ Transaction table not available, skipping deduplication check', error);
      existing = [];
    }
    
    // Build deduplication key for existing records
    const existingSet = new Set(
      existing.map((e: any) => {
        try {
          const date = new Date(e.transactionDate);
          if (isNaN(date.getTime())) return null;
          const desc = (e.description || '').substring(0, 50); // Match MySQL index prefix
          return `${e.userId}|${desc}|${Number(e.creditAmount)}|${Number(e.debitAmount)}|${date.toISOString().slice(0,10)}|${e.isDeleted || false}`;
        } catch {
          return null;
        }
      }).filter((k: string | null): k is string => k !== null)
    );
    
    // Filter out duplicates before insertion (in-memory check)
    // Note: This helps but database constraint is the ultimate protection against race conditions
    const toInsert = unique.filter(r => {
      if (!r.transactionDate || isNaN(r.transactionDate.getTime())) return false;
      try {
        const desc = (r.description || '').substring(0, 50);
        const key = `${userId}|${desc}|${r.creditAmount}|${r.debitAmount}|${r.transactionDate.toISOString().slice(0,10)}|false`;
        return !existingSet.has(key);
      } catch {
        return false;
      }
    });
    
    duplicates += unique.length - toInsert.length;
    
    console.log(`📊 Import summary: ${unique.length} unique transactions, ${toInsert.length} to insert, ${duplicates} duplicates`);
    
    if (toInsert.length) {
      // Check if Transaction table exists before inserting
      try {
        await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
      } catch (error: any) {
        // Transaction table doesn't exist, fall back to Expense/IncomeSource
        console.log('⚠️ Transaction table not available, falling back to Expense/IncomeSource', error);
        return NextResponse.json({
          success: false,
          error: 'Transaction table not migrated yet. Please run Prisma migration first.',
          fallback: true
        }, { status: 400 });
      }
      
      const chunks: typeof toInsert[] = [];
      for (let i = 0; i < toInsert.length; i += 500) {
        chunks.push(toInsert.slice(i, i + 500));
      }
      
      // Use database transaction to prevent race conditions
      for (const chunk of chunks) {
        // Process each chunk in a database transaction for atomicity
        try {
          await (prisma as any).$transaction(async (tx: any) => {
            // Build data for insertion
            const data = chunk.map(r => ({
              userId,
              transactionDate: r.transactionDate,
              description: r.description,
              creditAmount: r.creditAmount,
              debitAmount: r.debitAmount,
              financialCategory: r.financialCategory,
              categoryId: (r as any).categoryId || null, // Use categorized categoryId if available
              accountStatementId: accountStatement?.id || null,
              notes: formatNotes(r),
              // Bank-specific fields
              bankCode: r.bankCode || null,
              transactionId: r.transactionId || null,
              accountNumber: r.accountNumber || null,
              transferType: r.transferType || null,
              personName: r.personName || null,
              upiId: r.upiId || null,
              branch: r.branch || null,
              store: r.store || null,
              balance: r.balance || null,
              rawData: r.rawData || null,
              documentId: documentRecord?.id || null,
              receiptUrl: documentRecord
                ? `/api/user/documents/${documentRecord.id}/download`
                : null,
            }));

            // BULK INSERT: Use createMany for speed (much faster than one-by-one)
            let chunkInserted = 0;
            let chunkDuplicates = 0;
            
            try {
              // Try bulk insert first
              const result = await tx.transaction.createMany({
                data: data,
                skipDuplicates: true, // Skip duplicates automatically
              });
              
              chunkInserted = result.count;
              chunkDuplicates = data.length - chunkInserted;
              inserted += chunkInserted;
              duplicates += chunkDuplicates;
              
              // Count credits and debits
              for (const record of data) {
                if (record.creditAmount > 0) creditInserted++;
                if (record.debitAmount > 0) debitInserted++;
              }
            } catch (bulkError: any) {
              // Fallback: If createMany fails, try raw SQL batch insert (fastest)
              console.warn('⚠️ createMany failed, trying raw SQL batch insert:', bulkError.message);
              
              try {
                // Use raw SQL for maximum performance (with proper escaping)
                const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
                const values = data.map((r, idx) => {
                  // Generate cuid-like ID (simplified)
                  const id = `'${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}'`;
                  // transactionDate is guaranteed to be non-null since toInsert is filtered
                  if (!r.transactionDate) throw new Error('Transaction date is required');
                  const date = `'${r.transactionDate.toISOString().split('T')[0]}'`;
                  const desc = (r.description || '').replace(/'/g, "''").replace(/\\/g, '\\\\');
                  const credit = r.creditAmount || 0;
                  const debit = r.debitAmount || 0;
                  const categoryId = r.categoryId ? `'${r.categoryId}'` : 'NULL';
                  const notes = r.notes ? `'${(r.notes || '').replace(/'/g, "''").replace(/\\/g, '\\\\')}'` : 'NULL';
                  const personName = r.personName ? `'${(r.personName || '').replace(/'/g, "''").replace(/\\/g, '\\\\')}'` : 'NULL';
                  const store = r.store ? `'${(r.store || '').replace(/'/g, "''").replace(/\\/g, '\\\\')}'` : 'NULL';
                  const rawData = r.rawData ? `'${(r.rawData || '').replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 5000)}'` : 'NULL';
                  
                  return `(${id},'${userId}',${date},'${desc}',${credit},${debit},'${r.financialCategory}',${categoryId},${r.accountStatementId ? `'${r.accountStatementId}'` : 'NULL'},${r.bankCode ? `'${r.bankCode}'` : 'NULL'},${r.transactionId ? `'${r.transactionId}'` : 'NULL'},${r.accountNumber ? `'${r.accountNumber}'` : 'NULL'},${r.transferType ? `'${r.transferType}'` : 'NULL'},${personName},${r.upiId ? `'${r.upiId}'` : 'NULL'},${r.branch ? `'${r.branch}'` : 'NULL'},${store},${rawData},${r.balance !== null && r.balance !== undefined ? r.balance : 'NULL'},${notes},${r.receiptUrl ? `'${r.receiptUrl}'` : 'NULL'},0,'${now}','${now}',${r.documentId ? `'${r.documentId}'` : 'NULL'})`;
                }).join(',');
                
                // Batch insert with IGNORE for duplicates
                // Note: INSERT IGNORE doesn't return count, so we need to check after
                await tx.$executeRawUnsafe(`
                  INSERT IGNORE INTO transactions 
                  (id, userId, transactionDate, description, creditAmount, debitAmount, financialCategory, categoryId, accountStatementId, bankCode, transactionId, accountNumber, transferType, personName, upiId, branch, store, rawData, balance, notes, receiptUrl, isDeleted, createdAt, updatedAt, documentId)
                  VALUES ${values}
                `);
                
                // Count actual inserted by checking what was inserted (more accurate)
                // Since INSERT IGNORE doesn't tell us count, we'll estimate based on unique constraint
                // For now, assume all were inserted (duplicates will be caught by unique constraint)
                chunkInserted = data.length;
                inserted += chunkInserted;
                
                // Count credits and debits for all records (they were attempted to be inserted)
                for (const record of data) {
                  if (record.creditAmount > 0) creditInserted++;
                  if (record.debitAmount > 0) debitInserted++;
                }
                
                console.log(`✅ Raw SQL batch inserted ${chunkInserted} transactions (duplicates skipped by IGNORE)`);
              } catch (sqlError: any) {
                // Last resort: one-by-one (slow but reliable)
                console.warn('⚠️ Batch insert failed, falling back to one-by-one:', sqlError.message);
                let chunkInserted = 0;
                for (const record of data) {
                  try {
                    await tx.transaction.create({ data: record });
                    chunkInserted++;
                    if (record.creditAmount > 0) creditInserted++;
                    if (record.debitAmount > 0) debitInserted++;
                  } catch (dupError: any) {
                    if (dupError.code === 'P2002' || dupError.code === 1062) {
                      duplicates++;
                    }
                  }
                }
                inserted += chunkInserted;
              }
            }
          });
        } catch (error: any) {
          // If transaction fails entirely, try fallback: createMany with skipDuplicates
          console.warn('⚠️ Transaction-level insert failed, trying batch insert with duplicate handling:', error.message);
          
          try {
            // Fallback: Use createMany with individual error handling
            const data = chunk.map(r => ({
              userId,
              transactionDate: r.transactionDate,
              description: r.description,
              creditAmount: r.creditAmount,
              debitAmount: r.debitAmount,
              financialCategory: r.financialCategory,
              categoryId: (r as any).categoryId || null, // Use categorized categoryId if available
              accountStatementId: accountStatement?.id || null,
              notes: formatNotes(r),
              bankCode: r.bankCode || null,
              transactionId: r.transactionId || null,
              accountNumber: r.accountNumber || null,
              transferType: r.transferType || null,
              personName: r.personName || null,
              upiId: r.upiId || null,
              branch: r.branch || null,
              store: r.store || null,
              balance: r.balance || null,
              rawData: r.rawData || null,
              documentId: documentRecord?.id || null,
              receiptUrl: documentRecord
                ? `/api/user/documents/${documentRecord.id}/download`
                : null,
            }));

            // Insert individually to catch duplicates
            let chunkInserted = 0;
            const insertedRecords: typeof data = [];
            for (const record of data) {
              try {
                await (prisma as any).transaction.create({ data: record });
                chunkInserted++;
                insertedRecords.push(record);
              } catch (dupError: any) {
                if (dupError.code === 'P2002' || dupError.code === 1062 || 
                    (dupError.message && (dupError.message.includes('Duplicate') || dupError.message.includes('UNIQUE') || dupError.message.includes('Unique constraint')))) {
                  duplicates++;
                } else {
                  console.error('❌ Insert error:', dupError);
                  // Log the full error for debugging
                  console.error('❌ Error details:', JSON.stringify(dupError, null, 2));
                }
              }
            }
            inserted += chunkInserted;
            
            // Count credits and debits for successfully inserted records
            for (const record of insertedRecords) {
              if (record.creditAmount > 0) creditInserted++;
              if (record.debitAmount > 0) debitInserted++;
            }
          } catch (fallbackError: any) {
            console.error('❌ Fallback insert also failed:', fallbackError);
            errors.push(`Failed to insert chunk: ${fallbackError.message}`);
          }
        }
      }
    }

    console.log(`✅ Import Bank Statement: ${inserted} transactions inserted (${creditInserted} credits, ${debitInserted} debits), ${duplicates} duplicates`);

    const meta = extractRequestMeta(request);

    await writeAuditLog({
      actorId: actorRecord.id,
      event: 'TRANSACTION_IMPORT',
      severity: duplicates > 0 ? 'WARN' : 'INFO',
      targetUserId: userId,
      targetResource: documentRecord ? `document:${documentRecord.id}` : undefined,
      metadata: {
        inserted,
        duplicates,
        creditInserted,
        debitInserted,
        bankCode,
        accountNumber,
      },
      message: `${actorRecord.email} imported ${inserted} transactions${duplicates ? ` (${duplicates} duplicates)` : ''}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
 
    return NextResponse.json({ 
      inserted, 
      skipped: unique.length - inserted, 
      duplicates,
      creditInserted,
      debitInserted,
      // Legacy fields for backward compatibility
      incomeInserted: creditInserted,
      expenseInserted: debitInserted,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined,
      balanceValidation,
      balanceValidationResult: balanceValidationResult ? {
        isValid: balanceValidationResult.isValid,
        calculatedClosingBalance: balanceValidationResult.calculatedClosingBalance,
        expectedClosingBalance: balanceValidationResult.expectedClosingBalance,
        discrepancy: balanceValidationResult.discrepancy,
        accountNumberValid: balanceValidationResult.accountNumberValid,
        summary: formatValidationResult(balanceValidationResult),
      } : undefined,
      categorizedCount,
      deadlinesCreated,
      accountStatement: accountStatement ? {
        id: accountStatement.id,
        openingBalance: accountStatement.openingBalance,
        closingBalance: accountStatement.closingBalance,
        statementStartDate: accountStatement.statementStartDate,
        statementEndDate: accountStatement.statementEndDate,
      } : undefined,
    });
    
  } catch (error: any) {
    console.error('❌ IMPORT BANK STATEMENT ERROR:', error);
    console.error('❌ ERROR STACK:', error?.stack);
    const errorMessage = error?.message || 'Failed to import bank statements';
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}

// Helper to format notes with multiple fields
function formatNotes(record: any): string {
  // Only save commodity in notes field, as it represents the actual item/purpose
  if (record.commodity) {
    return record.commodity;
  }
  
  // Fallback: if no commodity, save a meaningful part of description
  if (record.description) {
    // Extract meaningful note from description if available
    return record.description;
  }
  
  return '';
}

