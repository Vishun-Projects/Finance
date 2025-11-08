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
    const { userId, records, metadata, document } = body as { 
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
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            date = new Date(dateStr + 'T00:00:00');
          } else {
            date = new Date(dateStr);
          }
        }
        
        if (isNaN(date.getTime())) return null;
        
        const year = date.getFullYear();
        if (year < 2020 || year > 2026) {
          console.warn(`⚠️ Invalid date year: ${year} for date: ${dateInput}`);
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
        let debitAmount = Number(r.debit || 0);
        let creditAmount = Number(r.credit || 0);
        
        // If credit/debit not provided, infer from amount and legacy type
        if (debitAmount === 0 && creditAmount === 0) {
          const amount = Number(r.amount || 0);
          if (r.type === 'income' || (!r.type && amount > 0)) {
            creditAmount = Math.abs(amount);
            debitAmount = 0;
          } else {
            debitAmount = Math.abs(amount);
            creditAmount = 0;
          }
        }
        
        // Determine financial category (default based on debit/credit)
        let financialCategory: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER' = 'EXPENSE';
        if (creditAmount > 0) {
          financialCategory = 'INCOME'; // Default credits to INCOME
        } else if (debitAmount > 0) {
          financialCategory = 'EXPENSE'; // Default debits to EXPENSE
        }
        
        // Heuristic: If transferType suggests transfer, update category
        if (r.transferType && (
          r.transferType.toLowerCase().includes('transfer') ||
          r.transferType.toLowerCase().includes('neft') ||
          r.transferType.toLowerCase().includes('rtgs') ||
          r.transferType.toLowerCase().includes('imps')
        )) {
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
      .filter((r) => r.description && (r.creditAmount > 0 || r.debitAmount > 0) && r.transactionDate && !isNaN(r.transactionDate.getTime()));

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

    // Deduplicate in-memory by (date, description, creditAmount, debitAmount)
    const seen = new Set<string>();
    const unique = normalized.filter((r) => {
      let dateStr = '';
      if (r.transactionDate && !isNaN(r.transactionDate.getTime())) {
        try {
          dateStr = r.transactionDate.toISOString().slice(0, 10);
        } catch {
          dateStr = '';
        }
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
      existing = await (prisma as any).transaction.findMany({
        where: {
          userId,
          isDeleted: false,
          ...(range ? { transactionDate: { gte: range.min, lte: range.max } } : {}),
        },
        select: { 
          id: true, 
          description: true, 
          creditAmount: true, 
          debitAmount: true, 
          transactionDate: true 
        },
      });
    } catch (error: any) {
      // Transaction table doesn't exist yet, skip deduplication
      console.log('⚠️ Transaction table not available, skipping deduplication check');
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
    
    if (toInsert.length) {
      // Check if Transaction table exists before inserting
      try {
        await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
      } catch (error: any) {
        // Transaction table doesn't exist, fall back to Expense/IncomeSource
        console.log('⚠️ Transaction table not available, falling back to Expense/IncomeSource');
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
              categoryId: null,
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

            // Use INSERT IGNORE approach - insert only if not duplicate
            // For MySQL, we'll catch duplicate errors and skip those records
            let chunkInserted = 0;
            let chunkDuplicates = 0;

            // Insert one by one to handle duplicates gracefully
            const insertedRecords: typeof data = [];
            for (const record of data) {
              try {
                await tx.transaction.create({ data: record });
                chunkInserted++;
                insertedRecords.push(record);
              } catch (error: any) {
                // Check if it's a duplicate key error (code 1062 in MySQL, P2002 in Prisma)
                if (error.code === 'P2002' || error.code === 1062 || 
                    (error.message && (error.message.includes('Duplicate') || error.message.includes('UNIQUE') || error.message.includes('Unique constraint')))) {
                  chunkDuplicates++;
                  duplicates++;
                } else {
                  // Re-throw if it's a different error
                  throw error;
                }
              }
            }

            inserted += chunkInserted;
            duplicates += chunkDuplicates;
            
            // Count credits and debits for successfully inserted records
            for (const record of insertedRecords) {
              if (record.creditAmount > 0) creditInserted++;
              if (record.debitAmount > 0) debitInserted++;
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
              categoryId: null,
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

