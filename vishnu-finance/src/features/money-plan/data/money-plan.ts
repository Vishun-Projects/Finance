import type { CategoryVariant } from '@/design/tokens';

export type BreakdownCategory = 'needs' | 'wants' | 'emi' | 'invest' | 'insurance';

export interface BreakdownItem {
  label: string;
  amount: number;
  cat: BreakdownCategory;
}

export interface BudgetCategory {
  label: string;
  amount: number;
  pct: number;
  variant: CategoryVariant;
}

export interface MoneyPlanData {
  salary: number;
  age: number;
  parents: { mummy: number; papa: number };
  budget: {
    needs: BudgetCategory;
    wants: BudgetCategory;
    emi: BudgetCategory;
    investments: BudgetCategory;
    insurance: BudgetCategory;
  };
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
  sipProjection40: string;
  sipProjection30: string;
  postEmiSip: number;
  ppfRate: string;
  ppfMax: string;
  maxLifeCSR: string;
  hdfcLifeCSR: string;
  tataAIACSR: string;
  careCSR: string;
  starCSR: string;
  nivaBupaCSR: string;
  hdrcErgoCSR: string;
  insuranceTotal: number;
  investTotal: number;
}

const baseData = {
  salary: 46000,
  age: 23,
  parents: { mummy: 52, papa: 55 },

  budget: {
    needs: { label: 'Needs', amount: 10400, pct: 22.6, variant: 'needs' as const },
    wants: { label: 'Wants', amount: 9200, pct: 20.0, variant: 'wants' as const },
    emi: { label: 'EMI', amount: 3000, pct: 6.5, variant: 'emi' as const },
    investments: { label: 'Investments', amount: 15500, pct: 33.7, variant: 'invest' as const },
    insurance: { label: 'Insurance', amount: 7900, pct: 17.2, variant: 'insurance' as const },
  },

  breakdown: [
    { label: 'Groceries + Home', amount: 2500, cat: 'needs' as const },
    { label: 'Train Pass (Diva→Andheri/Ghansoli)', amount: 1500, cat: 'needs' as const },
    { label: 'Mobile + Internet', amount: 500, cat: 'needs' as const },
    { label: 'Electricity / Water', amount: 500, cat: 'needs' as const },
    { label: 'Personal Care', amount: 500, cat: 'needs' as const },
    { label: 'Medical / Pharmacy', amount: 500, cat: 'needs' as const },
    { label: 'Family Support', amount: 1000, cat: 'needs' as const },
    { label: 'Needs Buffer', amount: 3400, cat: 'needs' as const },
    { label: 'Food Outside / Swiggy', amount: 2000, cat: 'wants' as const },
    { label: 'OTT + Subscriptions', amount: 500, cat: 'wants' as const },
    { label: 'Clothes / Personal', amount: 1500, cat: 'wants' as const },
    { label: 'Entertainment / Outings', amount: 2000, cat: 'wants' as const },
    { label: 'Friends & Social', amount: 800, cat: 'wants' as const },
    { label: 'Misc Buffer', amount: 2400, cat: 'wants' as const },
    { label: 'EMI (existing loan — ends soon)', amount: 3000, cat: 'emi' as const },
    { label: 'Emergency Fund (IDFC First / Liquid Fund)', amount: 3000, cat: 'invest' as const },
    { label: 'SIP — Nifty 50 Index Fund', amount: 8000, cat: 'invest' as const },
    { label: 'PPF', amount: 3000, cat: 'invest' as const },
    { label: 'Direct Stocks', amount: 1500, cat: 'invest' as const },
    { label: 'Parents Health Insurance — Mummy (52)', amount: 1700, cat: 'insurance' as const },
    { label: 'Parents Health Insurance — Papa (55)', amount: 2100, cat: 'insurance' as const },
    { label: 'Term Life Insurance (₹1Cr)', amount: 625, cat: 'insurance' as const },
    { label: 'Own Health Insurance (Care Supreme)', amount: 700, cat: 'insurance' as const },
    { label: 'Personal Accident Cover', amount: 250, cat: 'insurance' as const },
    { label: 'Insurance Buffer / Renewal Top-up', amount: 525, cat: 'insurance' as const },
  ],

  sip: 8000,
  ppf: 3000,
  stocks: 1500,
  emergency: 3000,
  termPremium: 625,
  ownHealth: 700,
  pacover: 250,
  parentsMummy: 1700,
  parentsPapa: 2100,
  insuranceBuffer: 525,
  shortTermFd: 1500,

  sipProjection40: '₹1.2–1.5 Cr',
  sipProjection30: '~₹25L',
  postEmiSip: 11000,

  ppfRate: '7.1%',
  ppfMax: '₹2L/yr',

  maxLifeCSR: '99.62%',
  hdfcLifeCSR: '99.55%',
  tataAIACSR: '99.40%',
  careCSR: '93.13%',
  starCSR: '~85%',
  nivaBupaCSR: '91.62%',
  hdrcErgoCSR: '96.71%',
};

export const DATA: MoneyPlanData = {
  ...baseData,
  insuranceTotal:
    baseData.parentsMummy +
    baseData.parentsPapa +
    baseData.termPremium +
    baseData.ownHealth +
    baseData.pacover +
    baseData.insuranceBuffer,
  investTotal:
    baseData.emergency + baseData.sip + baseData.ppf + baseData.stocks,
};

export const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

export { categoryColorVar as CAT_COLOR_VAR } from '@/design/tokens';

export const CAT_LABEL: Record<BreakdownCategory, string> = {
  needs: 'Needs',
  wants: 'Wants',
  emi: 'EMI',
  invest: 'Invest',
  insurance: 'Insurance',
};

export const budgetBars = Object.values(DATA.budget);
