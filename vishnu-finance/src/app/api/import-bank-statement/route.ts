import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
  rawData?: string;
}

export async function POST(request: NextRequest) {
  console.log('🏦 Import Bank Statement API: Starting request');
  
  try {
    const body = await request.json();
    const { userId, type, records } = body as { 
      userId: string; 
      type?: 'income' | 'expense'; 
      records: ImportRecord[] 
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
    const normalized = records
      .map((r) => {
        const parsedDate = parseDate(r.date);
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
          rawData: r.rawData || null
        };
      })
      .filter((r) => r.title && r.amount && r.date && !isNaN(r.date.getTime()));

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
        }).filter((k): k is string => k !== null)
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
          // Check if new fields exist in schema
          const hasNewFields = await checkSchemaForNewFields('incomeSource');
          
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
            
            // Add new fields if they exist, otherwise include in rawData
            if (hasNewFields) {
              return {
                ...baseData,
                bankCode: r.bankCode,
                transactionId: r.transactionId,
                accountNumber: r.accountNumber,
                transferType: r.transferType,
                personName: r.personName,
                upiId: r.upiId,
                branch: r.branch,
                store: r.store,
                rawData: r.rawData
              };
            } else {
              // Store bank-specific fields in rawData as JSON
              const bankData = {
                bankCode: r.bankCode,
                transactionId: r.transactionId,
                accountNumber: r.accountNumber,
                transferType: r.transferType,
                personName: r.personName,
                upiId: r.upiId,
                branch: r.branch,
                store: r.store,
                commodity: r.commodity
              };
              return {
                ...baseData,
                rawData: JSON.stringify(bankData),
                store: r.store,
                upiId: r.upiId,
                branch: r.branch,
                personName: r.personName
              };
            }
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
        }).filter((k): k is string => k !== null)
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
          const hasNewFields = await checkSchemaForNewFields('expense');
          
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
            
            if (hasNewFields) {
              return {
                ...baseData,
                bankCode: r.bankCode,
                transactionId: r.transactionId,
                accountNumber: r.accountNumber,
                transferType: r.transferType,
                personName: r.personName,
                upiId: r.upiId,
                branch: r.branch,
                store: r.store,
                rawData: r.rawData
              };
            } else {
              const bankData = {
                bankCode: r.bankCode,
                transactionId: r.transactionId,
                accountNumber: r.accountNumber,
                transferType: r.transferType,
                personName: r.personName,
                upiId: r.upiId,
                branch: r.branch,
                store: r.store,
                commodity: r.commodity
              };
              return {
                ...baseData,
                rawData: JSON.stringify(bankData),
                store: r.store,
                upiId: r.upiId,
                branch: r.branch,
                personName: r.personName
              };
            }
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
      expenseInserted
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

// Helper to check if new schema fields exist
async function checkSchemaForNewFields(modelName: string): Promise<boolean> {
  try {
    // Try to fetch schema info
    const model = (prisma as any)[modelName];
    if (!model) return false;
    
    // Try a test query with new fields - if it fails, fields don't exist
    await model.findMany({
      take: 1,
      select: {
        bankCode: true,
        transactionId: true,
        accountNumber: true,
        transferType: true
      }
    });
    
    return true;
  } catch {
    return false;
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
  
  return null;
}

