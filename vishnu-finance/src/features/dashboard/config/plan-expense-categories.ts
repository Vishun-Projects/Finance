import { DATA, type BreakdownCategory } from '@/features/money-plan/data/money-plan';

export interface PlanExpenseCategory {
  /** Category name stored on transactions */
  name: string;
  /** Phase-plan breakdown line item label */
  lineItem: string;
  bucket: BreakdownCategory;
  color: string;
  isBuffer?: boolean;
}

/** Plan-aligned expense categories — income categories stay separate in seed. */
export const PLAN_EXPENSE_CATEGORIES: PlanExpenseCategory[] = [
  { name: 'Groceries + Home', lineItem: 'Groceries + Home', bucket: 'needs', color: '#2563EB' },
  { name: 'Train Pass', lineItem: 'Train Pass (Diva→Andheri/Ghansoli)', bucket: 'needs', color: '#2563EB' },
  { name: 'Mobile + Internet', lineItem: 'Mobile + Internet', bucket: 'needs', color: '#2563EB' },
  { name: 'Electricity / Water', lineItem: 'Electricity / Water', bucket: 'needs', color: '#2563EB' },
  { name: 'Personal Care', lineItem: 'Personal Care', bucket: 'needs', color: '#2563EB' },
  { name: 'Medical / Pharmacy', lineItem: 'Medical / Pharmacy', bucket: 'needs', color: '#2563EB' },
  { name: 'Family Support', lineItem: 'Family Support', bucket: 'needs', color: '#2563EB' },
  { name: 'Needs Buffer', lineItem: 'Needs Buffer', bucket: 'needs', color: '#64748B', isBuffer: true },

  { name: 'Food Outside', lineItem: 'Food Outside / Swiggy', bucket: 'wants', color: '#7C3AED' },
  { name: 'OTT + Subscriptions', lineItem: 'OTT + Subscriptions', bucket: 'wants', color: '#7C3AED' },
  { name: 'Clothes / Personal', lineItem: 'Clothes / Personal', bucket: 'wants', color: '#7C3AED' },
  { name: 'Entertainment / Outings', lineItem: 'Entertainment / Outings', bucket: 'wants', color: '#7C3AED' },
  { name: 'Friends & Social', lineItem: 'Friends & Social', bucket: 'wants', color: '#7C3AED' },
  { name: 'Misc Buffer', lineItem: 'Misc Buffer', bucket: 'wants', color: '#64748B', isBuffer: true },

  { name: 'EMI', lineItem: 'EMI (existing loan — ends soon)', bucket: 'emi', color: '#DC2626' },

  { name: 'Emergency Fund', lineItem: 'Emergency Fund (IDFC First / Liquid Fund)', bucket: 'invest', color: '#16A34A' },
  { name: 'SIP', lineItem: 'SIP — Nifty 50 Index Fund', bucket: 'invest', color: '#16A34A' },
  { name: 'PPF', lineItem: 'PPF', bucket: 'invest', color: '#16A34A' },
  { name: 'Direct Stocks', lineItem: 'Direct Stocks', bucket: 'invest', color: '#16A34A' },

  { name: 'Parents Health — Mummy', lineItem: 'Parents Health Insurance — Mummy (52)', bucket: 'insurance', color: '#B45309' },
  { name: 'Parents Health — Papa', lineItem: 'Parents Health Insurance — Papa (55)', bucket: 'insurance', color: '#B45309' },
  { name: 'Term Life Insurance', lineItem: 'Term Life Insurance (₹1Cr)', bucket: 'insurance', color: '#B45309' },
  { name: 'Own Health Insurance', lineItem: 'Own Health Insurance (Care Supreme)', bucket: 'insurance', color: '#B45309' },
  { name: 'Personal Accident', lineItem: 'Personal Accident Cover', bucket: 'insurance', color: '#B45309' },
  { name: 'Insurance Buffer', lineItem: 'Insurance Buffer / Renewal Top-up', bucket: 'insurance', color: '#64748B', isBuffer: true },
];

/** Non-plan expense categories (not in monthly breakdown totals). */
export const OTHER_EXPENSE_CATEGORIES = [
  { name: 'Taxes', type: 'EXPENSE' as const, color: '#7C2D12' },
  { name: 'Fees & Charges', type: 'EXPENSE' as const, color: '#DC2626' },
  { name: 'Charity & Donations', type: 'EXPENSE' as const, color: '#059669' },
  { name: 'Education', type: 'EXPENSE' as const, color: '#06B6D4' },
  { name: 'Other Expenses', type: 'EXPENSE' as const, color: '#6B7280' },
];

const NON_PLAN_EXPENSE = new Set(OTHER_EXPENSE_CATEGORIES.map((c) => c.name.toLowerCase()));

export function isNonPlanExpenseCategory(categoryName: string): boolean {
  return NON_PLAN_EXPENSE.has(categoryName.trim().toLowerCase());
}

const categoryByNameLower = new Map(
  PLAN_EXPENSE_CATEGORIES.map((c) => [c.name.toLowerCase(), c]),
);

const lineItemToCategories = new Map<string, string[]>();
for (const cat of PLAN_EXPENSE_CATEGORIES) {
  const list = lineItemToCategories.get(cat.lineItem) ?? [];
  list.push(cat.name);
  lineItemToCategories.set(cat.lineItem, list);
}

/** Old default categories → new plan category (simple name-only remap). */
export const LEGACY_EXPENSE_CATEGORY_MAP: Record<string, string> = {
  Groceries: 'Groceries + Home',
  Housing: 'Groceries + Home',
  Transportation: 'Train Pass',
  Travel: 'Train Pass',
  'Food & Dining': 'Food Outside',
  Food: 'Food Outside',
  Subscriptions: 'OTT + Subscriptions',
  Shopping: 'Clothes / Personal',
  Entertainment: 'Entertainment / Outings',
  'Debt Payment': 'EMI',
  'Loan & EMI': 'EMI',
  Loan: 'EMI',
  EMI: 'EMI',
  Credit: 'EMI',
  Investment: 'SIP',
  Investments: 'SIP',
  Insurance: 'Insurance Buffer',
  Healthcare: 'Medical / Pharmacy',
  Medical: 'Medical / Pharmacy',
  Family: 'Family Support',
  Friend: 'Friends & Social',
  Friends: 'Friends & Social',
  Miscellaneous: 'Misc Buffer',
  General: 'Misc Buffer',
  Other: 'Other Expenses',
  'Other Expenses': 'Other Expenses',
  Uncategorized: 'Misc Buffer',
};

const MOBILE_INTERNET_PATTERNS = [
  'jio',
  'airtel',
  'vi ',
  'vodafone',
  'idea',
  'bsnl',
  'recharge',
  'mobile',
  'internet',
  'broadband',
  'wifi',
  'dth',
  'tata sky',
  'tata play',
  'dish tv',
  'phonepe',
  'gpayrecharge',
];

const ELECTRICITY_WATER_PATTERNS = [
  'electricity',
  'bijli',
  'tata power',
  'bescom',
  'mseb',
  'mahadiscom',
  'adani electricity',
  'adani power',
  'water bill',
  'gas',
  'lpg',
  'indane',
  'bharat gas',
  'hp gas',
  'iocl',
  'indianoil',
];

export function splitLegacyUtilities(text: string): 'Mobile + Internet' | 'Electricity / Water' | 'Needs Buffer' {
  const lower = text.toLowerCase();
  const mobileHit = MOBILE_INTERNET_PATTERNS.some((p) => lower.includes(p));
  const powerHit = ELECTRICITY_WATER_PATTERNS.some((p) => lower.includes(p));

  if (mobileHit && !powerHit) return 'Mobile + Internet';
  if (powerHit && !mobileHit) return 'Electricity / Water';
  if (mobileHit && powerHit) return 'Mobile + Internet';
  return 'Needs Buffer';
}

export function getPlanCategoryByName(categoryName: string): PlanExpenseCategory | undefined {
  return categoryByNameLower.get(categoryName.trim().toLowerCase());
}

export function mapCategoryNameToLineItem(categoryName: string): string | null {
  const direct = getPlanCategoryByName(categoryName);
  if (direct) return direct.lineItem;

  const legacyTarget = LEGACY_EXPENSE_CATEGORY_MAP[categoryName.trim()];
  if (legacyTarget) {
    const planCat = getPlanCategoryByName(legacyTarget);
    return planCat?.lineItem ?? legacyTarget;
  }

  const legacyLower = LEGACY_EXPENSE_CATEGORY_MAP[
    Object.keys(LEGACY_EXPENSE_CATEGORY_MAP).find(
      (k) => k.toLowerCase() === categoryName.trim().toLowerCase(),
    ) ?? ''
  ];
  if (legacyLower) {
    const planCat = getPlanCategoryByName(legacyLower);
    return planCat?.lineItem ?? legacyLower;
  }

  return null;
}

export function mapCategoryNameToBucket(categoryName: string): BreakdownCategory {
  const planCat = getPlanCategoryByName(categoryName);
  if (planCat) return planCat.bucket;

  const legacyTarget = LEGACY_EXPENSE_CATEGORY_MAP[categoryName.trim()];
  if (legacyTarget) {
    const mapped = getPlanCategoryByName(legacyTarget);
    if (mapped) return mapped.bucket;
  }

  if (categoryName.trim().toLowerCase() === 'utilities') {
    return 'needs';
  }

  return 'wants';
}

export function isBufferLineItem(label: string): boolean {
  return label.includes('Buffer');
}

export function getCategoryNamesForLineItem(lineItemLabel: string): string[] {
  const names = new Set<string>(lineItemToCategories.get(lineItemLabel) ?? []);

  for (const [legacy, target] of Object.entries(LEGACY_EXPENSE_CATEGORY_MAP)) {
    const planCat = getPlanCategoryByName(target);
    if (planCat?.lineItem === lineItemLabel) {
      names.add(legacy);
    }
  }

  if (lineItemLabel === 'Mobile + Internet') {
    names.add('Utilities');
  }

  return [...names];
}

export function getBufferLineItemForBucket(bucket: BreakdownCategory): string | undefined {
  return DATA.breakdown.find((item) => item.cat === bucket && item.label.includes('Buffer'))?.label;
}

export function resolveTransactionLineItem(input: {
  categoryName: string | null | undefined;
  description?: string | null;
  store?: string | null;
  personName?: string | null;
}): string | null {
  const categoryName = (input.categoryName ?? 'Uncategorized').trim();
  if (isNonPlanExpenseCategory(categoryName)) return null;

  const text = `${input.description ?? ''} ${input.store ?? ''} ${input.personName ?? ''}`.toLowerCase();

  const FOOD_STORE_PATTERNS = [
    '7 eleven',
    '7eleven',
    '7-eleven',
    'mcdonalds',
    'kfc',
    'dominos',
    'starbucks',
    'cafe',
    'restaurant',
    'swiggy',
    'zomato',
  ];
  if (FOOD_STORE_PATTERNS.some((p) => text.includes(p))) {
    return mapCategoryNameToLineItem('Food Outside');
  }

  const MEDICAL_PATTERNS = [
    'medical',
    'pharmacy',
    'chemist',
    'hospital',
    'clinic',
    'medicine',
    'dawai',
    'apollo',
    'medplus',
    '1mg',
    'pharmeasy',
  ];
  if (MEDICAL_PATTERNS.some((p) => text.includes(p))) {
    return mapCategoryNameToLineItem('Medical / Pharmacy');
  }

  if (categoryName.toLowerCase() === 'utilities') {
    return mapCategoryNameToLineItem(splitLegacyUtilities(text));
  }

  if (['investment', 'investments'].includes(categoryName.toLowerCase())) {
    if (/(ppf|public provident)/.test(text)) return mapCategoryNameToLineItem('PPF');
    if (/(zerodha|groww|upstox|stock|equity|demat)/.test(text)) {
      return mapCategoryNameToLineItem('Direct Stocks');
    }
    if (/(emergency|liquid|idfc)/.test(text)) return mapCategoryNameToLineItem('Emergency Fund');
    if (/(sip|mutual|nifty|index fund)/.test(text)) return mapCategoryNameToLineItem('SIP');
    return mapCategoryNameToLineItem('SIP');
  }

  if (categoryName.toLowerCase() === 'insurance') {
    if (/papa|father/.test(text)) return mapCategoryNameToLineItem('Parents Health — Papa');
    if (/mummy|mother|mom/.test(text)) return mapCategoryNameToLineItem('Parents Health — Mummy');
    if (/(term|life|max life|hdfc life)/.test(text)) return mapCategoryNameToLineItem('Term Life Insurance');
    if (/(accident|pa cover)/.test(text)) return mapCategoryNameToLineItem('Personal Accident');
    if (/(care supreme|own health|health)/.test(text)) return mapCategoryNameToLineItem('Own Health Insurance');
    return mapCategoryNameToLineItem('Insurance Buffer');
  }

  return mapCategoryNameToLineItem(categoryName);
}

export function assignLineItemForUnmapped(categoryName: string): string | null {
  const bucket = mapCategoryNameToBucket(categoryName);
  return getBufferLineItemForBucket(bucket) ?? null;
}

export const PLAN_EXPENSE_CATEGORY_NAMES = PLAN_EXPENSE_CATEGORIES.map((c) => c.name);

/** Options for inline category picker in dashboard breakdown drill-down. */
export const PLAN_CATEGORY_PICKER_GROUPS: Array<{
  label: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    label: 'Needs',
    options: PLAN_EXPENSE_CATEGORIES.filter((c) => c.bucket === 'needs').map((c) => ({
      value: c.name,
      label: c.lineItem === c.name ? c.name : `${c.name}`,
    })),
  },
  {
    label: 'Wants',
    options: PLAN_EXPENSE_CATEGORIES.filter((c) => c.bucket === 'wants').map((c) => ({
      value: c.name,
      label: c.name,
    })),
  },
  {
    label: 'EMI',
    options: PLAN_EXPENSE_CATEGORIES.filter((c) => c.bucket === 'emi').map((c) => ({
      value: c.name,
      label: c.name,
    })),
  },
  {
    label: 'Investments',
    options: PLAN_EXPENSE_CATEGORIES.filter((c) => c.bucket === 'invest').map((c) => ({
      value: c.name,
      label: c.name,
    })),
  },
  {
    label: 'Insurance',
    options: PLAN_EXPENSE_CATEGORIES.filter((c) => c.bucket === 'insurance').map((c) => ({
      value: c.name,
      label: c.name,
    })),
  },
  {
    label: 'Other',
    options: OTHER_EXPENSE_CATEGORIES.map((c) => ({ value: c.name, label: c.name })),
  },
];

export const ALL_PLAN_PICKER_VALUES = PLAN_CATEGORY_PICKER_GROUPS.flatMap((g) =>
  g.options.map((o) => o.value),
);

/** Quick guide shown in breakdown drill-down — where common spend types belong. */
export const PLAN_CATEGORY_GUIDE: Array<{ examples: string; category: string }> = [
  { examples: 'Pharmacy, clinic, hospital', category: 'Medical / Pharmacy' },
  { examples: 'Money to parents / relatives', category: 'Family Support' },
  { examples: 'UPI to friends, splitting bills', category: 'Friends & Social' },
  { examples: 'Swiggy, restaurants, 7 Eleven', category: 'Food Outside' },
  { examples: 'Salon, toiletries', category: 'Personal Care' },
  { examples: 'Not sure / one-off', category: 'Needs Buffer or Misc Buffer' },
];
