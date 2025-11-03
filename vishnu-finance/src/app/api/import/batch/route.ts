import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

type ImportType = 'income' | 'expense';

interface ImportRecord {
  title: string;
  amount: number | string;
  category?: string;
  date: string;
  description?: string;
  payment_method?: string;
  notes?: string;
  type?: 'income' | 'expense';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, records } = body as { userId: string; type: ImportType; records: ImportRecord[] };

    if (!userId || !type || !Array.isArray(records)) {
      return NextResponse.json({ error: 'userId, type and records are required' }, { status: 400 });
    }

    if (records.length === 0) {
      return NextResponse.json({ inserted: 0, skipped: 0, duplicates: 0 });
    }

    // Helper to safely parse and validate dates with proper format handling
    const parseDate = (dateInput: string | Date | null | undefined): Date | null => {
      if (!dateInput) return null;
      try {
        let date: Date;
        if (dateInput instanceof Date) {
          date = dateInput;
        } else {
          const dateStr = dateInput.toString().trim();
          // Check if already in ISO format (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
          } else {
            date = new Date(dateStr);
          }
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) return null;
        
        // Validate date is reasonable (year between 2020-2026)
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

    const normalized = records
      .map((r) => {
        // CRITICAL: Use date_iso if available (correctly parsed by strict parser)
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
          type: (r.type as ImportType) || type,
        };
      })
      .filter((r) => r.title && r.amount && r.date && !isNaN(r.date.getTime()));

    if (normalized.length === 0) {
      return NextResponse.json({ error: 'No valid records to import' }, { status: 400 });
    }

    // Deduplicate in-memory by (date,title,amount,type)
    const seen = new Set<string>();
    const unique = normalized.filter((r) => {
      // Safely generate date string, defaulting to empty string if invalid
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

    // Split by type for efficient querying
    const incomeRecs = unique.filter(r => r.type === 'income');
    const expenseRecs = unique.filter(r => r.type === 'expense');

    // Helper to compute min/max date
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

    // Fetch existing once per model within date range and filter in memory
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
        // Chunk createMany to avoid parameter limits
        const chunks: typeof toInsert[] = [];
        for (let i = 0; i < toInsert.length; i += 500) chunks.push(toInsert.slice(i, i + 500));
        for (const chunk of chunks) {
          const data = chunk.map(r => ({
            userId,
            name: r.title,
            amount: r.amount,
            startDate: r.date,
            notes: r.description,
            frequency: 'ONE_TIME',
            categoryId: null,
          }));
          const res = await (prisma as any).incomeSource.createMany({ data });
          const count = res.count ?? data.length;
          inserted += count;
          incomeInserted += count;
        }
      }
    }

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
        for (let i = 0; i < toInsert.length; i += 500) chunks.push(toInsert.slice(i, i + 500));
        for (const chunk of chunks) {
          const data = chunk.map(r => ({
            userId,
            description: r.title,
            amount: r.amount,
            date: r.date,
            notes: r.description,
            isRecurring: false,
            categoryId: null,
          }));
          const res = await (prisma as any).expense.createMany({ data });
          const count = res.count ?? data.length;
          inserted += count;
          expenseInserted += count;
        }
      }
    }

    // Return detailed counts
    return NextResponse.json({ 
      inserted, 
      skipped: unique.length - inserted, 
      duplicates,
      incomeInserted,
      expenseInserted
    });
  } catch (error: any) {
    console.error('❌ BATCH IMPORT ERROR:', error);
    console.error('❌ BATCH IMPORT ERROR STACK:', error?.stack);
    const errorMessage = error?.message || 'Failed to import records';
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}


