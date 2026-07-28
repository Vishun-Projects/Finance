import type { TransactionDetail } from '@/lib/financial-analysis';
import type { ForecastWindow, PaceBreakdown } from './types';

function sumTxnsInRange(
  transactions: TransactionDetail[],
  start: Date,
  end: Date,
): { income: number; expense: number } {
  let income = 0;
  let expense = 0;
  const t0 = start.getTime();
  const t1 = end.getTime();
  for (const tx of transactions) {
    const d = tx.date instanceof Date ? tx.date : new Date(tx.date);
    const t = d.getTime();
    if (Number.isNaN(t) || t < t0 || t > t1) continue;
    if (tx.type === 'INCOME') income += tx.amount;
    else if (tx.type === 'EXPENSE') expense += tx.amount;
  }
  return { income, expense };
}

/** Pace from shared window.periods — one clock for history chips. */
export function computePaceBreakdown(
  transactions: TransactionDetail[],
  window: ForecastWindow,
): PaceBreakdown {
  const rows: PaceBreakdown['periodRows'] = [];

  for (const p of window.periods) {
    const { income, expense } = sumTxnsInRange(transactions, p.start, p.end);
    rows.push({
      label: p.label,
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      net: Math.round((income - expense) * 100) / 100,
    });
  }

  if (rows.length === 0) {
    return { monthlyPace: 0, periodsUsed: 0, totalIncome: 0, totalExpense: 0, periodRows: [] };
  }

  const totalIncome = rows.reduce((s, r) => s + r.income, 0);
  const totalExpense = rows.reduce((s, r) => s + r.expense, 0);
  const periodNet = totalIncome - totalExpense;

  if (window.mode === 'explicit') {
    const days = Math.max(
      1,
      Math.round((window.endDate.getTime() - window.startDate.getTime()) / 86400000) + 1,
    );
    return {
      monthlyPace: Math.round(periodNet * (30.437 / days) * 100) / 100,
      periodsUsed: 1,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      periodRows: rows,
    };
  }

  return {
    monthlyPace: Math.round((periodNet / rows.length) * 100) / 100,
    periodsUsed: rows.length,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    periodRows: rows,
  };
}
