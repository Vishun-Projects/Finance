import { DATA } from '@/features/money-plan/data/money-plan';
import type { BreakdownCategory, BreakdownItem, MoneyPlanData } from '@/features/money-plan/data/money-plan';
import { prisma } from '@/lib/db';

export type PlanIncomeSource = 'salary_structure' | 'transaction_salary' | 'default';

export interface ResolvedPlanIncome {
  baseIncome: number;
  source: PlanIncomeSource;
}

export const REFERENCE_SALARY = DATA.salary;

export function scalePlanAmount(referenceAmount: number, baseIncome: number): number {
  if (baseIncome <= 0 || REFERENCE_SALARY <= 0) return referenceAmount;
  return Math.round((referenceAmount / REFERENCE_SALARY) * baseIncome);
}

export function resolvePlanBaseIncome(options: {
  salaryTakeHome?: number | null;
  transactionSalary?: number | null;
}): ResolvedPlanIncome {
  const takeHome = Number(options.salaryTakeHome) || 0;
  if (takeHome > 0) {
    return { baseIncome: takeHome, source: 'salary_structure' };
  }

  const transactionSalary = Number(options.transactionSalary) || 0;
  if (transactionSalary > 0) {
    return { baseIncome: transactionSalary, source: 'transaction_salary' };
  }

  return { baseIncome: REFERENCE_SALARY, source: 'default' };
}

export function buildScaledPlanAmounts(baseIncome: number): {
  lineItemPlanned: Map<string, number>;
  bucketPlanned: Map<BreakdownCategory, number>;
  plannedTotal: number;
} {
  const lineItemPlanned = new Map<string, number>();
  const bucketPlanned = new Map<BreakdownCategory, number>();
  let plannedTotal = 0;

  for (const item of DATA.breakdown) {
    const planned = scalePlanAmount(item.amount, baseIncome);
    lineItemPlanned.set(item.label, planned);
    bucketPlanned.set(item.cat, (bucketPlanned.get(item.cat) || 0) + planned);
    plannedTotal += planned;
  }

  return { lineItemPlanned, bucketPlanned, plannedTotal };
}

export function planIncomeSourceLabel(source: PlanIncomeSource): string {
  if (source === 'salary_structure') return 'salary structure';
  if (source === 'transaction_salary') return 'salary credits this month';
  return 'default plan baseline';
}

export interface ScaledMoneyPlanView {
  baseIncome: number;
  source: PlanIncomeSource;
  referenceSalary: number;
  salary: number;
  age: number;
  parents: MoneyPlanData['parents'];
  budget: MoneyPlanData['budget'];
  breakdown: BreakdownItem[];
  sip: number;
  ppf: number;
  stocks: number;
  emergency: number;
  termPremium: number;
  ownHealth: number;
  pacover: number;
  parentsMummy: number;
  parentsPapa: number;
  insuranceBuffer: number;
  shortTermFd: number;
  postEmiSip: number;
  insuranceTotal: number;
  investTotal: number;
  plannedTotal: number;
  sipProjection40: string;
  sipProjection30: string;
  ppfRate: string;
  ppfMax: string;
}

export function buildScaledMoneyPlanView(
  baseIncome: number,
  source: PlanIncomeSource = 'default',
): ScaledMoneyPlanView {
  const scale = (amount: number) => scalePlanAmount(amount, baseIncome);
  const scaled = buildScaledPlanAmounts(baseIncome);

  const breakdown = DATA.breakdown.map((item) => ({
    ...item,
    amount: scaled.lineItemPlanned.get(item.label) || 0,
  }));

  const budget: MoneyPlanData['budget'] = {
    needs: { ...DATA.budget.needs, amount: scaled.bucketPlanned.get('needs') || scale(DATA.budget.needs.amount) },
    wants: { ...DATA.budget.wants, amount: scaled.bucketPlanned.get('wants') || scale(DATA.budget.wants.amount) },
    emi: { ...DATA.budget.emi, amount: scaled.bucketPlanned.get('emi') || scale(DATA.budget.emi.amount) },
    investments: {
      ...DATA.budget.investments,
      amount: scaled.bucketPlanned.get('invest') || scale(DATA.budget.investments.amount),
    },
    insurance: {
      ...DATA.budget.insurance,
      amount: scaled.bucketPlanned.get('insurance') || scale(DATA.budget.insurance.amount),
    },
  };

  return {
    baseIncome,
    source,
    referenceSalary: REFERENCE_SALARY,
    salary: baseIncome,
    age: DATA.age,
    parents: DATA.parents,
    budget,
    breakdown,
    sip: scale(DATA.sip),
    ppf: scale(DATA.ppf),
    stocks: scale(DATA.stocks),
    emergency: scale(DATA.emergency),
    termPremium: scale(DATA.termPremium),
    ownHealth: scale(DATA.ownHealth),
    pacover: scale(DATA.pacover),
    parentsMummy: scale(DATA.parentsMummy),
    parentsPapa: scale(DATA.parentsPapa),
    insuranceBuffer: scale(DATA.insuranceBuffer),
    shortTermFd: scale(DATA.shortTermFd),
    postEmiSip: scale(DATA.postEmiSip),
    insuranceTotal: scale(DATA.insuranceTotal),
    investTotal: scale(DATA.investTotal),
    plannedTotal: scaled.plannedTotal,
    sipProjection40: DATA.sipProjection40,
    sipProjection30: DATA.sipProjection30,
    ppfRate: DATA.ppfRate,
    ppfMax: DATA.ppfMax,
  };
}

export const DEFAULT_SCALED_PLAN = buildScaledMoneyPlanView(REFERENCE_SALARY);

export async function fetchActiveSalaryTakeHome(userId: string): Promise<number | null> {
  try {
    const salary = await (prisma as any).salaryStructure.findFirst({
      where: { userId, isActive: true },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    });
    if (!salary) return null;

    const allowances =
      typeof salary.allowances === 'string'
        ? JSON.parse(salary.allowances || '{}')
        : salary.allowances || {};
    const deductions =
      typeof salary.deductions === 'string'
        ? JSON.parse(salary.deductions || '{}')
        : salary.deductions || {};
    const totalAllowances = Object.values(allowances).reduce(
      (sum: number, val: unknown) => sum + (Number(val) || 0),
      0,
    );
    const totalDeductions = Object.values(deductions).reduce(
      (sum: number, val: unknown) => sum + (Number(val) || 0),
      0,
    );

    const takeHome = Number(salary.baseSalary) / 12 + totalAllowances - totalDeductions;
    return takeHome > 0 ? takeHome : null;
  } catch {
    return null;
  }
}

export async function loadScaledMoneyPlanForUser(userId: string): Promise<ScaledMoneyPlanView> {
  const takeHome = await fetchActiveSalaryTakeHome(userId);
  const resolved = resolvePlanBaseIncome({ salaryTakeHome: takeHome });
  return buildScaledMoneyPlanView(resolved.baseIncome, resolved.source);
}
