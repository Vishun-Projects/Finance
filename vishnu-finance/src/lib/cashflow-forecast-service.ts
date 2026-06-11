import { addDays, endOfMonth, format } from 'date-fns';
import { prisma } from './db';
import { detectRecurringBills } from './recurring-detection';
import { fetchActiveSalaryTakeHome } from './plan-income';

export interface CashflowProjectionPoint {
  date: string;
  label: string;
  projectedBalance: number;
  inflow: number;
  outflow: number;
}

export interface CashflowForecast {
  startingBalance: number;
  endingBalance: number;
  points: CashflowProjectionPoint[];
  recurringMonthlyOutflow: number;
  salaryMonthlyInflow: number;
}

export async function buildCashflowForecast(userId: string): Promise<CashflowForecast> {
  const now = new Date();
  const monthEnd = endOfMonth(now);

  const [salaryMonthlyInflow, recurring, balanceRow] = await Promise.all([
    fetchActiveSalaryTakeHome(userId),
    detectRecurringBills(userId),
    prisma.accountStatement.findFirst({
      where: { userId },
      orderBy: { statementEndDate: 'desc' },
      select: { closingBalance: true },
    }),
  ]);

  const startingBalance = balanceRow?.closingBalance
    ? Number(balanceRow.closingBalance)
    : 0;

  const salaryInflow = salaryMonthlyInflow ?? 0;

  const recurringMonthlyOutflow = recurring
    .filter((r) => r.frequency === 'monthly')
    .reduce((s, r) => s + r.amount, 0);

  const weeklyOutflow = recurring
    .filter((r) => r.frequency === 'weekly')
    .reduce((s, r) => s + r.amount * 4.33, 0);

  const points: CashflowProjectionPoint[] = [];
  let balance = startingBalance;

  // Mid-month salary credit assumption (1st of month)
  const salaryDate = new Date(now.getFullYear(), now.getMonth(), 1);

  for (let d = new Date(now); d <= monthEnd; d = addDays(d, 7)) {
    let inflow = 0;
    let outflow = 0;

    if (format(d, 'yyyy-MM') === format(salaryDate, 'yyyy-MM') && d >= salaryDate) {
      inflow += salaryInflow;
    }
    outflow += recurringMonthlyOutflow / 4 + weeklyOutflow / 4;

    balance = balance + inflow - outflow;
    points.push({
      date: d.toISOString(),
      label: format(d, 'd MMM'),
      projectedBalance: Math.round(balance * 100) / 100,
      inflow: Math.round(inflow * 100) / 100,
      outflow: Math.round(outflow * 100) / 100,
    });
  }

  return {
    startingBalance,
    endingBalance: balance,
    points,
    recurringMonthlyOutflow: Math.round((recurringMonthlyOutflow + weeklyOutflow) * 100) / 100,
    salaryMonthlyInflow: salaryInflow,
  };
}
