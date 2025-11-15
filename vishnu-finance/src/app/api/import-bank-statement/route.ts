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
  // Data quality fields
  isPartialData?: boolean;
  hasInvalidDate?: boolean;
  hasZeroAmount?: boolean;
  parsingMethod?: string;
  parsingConfidence?: number;
}

export async function POST(request: NextRequest) {
  console.log('🏦 Import Bank Statement API: Starting request');
  
  try {
    const body = await request.json();
    const { userId, records, metadata, document, useAICategorization = true, validateBalance = true, categorizeInBackground = false, forceInsert = false } = body as { 
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
      categorizeInBackground?: boolean; // If true, skip categorization during import and do it in background
      forceInsert?: boolean; // Skip duplicate check and force insert
    };
    
    // Log categorization settings
    console.log(`📋 Categorization settings: useAICategorization=${useAICategorization}, categorizeInBackground=${categorizeInBackground}, records=${records.length}`);

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

    // Get statement date range from metadata for date inference
    const statementStartDate = metadata?.statementStartDate ? new Date(metadata.statementStartDate) : null;
    let lastValidDate: Date | null = null;

    // Normalize records with bank-specific fields and convert to credit/debit format
    // LENIENT FILTERING: Store transactions with partial data instead of filtering them
    const normalized = records
      .map((r, idx) => {
        // CRITICAL: Use date_iso if available (correctly parsed by strict DD/MM/YYYY parser)
        // Only fall back to date if date_iso is missing
        const dateInput = (r.date_iso || r.date) as string | Date | null | undefined;
        let parsedDate = parseDate(dateInput);
        let hasInvalidDate = false;
        
        // If date parsing failed, try to infer from context
        if (!parsedDate || isNaN(parsedDate.getTime())) {
          // Try to infer from previous transaction date
          if (lastValidDate) {
            parsedDate = new Date(lastValidDate);
            hasInvalidDate = true;
            console.warn(`⚠️ [${idx}] Date inference: using previous transaction date for missing/invalid date`);
          } 
          // Try to infer from statement date range
          else if (statementStartDate) {
            parsedDate = new Date(statementStartDate);
            hasInvalidDate = true;
            console.warn(`⚠️ [${idx}] Date inference: using statement start date for missing/invalid date`);
          }
          // Last resort: use current date (but flag it)
          else {
            parsedDate = new Date();
            hasInvalidDate = true;
            console.warn(`⚠️ [${idx}] Date inference: using current date as last resort for missing/invalid date`);
          }
        }
        
        // Update last valid date for next transaction
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          lastValidDate = parsedDate;
        }
        
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
        
        // Check if amount is zero
        const hasZeroAmount = debitAmount === 0 && creditAmount === 0;
        
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
        
        // Handle missing description - use raw data or fallback
        let description = (r.title || r.description || '').toString().trim();
        const isPartialData = !description || hasZeroAmount || hasInvalidDate;
        
        if (!description) {
          // Try to use raw data
          description = (r.raw || r.rawData || '').toString().trim();
          if (!description) {
            // Last resort: use a generic description
            description = 'Uncategorized Transaction';
            console.warn(`⚠️ [${idx}] Missing description: using fallback "Uncategorized Transaction"`);
          }
        }
        
        return {
          description: description,
          transactionDate: parsedDate!,
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
          // Data quality flags
          isPartialData: isPartialData,
          hasInvalidDate: hasInvalidDate,
          hasZeroAmount: hasZeroAmount,
          parsingMethod: r.parsingMethod || 'standard',
          parsingConfidence: r.parsingConfidence || (isPartialData ? 0.5 : 1.0),
        };
      })
      .filter((r, idx) => {
        // LENIENT FILTERING: Only filter truly invalid records (completely empty)
        // All other records are kept with appropriate flags
        
        // Only reject if transaction date is still invalid after inference attempts
        if (!r.transactionDate || isNaN(r.transactionDate.getTime())) {
          console.warn(`⚠️ [${idx}] Filtered: completely invalid date after all inference attempts`);
          return false;
        }
        
        // Log partial data transactions but keep them
        if (r.isPartialData) {
          console.log(`ℹ️ [${idx}] Partial data transaction kept: hasInvalidDate=${r.hasInvalidDate}, hasZeroAmount=${r.hasZeroAmount}, missingDescription=${!r.description || r.description === 'Uncategorized Transaction'}`);
        }
        
        return true;
      });
    
    // Log normalization statistics
    const normalizedCount = normalized.length;
    const filteredCount = records.length - normalizedCount;
    if (filteredCount > 0) {
      console.log(`📊 Normalization: ${records.length} records → ${normalizedCount} valid (${filteredCount} filtered)`);
    }

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
    // Determine if we should use background categorization early
    // ALWAYS trigger background categorization if:
    // 1. categorizeInBackground is explicitly true, OR
    // 2. normalized.length > 100 transactions (large import), OR
    // 3. useAICategorization is true and normalized.length > 50 (any import with AI enabled and > 50 transactions)
    // This ensures categorization happens for both small and large imports
    const shouldUseBackground = categorizeInBackground || 
                                 (normalized.length > 100 && useAICategorization) ||
                                 (normalized.length > 50 && useAICategorization);
    
    // BATCH CATEGORIZATION BEFORE IMPORT (ensures consistency)
    // Skip if background mode is enabled
    let categorizedCount = 0;
    if (useAICategorization && !shouldUseBackground && userId && normalized.length > 0) {
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
          .filter((r): r is typeof r & { transactionDate: Date | string } => {
            if (!r.transactionDate) return false;
            // Handle both Date objects and strings
            if (r.transactionDate instanceof Date) {
              return !isNaN(r.transactionDate.getTime());
            }
            // If it's a string, try to parse it
            const date = new Date(r.transactionDate);
            return !isNaN(date.getTime());
          })
          .map(r => {
            // Safely convert transactionDate to ISO string
            let dateStr = '';
            const txDate = r.transactionDate;
            if (txDate instanceof Date) {
              dateStr = txDate.toISOString().split('T')[0];
            } else {
              // Handle string or other types
              const dateStrValue = String(txDate);
              if (dateStrValue && dateStrValue.length >= 10) {
                dateStr = dateStrValue.split('T')[0].substring(0, 10);
              } else {
                const date = new Date(txDate as string | number | Date);
                if (!isNaN(date.getTime())) {
                  dateStr = date.toISOString().split('T')[0];
                }
              }
            }
            
            return {
              description: r.description,
              store: r.store,
              commodity: r.notes, // Commodity is in notes field
              amount: r.creditAmount > 0 ? r.creditAmount : r.debitAmount,
              date: dateStr || new Date().toISOString().split('T')[0], // Fallback to today
              financialCategory: r.financialCategory,
              personName: r.personName,
              upiId: r.upiId,
              accountHolderName: metadata?.accountHolderName || null,
            };
          });

        // Categorize entire batch at once (ensures consistency)
        console.log(`🤖 Categorizing ${transactionsToCategorize.length} transactions...`);
        const categorizationResults = await categorizeTransactions(userId, transactionsToCategorize);
        
        // Log categorization results
        const foundWithId = categorizationResults.filter(r => r.categoryId).length;
        const foundWithName = categorizationResults.filter(r => r.categoryName && !r.categoryId).length;
        console.log(`📊 Categorization results: ${foundWithId} with ID, ${foundWithName} with name only, ${categorizationResults.length - foundWithId - foundWithName} uncategorized`);
        
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
              
              if (!finalCategoryId) {
                console.warn(`⚠️ Category name "${result.categoryName}" not found in database for transaction ${i}`);
              }
            }
            
            if (finalCategoryId) {
              (normalized[i] as any).categoryId = finalCategoryId;
              categorizedCount++;
            } else if (result.categoryName) {
              console.warn(`⚠️ Failed to resolve category ID for "${result.categoryName}"`);
            }
          }
        }
        
        console.log(`✅ Applied categories to ${categorizedCount}/${normalized.length} transactions`);
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
    const duplicateKeys = new Set<string>();
    let invalidDateCount = 0;
    const unique = normalized.filter((r) => {
      if (!r.transactionDate || isNaN(r.transactionDate.getTime())) {
        invalidDateCount++;
        return false;
      }
      let dateStr = '';
      try {
        dateStr = r.transactionDate.toISOString().slice(0, 10);
      } catch {
        invalidDateCount++;
        return false;
      }
      const key = `${r.description}|${r.creditAmount}|${r.debitAmount}|${dateStr}`;
      if (seen.has(key)) {
        duplicateKeys.add(key);
        return false;
      }
      seen.add(key);
      return true;
    });
    
    // Log deduplication statistics
    const duplicateCount = normalized.length - unique.length - invalidDateCount;
    if (duplicateCount > 0 || invalidDateCount > 0) {
      console.log(`📊 Deduplication: ${normalized.length} normalized → ${unique.length} unique (${duplicateCount} duplicates in file, ${invalidDateCount} invalid dates)`);
    }

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

    // Check for existing transactions (skip if forceInsert is true)
    const range = rangeFor(unique);
    let existing: any[] = [];
    let existingSet = new Set<string>();
    
    if (!forceInsert) {
      try {
        // Check if transaction table exists
        await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
        
        // First, check if DB is actually empty (quick count check)
        const totalCount = await (prisma as any).transaction.count({
          where: { userId, isDeleted: false },
        });
        
        if (totalCount === 0) {
          console.log('✅ Database is empty for this user, skipping duplicate check');
        } else {
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
              transactionDate: true,
              transactionId: true,
              accountNumber: true,
            },
          });
          
          console.log(`🔍 Found ${existing.length} existing transactions in date range for deduplication (total in DB: ${totalCount})`);
          
          // Build deduplication key for existing records
          // Improved key: includes transactionId and accountNumber if available for better accuracy
          existingSet = new Set(
            existing.map((e: any) => {
              try {
                const date = new Date(e.transactionDate);
                if (isNaN(date.getTime())) return null;
                const desc = (e.description || '').substring(0, 50); // Match MySQL index prefix
                const txnId = (e.transactionId || '').trim();
                const accNum = (e.accountNumber || '').trim();
                // Include transactionId and accountNumber if available for more accurate matching
                const key = `${userId}|${desc}|${Number(e.creditAmount)}|${Number(e.debitAmount)}|${date.toISOString().slice(0,10)}|${txnId}|${accNum}|${e.isDeleted || false}`;
                return key;
              } catch {
                return null;
              }
            }).filter((k: string | null): k is string => k !== null)
          );
        }
      } catch (error: any) {
        // Transaction table doesn't exist yet, skip deduplication
        console.log('⚠️ Transaction table not available, skipping deduplication check', error);
        existing = [];
      }
    } else {
      console.log('⚡ Force insert mode: Skipping duplicate check');
    }
    
    // Filter out duplicates before insertion (in-memory check)
    // Note: This helps but database constraint is the ultimate protection against race conditions
    const toInsert = unique.filter(r => {
      if (!r.transactionDate || isNaN(r.transactionDate.getTime())) return false;
      
      if (forceInsert) {
        // Force insert mode: skip duplicate check
        return true;
      }
      
      try {
        const desc = (r.description || '').substring(0, 50);
        const txnId = (r.transactionId || '').trim();
        const accNum = (r.accountNumber || '').trim();
        // Improved key: includes transactionId and accountNumber if available
        const key = `${userId}|${desc}|${r.creditAmount}|${r.debitAmount}|${r.transactionDate.toISOString().slice(0,10)}|${txnId}|${accNum}|false`;
        
        const isDuplicate = existingSet.has(key);
        if (isDuplicate) {
          console.log(`🔍 Duplicate detected: ${desc.substring(0, 30)}... (${r.transactionDate.toISOString().slice(0,10)}, ${r.creditAmount > 0 ? `+${r.creditAmount}` : `-${r.debitAmount}`})`);
        }
        return !isDuplicate;
      } catch {
        return false;
      }
    });
    
    const existingDuplicates = unique.length - toInsert.length;
    duplicates += existingDuplicates;
    
    console.log(`📊 Import summary: ${records.length} total records → ${normalized.length} normalized → ${unique.length} unique → ${toInsert.length} to insert`);
    console.log(`📊 Breakdown: ${records.length - normalized.length} filtered during normalization, ${normalized.length - unique.length} duplicates/invalid in file, ${existingDuplicates} existing in DB`);
    
    // If significant number of records lost, log warning
    const totalLost = records.length - toInsert.length;
    if (totalLost > 0 && totalLost > records.length * 0.1) {
      console.warn(`⚠️ WARNING: ${totalLost} out of ${records.length} records were not inserted (${Math.round(totalLost / records.length * 100)}%)`);
    }
    
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
      
      // Optimize batch size based on total count
      // Larger batches = fewer round trips = faster imports
      const batchSize = toInsert.length > 5000 ? 2000 : toInsert.length > 1000 ? 1000 : 500;
      const chunks: typeof toInsert[] = [];
      for (let i = 0; i < toInsert.length; i += batchSize) {
        chunks.push(toInsert.slice(i, i + batchSize));
      }
      
      console.log(`📦 Processing ${toInsert.length} transactions in ${chunks.length} batches of ${batchSize}`);
      
      // Process batches with controlled parallelism for optimal performance
      const CONCURRENT_BATCHES = 5; // Process 5 batches in parallel (optimized for MySQL)
      
      const processBatch = async (chunk: typeof toInsert, batchNum: number): Promise<{ inserted: number; credit: number; debit: number }> => {
        try {
          // Use raw SQL INSERT IGNORE for maximum performance (fastest method)
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const values = chunk.map((r, idx) => {
            // Generate unique ID
            const id = `'${Date.now()}_${batchNum}_${idx}_${Math.random().toString(36).substr(2, 9)}'`;
            if (!r.transactionDate) throw new Error('Transaction date is required');
            const date = `'${r.transactionDate.toISOString().split('T')[0]}'`;
            const desc = (r.description || '').replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 500);
            const credit = r.creditAmount || 0;
            const debit = r.debitAmount || 0;
            const categoryId = (r as any).categoryId ? `'${String((r as any).categoryId).replace(/'/g, "''")}'` : 'NULL';
            const notes = formatNotes(r) ? `'${formatNotes(r).replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 2000)}'` : 'NULL';
            const personName = r.personName ? `'${(r.personName || '').replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 200)}'` : 'NULL';
            const store = r.store ? `'${(r.store || '').replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 200)}'` : 'NULL';
            const rawData = r.rawData ? `'${(r.rawData || '').replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 5000)}'` : 'NULL';
            const bankCode = r.bankCode ? `'${(r.bankCode || '').replace(/'/g, "''")}'` : 'NULL';
            const transactionId = r.transactionId ? `'${(r.transactionId || '').replace(/'/g, "''")}'` : 'NULL';
            const accountNumber = r.accountNumber ? `'${(r.accountNumber || '').replace(/'/g, "''")}'` : 'NULL';
            const transferType = r.transferType ? `'${(r.transferType || '').replace(/'/g, "''")}'` : 'NULL';
            const upiId = r.upiId ? `'${(r.upiId || '').replace(/'/g, "''")}'` : 'NULL';
            const branch = r.branch ? `'${(r.branch || '').replace(/'/g, "''")}'` : 'NULL';
            const balance = r.balance !== null && r.balance !== undefined ? Number(r.balance) : 'NULL';
            const accountStatementId = accountStatement?.id ? `'${accountStatement.id}'` : 'NULL';
            const receiptUrl = documentRecord ? `'${(`/api/user/documents/${documentRecord.id}/download`).replace(/'/g, "''")}'` : 'NULL';
            const documentId = documentRecord?.id ? `'${documentRecord.id}'` : 'NULL';
            // Data quality flags
            const isPartialData = (r as any).isPartialData ? 1 : 0;
            const hasInvalidDate = (r as any).hasInvalidDate ? 1 : 0;
            const hasZeroAmount = (r as any).hasZeroAmount ? 1 : 0;
            const parsingMethod = (r as any).parsingMethod ? `'${String((r as any).parsingMethod).replace(/'/g, "''")}'` : 'NULL';
            const parsingConfidence = (r as any).parsingConfidence !== null && (r as any).parsingConfidence !== undefined ? Number((r as any).parsingConfidence) : 'NULL';
            
            return `(${id},'${userId}',${date},'${desc}',${credit},${debit},'${r.financialCategory}',${categoryId},${accountStatementId},${bankCode},${transactionId},${accountNumber},${transferType},${personName},${upiId},${branch},${store},${rawData},${balance},${notes},${receiptUrl},0,${isPartialData},${hasInvalidDate},${hasZeroAmount},${parsingMethod},${parsingConfidence},'${now}','${now}',${documentId})`;
          }).join(',');
          
          // Execute raw SQL INSERT IGNORE (fastest method, handles duplicates automatically)
          await (prisma as any).$executeRawUnsafe(`
            INSERT IGNORE INTO transactions 
            (id, userId, transactionDate, description, creditAmount, debitAmount, financialCategory, categoryId, accountStatementId, bankCode, transactionId, accountNumber, transferType, personName, upiId, branch, store, rawData, balance, notes, receiptUrl, isDeleted, isPartialData, hasInvalidDate, hasZeroAmount, parsingMethod, parsingConfidence, createdAt, updatedAt, documentId)
            VALUES ${values}
          `);
          
          // Count credits and debits
          let batchCredit = 0;
          let batchDebit = 0;
          for (const r of chunk) {
            if (r.creditAmount > 0) batchCredit++;
            if (r.debitAmount > 0) batchDebit++;
          }
          
          return {
            inserted: chunk.length, // INSERT IGNORE handles duplicates, so we count attempted
            credit: batchCredit,
            debit: batchDebit,
          };
        } catch (error: any) {
          console.error(`❌ Batch ${batchNum} error:`, error.message);
          // Fallback to Prisma createMany if raw SQL fails
          try {
            const data = chunk.map(r => ({
              userId,
              transactionDate: r.transactionDate,
              description: r.description,
              creditAmount: r.creditAmount,
              debitAmount: r.debitAmount,
              financialCategory: r.financialCategory,
              categoryId: (r as any).categoryId || null,
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
              receiptUrl: documentRecord ? `/api/user/documents/${documentRecord.id}/download` : null,
              // Data quality flags
              isPartialData: (r as any).isPartialData || false,
              hasInvalidDate: (r as any).hasInvalidDate || false,
              hasZeroAmount: (r as any).hasZeroAmount || false,
              parsingMethod: (r as any).parsingMethod || null,
              parsingConfidence: (r as any).parsingConfidence || null,
            }));
            
            const result = await (prisma as any).transaction.createMany({
              data,
              skipDuplicates: true,
            });
            
            let batchCredit = 0;
            let batchDebit = 0;
            for (const r of chunk) {
              if (r.creditAmount > 0) batchCredit++;
              if (r.debitAmount > 0) batchDebit++;
            }
            
            return {
              inserted: result.count,
              credit: batchCredit,
              debit: batchDebit,
            };
          } catch (fallbackError: any) {
            console.error(`❌ Batch ${batchNum} fallback also failed:`, fallbackError.message);
            return { inserted: 0, credit: 0, debit: 0 };
          }
        }
      };
      
      // Process batches in parallel with concurrency control
      const processBatchesInParallel = async () => {
        const results: Array<{ inserted: number; credit: number; debit: number }> = [];
        
        for (let i = 0; i < chunks.length; i += CONCURRENT_BATCHES) {
          const batchGroup = chunks.slice(i, i + CONCURRENT_BATCHES);
          const batchPromises = batchGroup.map((chunk, idx) => 
            processBatch(chunk, i + idx + 1)
          );
          
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
          
          // Aggregate results
          for (const result of batchResults) {
            inserted += result.inserted;
            creditInserted += result.credit;
            debitInserted += result.debit;
          }
          
          console.log(`✅ Processed batches ${i + 1}-${Math.min(i + CONCURRENT_BATCHES, chunks.length)}/${chunks.length}`);
        }
        
        return results;
      };
      
      await processBatchesInParallel();
      
      // Note: Duplicates are handled by INSERT IGNORE, so we can't count them accurately from DB
      // But we already counted existingDuplicates from the in-memory check above
      // The actual DB duplicates (from INSERT IGNORE) would be: toInsert.length - inserted
      // However, we already added existingDuplicates to the duplicates counter, so we don't double-count
      // If INSERT IGNORE prevented some inserts, those are additional duplicates we didn't catch
      const dbDuplicates = Math.max(0, toInsert.length - inserted);
      if (dbDuplicates > 0 && dbDuplicates !== existingDuplicates) {
        console.log(`📊 Additional duplicates caught by INSERT IGNORE: ${dbDuplicates - existingDuplicates}`);
        // Don't add to duplicates counter - existingDuplicates already includes the in-memory check
        // This is just for logging
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
 
    // If background categorization is enabled, fetch inserted transaction IDs and trigger background job
    let backgroundJobStarted = false;
    let insertedTransactionIds: string[] = [];
    
    // Re-evaluate shouldUseBackground based on actual inserted count (not just normalized length)
    // This ensures we trigger background categorization even if some transactions were filtered
    // Check if we determined shouldUseBackground earlier (for immediate categorization skip)
    const earlierShouldUseBackground = categorizeInBackground || 
                                      (normalized.length > 100 && useAICategorization) ||
                                      (normalized.length > 50 && useAICategorization);
    
    const finalShouldUseBackground = categorizeInBackground || 
                                     (inserted > 100 && useAICategorization) ||
                                     (inserted > 50 && useAICategorization && normalized.length > 50) ||
                                     earlierShouldUseBackground; // Use the earlier determination as fallback
    
    console.log(`🔍 Background categorization check: categorizeInBackground=${categorizeInBackground}, inserted=${inserted}, useAICategorization=${useAICategorization}, earlierShouldUseBackground=${earlierShouldUseBackground}, finalShouldUseBackground=${finalShouldUseBackground}`);
    
    // Use the final shouldUseBackground flag, but also check if we actually inserted transactions
    if (finalShouldUseBackground && inserted > 0) {
      try {
        console.log(`🔍 Fetching transaction IDs for background categorization...`);
        
        // Fetch the IDs of recently inserted transactions
        // Use a wider time window (5 minutes) and account statement ID if available
        const timeWindow = new Date(Date.now() - 300000); // 5 minutes ago
        
        let recentTransactions = await prisma.transaction.findMany({
          where: {
            userId,
            isDeleted: false,
            createdAt: {
              gte: timeWindow,
            },
            ...(accountStatement?.id ? { accountStatementId: accountStatement.id } : {}),
          },
          select: { id: true },
          take: inserted * 2, // Get more than expected to account for timing
          orderBy: { createdAt: 'desc' },
        });
        
        // If account statement ID was used but no results, try without it
        if (recentTransactions.length === 0 && accountStatement?.id) {
          console.log(`⚠️ No transactions found with accountStatementId, trying without it...`);
          recentTransactions = await prisma.transaction.findMany({
            where: {
              userId,
              isDeleted: false,
              createdAt: {
                gte: timeWindow,
              },
            },
            select: { id: true },
            take: inserted * 2,
            orderBy: { createdAt: 'desc' },
          });
        }
        
        insertedTransactionIds = recentTransactions.map(t => t.id);
        
        console.log(`📊 Found ${insertedTransactionIds.length} transaction IDs (expected: ${inserted})`);
        
        if (insertedTransactionIds.length > 0) {
          // Trigger background categorization (fire and forget)
          // For server-side calls, we need to pass the auth token
          const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          
          // Get auth token from the original request to pass to background job
          const authToken = request.cookies.get('auth-token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          
          if (authToken) {
            headers['Cookie'] = `auth-token=${authToken.value}`;
          }
          
          console.log(`🚀 Starting background categorization for ${insertedTransactionIds.length} transactions via ${baseUrl}...`);
          
          fetch(`${baseUrl}/api/transactions/categorize-background`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userId,
              transactionIds: insertedTransactionIds,
              batchSize: 100,
            }),
          })
          .then(async (response) => {
            if (response.ok) {
              const result = await response.json().catch(() => ({}));
              console.log(`✅ Background categorization job started successfully:`, result);
              backgroundJobStarted = true;
            } else {
              const errorText = await response.text().catch(() => 'Unknown error');
              console.error(`❌ Background categorization failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
          })
          .catch((error) => {
            console.error('❌ Failed to trigger background categorization:', error);
            // Fallback: If background categorization fails and we have transactions, try immediate categorization
            if (inserted > 0 && inserted <= 200 && useAICategorization && !categorizeInBackground) {
              console.log(`🔄 Background categorization failed, attempting immediate categorization as fallback...`);
              // This will be handled by the existing immediate categorization logic below
            }
          });
        } else {
          console.warn(`⚠️ No transaction IDs found for background categorization (inserted: ${inserted}, timeWindow: ${timeWindow.toISOString()})`);
          // Fallback: If we can't find transaction IDs but have inserted transactions, try immediate categorization
          if (inserted > 0 && inserted <= 200 && useAICategorization && !categorizeInBackground) {
            console.log(`🔄 Transaction IDs not found, attempting immediate categorization as fallback...`);
            // This will be handled by the existing immediate categorization logic below
          }
        }
      } catch (error) {
        console.error('❌ Error starting background categorization:', error);
        // Fallback: If background categorization fails and we have transactions, try immediate categorization
        if (inserted > 0 && inserted <= 200 && useAICategorization && !categorizeInBackground) {
          console.log(`🔄 Background categorization error, attempting immediate categorization as fallback...`);
          // This will be handled by the existing immediate categorization logic below
        }
        // Continue - import was successful
      }
    } else {
      if (!finalShouldUseBackground) {
        console.log(`ℹ️ Background categorization skipped: categorizeInBackground=${categorizeInBackground}, inserted=${inserted}, useAICategorization=${useAICategorization}`);
      }
      if (inserted === 0) {
        console.log(`ℹ️ No transactions inserted, skipping background categorization`);
      }
    }

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
      categorizedCount: finalShouldUseBackground ? 0 : categorizedCount, // 0 if background mode
      deadlinesCreated,
      accountStatement: accountStatement ? {
        id: accountStatement.id,
        openingBalance: accountStatement.openingBalance,
        closingBalance: accountStatement.closingBalance,
        statementStartDate: accountStatement.statementStartDate,
        statementEndDate: accountStatement.statementEndDate,
      } : undefined,
      // Background job info
      ...(finalShouldUseBackground && backgroundJobStarted ? {
        backgroundCategorization: {
          started: true,
          transactionIds: insertedTransactionIds,
          total: insertedTransactionIds.length,
        },
      } : {}),
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

