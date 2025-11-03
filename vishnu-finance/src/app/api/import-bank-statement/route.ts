import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCanonicalName } from '../entity-mappings/route';
import {
  getOrCreateAccountStatement,
  validateOpeningBalance,
  checkStatementContinuity,
  type StatementMetadata,
} from '@/lib/account-statement';

interface ImportRecord {
  title: string;
  amount: number | string;
  category?: string;
  date: string;
  description?: string;
  payment_method?: string;
  notes?: string;
  type?: 'income' | 'expense';
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
}

export async function POST(request: NextRequest) {
  console.log('🏦 Import Bank Statement API: Starting request');
  
  try {
    const body = await request.json();
    const { userId, type, records, metadata } = body as { 
      userId: string; 
      type?: 'income' | 'expense'; 
      records: ImportRecord[];
      metadata?: StatementMetadata;
    };

    if (!userId || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'userId and records are required' }, 
        { status: 400 }
      );
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
          // Calculate totals from records
          const totalDebits = records
            .filter(r => r.type === 'expense' || (!r.type && Number(r.amount) < 0))
            .reduce((sum, r) => sum + Math.abs(Number(r.amount || 0)), 0);
          
          const totalCredits = records
            .filter(r => r.type === 'income' || (!r.type && Number(r.amount) > 0))
            .reduce((sum, r) => sum + Number(r.amount || 0), 0);

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

    // Normalize records with bank-specific fields
    let normalized = records
      .map((r) => {
        // CRITICAL: Use date_iso if available (correctly parsed by strict DD/MM/YYYY parser)
        // Only fall back to date if date_iso is missing
        const dateInput = (r.date_iso || r.date) as string | Date | null | undefined;
        const parsedDate = parseDate(dateInput);
        return {
          title: (r.title || r.description || '').toString().trim(),
          amount: Number(r.amount ?? 0),
          category: (r.category || '').toString().trim() || null,
          date: parsedDate,
          description: (r.description || r.notes || '').toString().trim() || null,
          paymentMethod: (r.payment_method || '').toString().trim() || null,
          type: (r.type as 'income' | 'expense') || type || 'expense',
          // Bank-specific fields
          bankCode: r.bankCode || null,
          transactionId: r.transactionId || null,
          accountNumber: r.accountNumber || null,
          transferType: r.transferType || null,
          personName: r.personName || null,
          upiId: r.upiId || null,
          branch: r.branch || null,
          store: r.store || null,
          commodity: r.commodity || null,
          // Save original raw transaction text from PDF/Excel
          rawData: r.raw || r.rawData || null
        };
      })
      .filter((r) => r.title && r.amount && r.date && !isNaN(r.date.getTime()));

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

    // Deduplicate in-memory by (date, title, amount, type)
    const seen = new Set<string>();
    const unique = normalized.filter((r) => {
      let dateStr = '';
      if (r.date && !isNaN(r.date.getTime())) {
        try {
          dateStr = r.date.toISOString().slice(0, 10);
        } catch {
          dateStr = '';
        }
      }
      const key = `${r.type}|${r.title}|${r.amount}|${dateStr}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let inserted = 0;
    let duplicates = 0;
    let incomeInserted = 0;
    let expenseInserted = 0;

    // Split by type
    const incomeRecs = unique.filter(r => r.type === 'income');
    const expenseRecs = unique.filter(r => r.type === 'expense');

    // Helper to compute date range
    const rangeFor = (recs: typeof unique) => {
      if (!recs.length) return null;
      const validDates = recs
        .map(r => r.date)
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()));
      if (!validDates.length) return null;
      const timestamps = validDates.map(d => d.getTime());
      const min = new Date(Math.min(...timestamps));
      const max = new Date(Math.max(...timestamps));
      return { min, max };
    };

    // Process income records
    if (incomeRecs.length) {
      const range = rangeFor(incomeRecs);
      const existing = await (prisma as any).incomeSource.findMany({
        where: {
          userId,
          isDeleted: false,
          ...(range ? { startDate: { gte: range.min, lte: range.max } } : {}),
        },
        select: { id: true, name: true, amount: true, startDate: true },
      });
      
      const existingSet = new Set(
        existing.map((e: any) => {
          try {
            const date = new Date(e.startDate);
            if (isNaN(date.getTime())) return null;
            return `${e.name}|${Number(e.amount)}|${date.toISOString().slice(0,10)}`;
          } catch {
            return null;
          }
        }).filter((k: string | null): k is string => k !== null)
      );
      
      const toInsert = incomeRecs.filter(r => {
        if (!r.date || isNaN(r.date.getTime())) return false;
        try {
          const key = `${r.title}|${Number(r.amount)}|${r.date.toISOString().slice(0,10)}`;
          return !existingSet.has(key);
        } catch {
          return false;
        }
      });
      
      duplicates += incomeRecs.length - toInsert.length;
      
      if (toInsert.length) {
        const chunks: typeof toInsert[] = [];
        for (let i = 0; i < toInsert.length; i += 500) {
          chunks.push(toInsert.slice(i, i + 500));
        }
        
        for (const chunk of chunks) {
          const data = chunk.map(r => {
            const baseData = {
              userId,
              name: r.title,
              amount: r.amount,
              startDate: r.date,
              notes: formatNotes(r),
              frequency: 'ONE_TIME' as const,
              categoryId: null,
            };
            
            // Always include new fields - they exist in database even if Prisma Client doesn't recognize them
            return {
              ...baseData,
              bankCode: r.bankCode || null,
              transactionId: r.transactionId || null,
              accountNumber: r.accountNumber || null,
              transferType: r.transferType || null,
              personName: r.personName || null,
              upiId: r.upiId || null,
              branch: r.branch || null,
              store: r.store || null,
              // Save original raw transaction text from PDF/Excel (not JSON)
              rawData: r.raw || r.rawData || null
            };
          });
          
          const res = await (prisma as any).incomeSource.createMany({ data });
          const count = res.count ?? data.length;
          inserted += count;
          incomeInserted += count;
        }
      }
    }

    // Process expense records
    if (expenseRecs.length) {
      const range = rangeFor(expenseRecs);
      const existing = await (prisma as any).expense.findMany({
        where: {
          userId,
          isDeleted: false,
          ...(range ? { date: { gte: range.min, lte: range.max } } : {}),
        },
        select: { id: true, description: true, amount: true, date: true },
      });
      
      const existingSet = new Set(
        existing.map((e: any) => {
          try {
            const date = new Date(e.date);
            if (isNaN(date.getTime())) return null;
            return `${e.description}|${Number(e.amount)}|${date.toISOString().slice(0,10)}`;
          } catch {
            return null;
          }
        }).filter((k: string | null): k is string => k !== null)
      );
      
      const toInsert = expenseRecs.filter(r => {
        if (!r.date || isNaN(r.date.getTime())) return false;
        try {
          const key = `${r.title}|${Number(r.amount)}|${r.date.toISOString().slice(0,10)}`;
          return !existingSet.has(key);
        } catch {
          return false;
        }
      });
      
      duplicates += expenseRecs.length - toInsert.length;
      
      if (toInsert.length) {
        const chunks: typeof toInsert[] = [];
        for (let i = 0; i < toInsert.length; i += 500) {
          chunks.push(toInsert.slice(i, i + 500));
        }
        
        for (const chunk of chunks) {
          const data = chunk.map(r => {
            const baseData = {
              userId,
              description: r.title,
              amount: r.amount,
              date: r.date,
              notes: formatNotes(r),
              isRecurring: false,
              categoryId: null,
            };
            
            // Always include new fields - they exist in database even if Prisma Client doesn't recognize them
            return {
              ...baseData,
              bankCode: r.bankCode || null,
              transactionId: r.transactionId || null,
              accountNumber: r.accountNumber || null,
              transferType: r.transferType || null,
              personName: r.personName || null,
              upiId: r.upiId || null,
              branch: r.branch || null,
              store: r.store || null,
              // Save original raw transaction text from PDF/Excel (not JSON)
              rawData: r.raw || r.rawData || null
            };
          });
          
          const res = await (prisma as any).expense.createMany({ data });
          const count = res.count ?? data.length;
          inserted += count;
          expenseInserted += count;
        }
      }
    }

    console.log(`✅ Import Bank Statement: ${inserted} records inserted (${incomeInserted} income, ${expenseInserted} expenses), ${duplicates} duplicates`);

    return NextResponse.json({ 
      inserted, 
      skipped: unique.length - inserted, 
      duplicates,
      incomeInserted,
      expenseInserted,
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

// Helper to check if new schema fields exist using raw SQL
async function checkSchemaForNewFields(modelName: string): Promise<boolean> {
  try {
    // Map model names to table names
    const tableMap: Record<string, string> = {
      'incomeSource': 'income_sources',
      'expense': 'expenses'
    };
    
    const tableName = tableMap[modelName] || modelName;
    
    // Use raw SQL to check if columns exist
    const result = await (prisma as any).$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME IN ('bankCode', 'transactionId', 'accountNumber', 'transferType')
    `, tableName);
    
    const count = result?.[0]?.count || 0;
    return count >= 4; // All 4 fields must exist
  } catch (error) {
    console.log(`⚠️ Error checking schema for ${modelName}:`, error);
    // Default to true since we know columns exist in database
    return true;
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

