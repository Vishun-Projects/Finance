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

    const normalized = records
      .map((r) => ({
        title: (r.title || r.description || '').toString().trim(),
        amount: Number(r.amount ?? 0),
        category: (r.category || '').toString().trim() || null,
        date: r.date ? new Date(r.date) : null,
        description: (r.description || r.notes || '').toString().trim() || null,
        paymentMethod: (r.payment_method || '').toString().trim() || null,
        type: (r.type as ImportType) || type,
      }))
      .filter((r) => r.title && r.amount && r.date);

    if (normalized.length === 0) {
      return NextResponse.json({ error: 'No valid records to import' }, { status: 400 });
    }

    // Deduplicate in-memory by (date,title,amount,type)
    const seen = new Set<string>();
    const unique = normalized.filter((r) => {
      const key = `${r.type}|${r.title}|${r.amount}|${r.date?.toISOString().slice(0, 10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let inserted = 0;
    let duplicates = 0;

    // Split by type for efficient querying
    const incomeRecs = unique.filter(r => r.type === 'income');
    const expenseRecs = unique.filter(r => r.type === 'expense');

    // Helper to compute min/max date
    const rangeFor = (recs: typeof unique) => {
      if (!recs.length) return null;
      const dates = recs.map(r => r.date as Date);
      const min = new Date(Math.min.apply(null, dates as any));
      const max = new Date(Math.max.apply(null, dates as any));
      return { min, max };
    };

    // Fetch existing once per model within date range and filter in memory
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
        existing.map((e: any) => `${e.name}|${Number(e.amount)}|${new Date(e.startDate).toISOString().slice(0,10)}`)
      );
      const toInsert = incomeRecs.filter(r => !existingSet.has(`${r.title}|${Number(r.amount)}|${(r.date as Date).toISOString().slice(0,10)}`));
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
          inserted += res.count ?? data.length;
        }
      }
    }

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
        existing.map((e: any) => `${e.description}|${Number(e.amount)}|${new Date(e.date).toISOString().slice(0,10)}`)
      );
      const toInsert = expenseRecs.filter(r => !existingSet.has(`${r.title}|${Number(r.amount)}|${(r.date as Date).toISOString().slice(0,10)}`));
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
          inserted += res.count ?? data.length;
        }
      }
    }

    return NextResponse.json({ inserted, skipped: unique.length - inserted, duplicates });
  } catch (error) {
    console.error('❌ BATCH IMPORT ERROR:', error);
    return NextResponse.json({ error: 'Failed to import records' }, { status: 500 });
  }
}


