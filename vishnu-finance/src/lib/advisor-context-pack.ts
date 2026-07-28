import { mapCategoryToBucket } from '@/features/dashboard/config/category-bucket-map';
import type { DashboardBootstrap } from '@/features/dashboard/types';
import type { BreakdownCategory } from '@/features/money-plan/data/money-plan';
import type { PlanBucketFocus } from '@/lib/advisor-query-filters';
import { filterTransactionsByPlanBucket } from '@/lib/advisor-query-filters';
import type { FinancialSummary, TransactionDetail } from '@/lib/financial-analysis';
import type { IncomeBudgetBucketDto } from '@/lib/income-budget-service';
import { formatRupees } from '@/lib/utils';

const MAX_TXN_ROWS = 900;
const MAX_FOCUS_TXN_ROWS = 400;
const MAX_PEOPLE = 40;
const MAX_STORES = 40;

function tsvEscape(value: string | number | null | undefined): string {
  if (value == null) return '';
  return String(value).replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim();
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function bucketForCategory(
  categoryName: string | undefined,
  budgetBuckets: IncomeBudgetBucketDto[],
): string {
  if (!categoryName) return 'unmapped';
  const breakdown = mapCategoryToBucket(categoryName);
  const userBucket = budgetBuckets.find((b) => b.mapFrom.includes(breakdown));
  return userBucket?.label ?? breakdown;
}

function rollupPeopleOrStores(
  transactions: TransactionDetail[],
  field: 'personName' | 'store',
  limit: number,
): Array<{ name: string; amount: number; count: number }> {
  const map = new Map<string, { amount: number; count: number }>();
  for (const tx of transactions) {
    if (tx.type !== 'EXPENSE') continue;
    const name = tx[field]?.trim();
    if (!name) continue;
    const cur = map.get(name) || { amount: 0, count: 0 };
    cur.amount += tx.amount;
    cur.count += 1;
    map.set(name, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, amount: v.amount, count: v.count }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

function formatTxnTsv(
  transactions: TransactionDetail[],
  budgetBuckets: IncomeBudgetBucketDto[],
  limit: number,
): string {
  const rows = [...transactions]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-limit);
  const lines = ['date\ttype\tamount\tcategory\tplan_bucket\tdescription\tstore\tperson'];
  for (const tx of rows) {
    const category = tx.category?.name ?? '';
    lines.push(
      [
        isoDate(tx.date),
        tx.type,
        tx.amount,
        tsvEscape(category),
        tsvEscape(bucketForCategory(category || undefined, budgetBuckets)),
        tsvEscape((tx.description || '').slice(0, 80)),
        tsvEscape(tx.store),
        tsvEscape(tx.personName),
      ].join('\t'),
    );
  }
  return lines.join('\n');
}

export interface AdvisorFocusMeta {
  bucket?: PlanBucketFocus;
  keyword?: string;
  matchingCount?: number;
  matchingExpenseTotal?: number;
  matchingIncomeTotal?: number;
}

/**
 * Compact structured finance pack for the model: plan buckets, category→bucket map,
 * people/stores, and transaction TSV. Focus is annotated — full month data stays.
 */
export function buildAdvisorContextPack(args: {
  dashboard: DashboardBootstrap;
  budgetBuckets: IncomeBudgetBucketDto[];
  financialSummary: FinancialSummary;
  focus?: AdvisorFocusMeta;
}): string {
  const { dashboard, budgetBuckets, financialSummary, focus } = args;
  const { adherence, disciplineSummary, planIncomeContext, stats } = dashboard;
  const { currentMonthStats } = stats;
  const transactions = financialSummary.transactions;

  const lines: string[] = [
    '=== STRUCTURED USER FINANCE DATA (machine-readable; trust this over guesses) ===',
    `currency: INR`,
    `month_label: ${adherence.monthLabel}`,
    financialSummary.dateRange?.startDate || financialSummary.dateRange?.endDate
      ? `period: ${financialSummary.dateRange.startDate ? isoDate(financialSummary.dateRange.startDate) : '…'} → ${financialSummary.dateRange.endDate ? isoDate(financialSummary.dateRange.endDate) : '…'}`
      : `period: available history (recent slice)`,
    `plan_base_income: ${adherence.planBaseIncome}`,
    `salary_credited_this_month: ${planIncomeContext.currentMonthSalaryReceived}`,
    `salary_credited_last_month: ${planIncomeContext.lastMonthSalaryReceived}`,
    `month_income: ${currentMonthStats.income}`,
    `month_expenses: ${currentMonthStats.expenses}`,
    `month_net_flow: ${currentMonthStats.netFlow}`,
    `plan_planned_total: ${adherence.plannedTotal}`,
    `plan_actual_total: ${adherence.actualTotal}`,
    `plan_adherence_score_pct: ${adherence.overallScore}`,
    `capacity_available: ${disciplineSummary.capacity.available}`,
    `capacity_underspend: ${disciplineSummary.capacity.underspend}`,
    `capacity_headroom: ${disciplineSummary.capacity.headroom}`,
    `discipline_gap: ${disciplineSummary.gap}`,
    `discipline_status: ${disciplineSummary.status}`,
    '',
    '## plan_buckets (ALL buckets — planned vs actual)',
    'key\tlabel\tplanned\tactual\tvariance\tstatus\tpct_used',
  ];

  for (const bucket of adherence.buckets) {
    const variance = bucket.actual - bucket.planned;
    lines.push(
      [
        bucket.key,
        tsvEscape(bucket.label),
        bucket.planned,
        bucket.actual,
        variance,
        bucket.status,
        Math.round(bucket.percentUsed * 10) / 10,
      ].join('\t'),
    );
  }

  lines.push(
    '',
    '## category_to_plan_bucket (expense categories → plan rollup)',
    'category\tbreakdown_cat\tplan_bucket_label\tactual\ttxn_hint',
  );

  const categoryRows = [...adherence.lineItems].sort((a, b) => b.actual - a.actual);
  for (const item of categoryRows) {
    const userBucket =
      budgetBuckets.find((b) => b.mapFrom.includes(item.cat as BreakdownCategory))?.label ??
      item.cat;
    lines.push(
      [tsvEscape(item.label), item.cat, tsvEscape(userBucket), item.actual, ''].join('\t'),
    );
  }

  // Also include categories present on transactions but maybe missing from lineItems
  const seenCats = new Set(categoryRows.map((c) => c.label.toLowerCase()));
  const txnCatTotals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'EXPENSE') continue;
    const name = tx.category?.name || 'Uncategorized';
    txnCatTotals.set(name, (txnCatTotals.get(name) || 0) + tx.amount);
  }
  for (const [name, amount] of [...txnCatTotals.entries()].sort((a, b) => b[1] - a[1])) {
    if (seenCats.has(name.toLowerCase())) continue;
    const breakdown = mapCategoryToBucket(name);
    const userBucket =
      budgetBuckets.find((b) => b.mapFrom.includes(breakdown))?.label ?? breakdown;
    lines.push(
      [tsvEscape(name), breakdown, tsvEscape(userBucket), Math.round(amount), 'from_txns'].join(
        '\t',
      ),
    );
  }

  const people = rollupPeopleOrStores(transactions, 'personName', MAX_PEOPLE);
  lines.push('', '## top_people (expense)', 'person\tamount\tcount');
  for (const p of people) {
    lines.push([tsvEscape(p.name), Math.round(p.amount * 100) / 100, p.count].join('\t'));
  }

  const stores = rollupPeopleOrStores(transactions, 'store', MAX_STORES);
  lines.push('', '## top_stores (expense)', 'store\tamount\tcount');
  for (const s of stores) {
    lines.push([tsvEscape(s.name), Math.round(s.amount * 100) / 100, s.count].join('\t'));
  }

  if (disciplineSummary.goals.length > 0) {
    lines.push('', '## goals', 'title\tpace\tmonthly_required\tstatus');
    for (const g of disciplineSummary.goals.slice(0, 20)) {
      lines.push(
        [
          tsvEscape(g.title),
          g.paceStatus,
          g.monthlyRequired ?? 0,
          g.paceStatus,
        ].join('\t'),
      );
    }
  }

  if (disciplineSummary.deadlines.length > 0) {
    lines.push('', '## deadlines_dues', 'title\label\toverdue\tdue_this_month');
    for (const d of disciplineSummary.deadlines.slice(0, 20)) {
      lines.push(
        [
          tsvEscape(d.title),
          tsvEscape(d.label),
          d.isOverdue ? 'yes' : 'no',
          d.isDueThisMonth ? 'yes' : 'no',
        ].join('\t'),
      );
    }
  }

  lines.push(
    '',
    `## transactions (TSV, up to ${MAX_TXN_ROWS} rows chronologically; prefer aggregates above for totals)`,
    formatTxnTsv(transactions, budgetBuckets, MAX_TXN_ROWS),
  );

  if (focus?.bucket || focus?.keyword) {
    lines.push('', '## FOCUS (user is asking about this — do not ignore the full plan above)');
    if (focus.bucket) {
      const focused = filterTransactionsByPlanBucket(transactions, focus.bucket.mapFrom);
      const expenseTotal = focused.reduce((sum, t) => sum + t.amount, 0);
      lines.push(
        `focus_type: plan_bucket`,
        `focus_label: ${focus.bucket.label}`,
        `focus_map_from: ${focus.bucket.mapFrom.join(',')}`,
        `focus_txn_count: ${focused.length}`,
        `focus_expense_total: ${Math.round(expenseTotal * 100) / 100}`,
        `focus_note: "${focus.bucket.label}" is a PLAN ROLLUP of categories, not a single transaction category name.`,
        '',
        `### focus_transactions (up to ${MAX_FOCUS_TXN_ROWS})`,
        formatTxnTsv(focused, budgetBuckets, MAX_FOCUS_TXN_ROWS),
      );
    } else if (focus.keyword) {
      const lower = focus.keyword.toLowerCase();
      const matching = transactions.filter((t) => {
        const hay = [t.description, t.store, t.personName, t.category?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(lower);
      });
      const paid = matching
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      const received = matching
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      lines.push(
        `focus_type: entity_search`,
        `focus_keyword: ${focus.keyword}`,
        `focus_txn_count: ${focus.matchingCount ?? matching.length}`,
        `focus_paid_to_entity: ${Math.round((focus.matchingExpenseTotal ?? paid) * 100) / 100}`,
        `focus_received_from_entity: ${Math.round((focus.matchingIncomeTotal ?? received) * 100) / 100}`,
        `focus_net_with_entity: ${Math.round(((focus.matchingIncomeTotal ?? received) - (focus.matchingExpenseTotal ?? paid)) * 100) / 100}`,
        `focus_note: Totals above are for matching rows in this pack's period. If period is all-history, these are all-time.`,
        '',
        `### focus_transactions (up to ${MAX_FOCUS_TXN_ROWS})`,
        formatTxnTsv(matching, budgetBuckets, MAX_FOCUS_TXN_ROWS),
      );
    }
  }

  lines.push(
    '',
    '## quick_human_summary',
    `Planned ${formatRupees(adherence.plannedTotal)} vs actual ${formatRupees(adherence.actualTotal)} this month.`,
  );
  for (const bucket of adherence.buckets) {
    const variance = bucket.actual - bucket.planned;
    const tag =
      bucket.status === 'over'
        ? 'OVER'
        : bucket.status === 'warning'
          ? 'WATCH'
          : 'OK';
    lines.push(
      `- ${bucket.label}: planned ${formatRupees(bucket.planned)} | actual ${formatRupees(bucket.actual)} | variance ${formatRupees(variance)} | ${tag}`,
    );
  }

  lines.push('=== END STRUCTURED USER FINANCE DATA ===');
  return lines.join('\n');
}
