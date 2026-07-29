import { DATA } from '@/features/money-plan/data/money-plan';
import type { BreakdownCategory, BreakdownItem, MoneyPlanData } from '@/features/money-plan/data/money-plan';
import {
  getCurrentMonthRange,
  getPreviousMonthRange,
  parseLocalDateEnd,
  parseLocalDateStart,
} from '@/lib/date-range';
import { computeSalaryCredits } from '@/lib/income-breakdown';
import { prisma } from '@/lib/db';

export type PlanIncomeSource =
  | 'salary_structure'
  | 'last_month_salary'
  | 'transaction_salary'
  | 'default';

export interface ResolvedPlanIncome {
  baseIncome: number;
  source: PlanIncomeSource;
}

export interface PlanIncomeContext {
  /** Scales phase-plan breakdown (active salary → last month received → this month → default). */
  planScale: ResolvedPlanIncome;
  activeSalaryTakeHome: number | null;
  currentMonthSalaryReceived: number;
  lastMonthSalaryReceived: number;
  /** Salary credits used for fundable capacity (this month, else last month). */
  receivedSalaryAnchor: number;
  receivedSalarySource: 'current_month' | 'last_month' | 'none';
}

export const REFERENCE_SALARY = DATA.salary;

export function scalePlanAmount(referenceAmount: number, baseIncome: number): number {
  if (baseIncome <= 0 || REFERENCE_SALARY <= 0) return referenceAmount;
  return Math.round((referenceAmount / REFERENCE_SALARY) * baseIncome);
}

export function resolvePlanBaseIncome(options: {
  salaryTakeHome?: number | null;
  lastMonthSalary?: number | null;
  transactionSalary?: number | null;
}): ResolvedPlanIncome {
  const takeHome = Number(options.salaryTakeHome) || 0;
  if (takeHome > 0) {
    return { baseIncome: takeHome, source: 'salary_structure' };
  }

  const lastMonthSalary = Number(options.lastMonthSalary) || 0;
  if (lastMonthSalary > 0) {
    return { baseIncome: lastMonthSalary, source: 'last_month_salary' };
  }

  const transactionSalary = Number(options.transactionSalary) || 0;
  if (transactionSalary > 0) {
    return { baseIncome: transactionSalary, source: 'transaction_salary' };
  }

  return { baseIncome: REFERENCE_SALARY, source: 'default' };
}

export function planIncomeSourceLabel(source: PlanIncomeSource): string {
  if (source === 'salary_structure') return 'active salary structure';
  if (source === 'last_month_salary') return 'salary received last month';
  if (source === 'transaction_salary') return 'salary credits this month';
  return 'default plan baseline';
}

export function receivedSalarySourceLabel(source: PlanIncomeContext['receivedSalarySource']): string {
  if (source === 'current_month') return 'credited this month';
  if (source === 'last_month') return 'credited last month';
  return 'none yet';
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

export interface ScaledMoneyPlanView {
  baseIncome: number;
  source: PlanIncomeSource;
  referenceSalary: number;
  salary: number;
  activeSalaryTakeHome: number | null;
  currentMonthSalaryReceived: number;
  lastMonthSalaryReceived: number;
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
  received?: Pick<
    PlanIncomeContext,
    'activeSalaryTakeHome' | 'currentMonthSalaryReceived' | 'lastMonthSalaryReceived'
  >,
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
    activeSalaryTakeHome: received?.activeSalaryTakeHome ?? null,
    currentMonthSalaryReceived: received?.currentMonthSalaryReceived ?? 0,
    lastMonthSalaryReceived: received?.lastMonthSalaryReceived ?? 0,
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

export async function fetchSalaryCreditsInRange(
  userId: string,
  startDate: string,
  endDate: string,
  activeMonthlyTakeHome?: number | null,
): Promise<number> {
  try {
    const start = parseLocalDateStart(startDate);
    const end = parseLocalDateEnd(endDate);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        isDeleted: false,
        transactionDate: { gte: start, lte: end },
        creditAmount: { gt: 0 },
      },
      select: {
        creditAmount: true,
        description: true,
        store: true,
        personName: true,
        category: { select: { name: true } },
      },
    });

    return computeSalaryCredits(
      transactions.map((tx) => ({
        creditAmount: Number(tx.creditAmount) || 0,
        categoryName: tx.category?.name ?? null,
        description: tx.description,
        personName: tx.personName,
        store: tx.store,
      })),
      { activeMonthlyTakeHome: activeMonthlyTakeHome ?? null },
    );
  } catch {
    return 0;
  }
}

export async function loadPlanIncomeContext(userId: string): Promise<PlanIncomeContext> {
  const currentRange = getCurrentMonthRange();
  const lastRange = getPreviousMonthRange();

  // Salary + both month credit scans in parallel (salary take-home used only for matching)
  const activeSalaryTakeHomePromise = fetchActiveSalaryTakeHome(userId);

  const [activeSalaryTakeHome, currentMonthSalaryReceived, lastMonthSalaryReceived] =
    await Promise.all([
      activeSalaryTakeHomePromise,
      activeSalaryTakeHomePromise.then((takeHome) =>
        fetchSalaryCreditsInRange(
          userId,
          currentRange.startDate,
          currentRange.endDate,
          takeHome,
        ),
      ),
      activeSalaryTakeHomePromise.then((takeHome) =>
        fetchSalaryCreditsInRange(userId, lastRange.startDate, lastRange.endDate, takeHome),
      ),
    ]);

  const planScale = resolvePlanBaseIncome({
    salaryTakeHome: activeSalaryTakeHome,
    lastMonthSalary: lastMonthSalaryReceived,
    transactionSalary: currentMonthSalaryReceived,
  });

  const receivedSalaryAnchor =
    currentMonthSalaryReceived > 0 ? currentMonthSalaryReceived : lastMonthSalaryReceived;
  const receivedSalarySource: PlanIncomeContext['receivedSalarySource'] =
    currentMonthSalaryReceived > 0
      ? 'current_month'
      : lastMonthSalaryReceived > 0
        ? 'last_month'
        : 'none';

  return {
    planScale,
    activeSalaryTakeHome,
    currentMonthSalaryReceived,
    lastMonthSalaryReceived,
    receivedSalaryAnchor,
    receivedSalarySource,
  };
}

export async function loadScaledMoneyPlanForUser(userId: string): Promise<ScaledMoneyPlanView> {
  const ctx = await loadPlanIncomeContext(userId);
  return buildScaledMoneyPlanView(ctx.planScale.baseIncome, ctx.planScale.source, {
    activeSalaryTakeHome: ctx.activeSalaryTakeHome,
    currentMonthSalaryReceived: ctx.currentMonthSalaryReceived,
    lastMonthSalaryReceived: ctx.lastMonthSalaryReceived,
  });
}
