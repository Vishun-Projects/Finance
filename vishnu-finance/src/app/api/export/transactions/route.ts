import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/db';

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function transactionsToCsv(
  rows: Array<{
    transactionDate: Date;
    description: string | null;
    financialCategory: string;
    debitAmount: unknown;
    creditAmount: unknown;
    store: string | null;
    personName: string | null;
    category: { name: string } | null;
  }>
): string {
  const header = [
    'Date',
    'Description',
    'Category',
    'Type',
    'Debit',
    'Credit',
    'Store',
    'Person',
  ].join(',');
  const lines = rows.map((row) =>
    [
      row.transactionDate.toISOString().slice(0, 10),
      escapeCsvCell(row.description),
      escapeCsvCell(row.category?.name ?? ''),
      row.financialCategory,
      escapeCsvCell(Number(row.debitAmount) || ''),
      escapeCsvCell(Number(row.creditAmount) || ''),
      escapeCsvCell(row.store),
      escapeCsvCell(row.personName),
    ].join(',')
  );
  return [header, ...lines].join('\n');
}

export const GET = withAuth(async (request, user) => {
  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') ?? 'csv';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const dateFilter =
    startDate && endDate
      ? {
          gte: new Date(startDate),
          lte: new Date(endDate),
        }
      : undefined;

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      isDeleted: false,
      ...(dateFilter ? { transactionDate: dateFilter } : {}),
    },
    orderBy: { transactionDate: 'desc' },
    select: {
      transactionDate: true,
      description: true,
      financialCategory: true,
      debitAmount: true,
      creditAmount: true,
      store: true,
      personName: true,
      category: { select: { name: true } },
    },
    take: 10000,
  });

  if (format === 'json') {
    return NextResponse.json({ transactions, count: transactions.length });
  }

  const csv = transactionsToCsv(transactions);
  const filename = `vishnu-finance-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
