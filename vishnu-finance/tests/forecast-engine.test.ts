import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveForecastWindow,
  parsePaydayFromQuery,
  computePaceBreakdown,
  computeSuggestedPace,
  computeWindowBucketAdherence,
  isPaceForecastQuery,
  isSavingsLikeBucket,
} from '../src/lib/advisor-artifacts/forecast/index.ts';
import type { TransactionDetail } from '../src/lib/financial-analysis.ts';

const NOW = new Date(2026, 6, 28); // 28 Jul 2026

test('isPaceForecastQuery detects pace / goal timeline asks', () => {
  assert.equal(
    isPaceForecastQuery('same pace last three months, predict when I hit goals'),
    true,
  );
  assert.equal(isPaceForecastQuery('show my wants budget'), false);
});

test('calendar last-3 window without payday', () => {
  const w = resolveForecastWindow('same pace last three months predict goals', NOW);
  assert.equal(w.mode, 'calendar_months');
  assert.equal(w.periods.length, 3);
  assert.equal(w.startDate.getMonth(), 4); // May
  assert.equal(w.endDate.getDate(), 28);
});

test('payday 30 + last three months → three pay cycles', () => {
  const q =
    'salary on 30th. last three months. predict when I hit goals — current vs suggested';
  assert.equal(parsePaydayFromQuery(q), 30);
  const w = resolveForecastWindow(q, NOW);
  assert.equal(w.mode, 'pay_cycles');
  assert.equal(w.periods.length, 3);
  assert.equal(w.payday, 30);
  // Latest cycle starts on 30 Jun
  const last = w.periods[w.periods.length - 1];
  assert.equal(last.start.getMonth(), 5); // June
  assert.equal(last.start.getDate(), 30);
});

test('explicit 30 Jun → 28 Jul without last-N stays single period', () => {
  const q =
    'salary on 30th. start from date 30th june till todays date that is 28th july. predict goals';
  const w = resolveForecastWindow(q, NOW);
  assert.equal(w.mode, 'explicit');
  assert.equal(w.periods.length, 1);
  assert.equal(w.startDate.getMonth(), 5);
  assert.equal(w.startDate.getDate(), 30);
  assert.equal(w.endDate.getDate(), 28);
});

test('explicit + last three months + payday expands to pay cycles', () => {
  const q =
    'i usually get salary on 30th of month. so start from date 30th june and then till todays date that is 28th july and then predict same same pace last three months';
  const w = resolveForecastWindow(q, NOW);
  assert.equal(w.mode, 'pay_cycles');
  assert.equal(w.periods.length, 3);
});

test('pay-cycle pace keeps salary + next-month spend in one cycle', () => {
  const w = resolveForecastWindow(
    'salary on 30th. start from date 30th june till 28th july. predict goals',
    NOW,
  );
  assert.equal(w.mode, 'explicit');

  const txns: TransactionDetail[] = [
    {
      id: '1',
      date: new Date(2026, 5, 30, 10),
      amount: 50000,
      type: 'INCOME',
      category: { name: 'Salary' },
    },
    {
      id: '2',
      date: new Date(2026, 6, 15, 12),
      amount: 20000,
      type: 'EXPENSE',
      category: { name: 'Food' },
    },
  ];
  const pace = computePaceBreakdown(txns, w);
  assert.equal(pace.periodRows.length, 1);
  assert.equal(pace.periodRows[0].income, 50000);
  assert.equal(pace.periodRows[0].expense, 20000);
  assert.equal(pace.periodRows[0].net, 30000);
});

test('suggested pace moves with currentPace (not sticky)', () => {
  const buckets = [
    {
      key: 'wants',
      label: 'Wants',
      plannedMonthly: 13965,
      actualMonthly: 19123,
      mapFrom: ['wants'],
      isSavingsLike: false,
    },
    {
      key: 'savings',
      label: 'Savings',
      plannedMonthly: 9310,
      actualMonthly: 0,
      mapFrom: ['invest', 'insurance'],
      isSavingsLike: true,
    },
  ];
  const a = computeSuggestedPace({ currentPace: -1003, windowBuckets: buckets });
  const b = computeSuggestedPace({ currentPace: -729, windowBuckets: buckets });
  // max(0,current) + 5158 overspend + 9310 unused savings
  assert.equal(a.suggested, 0 + 5158 + 9310);
  assert.equal(b.suggested, 0 + 5158 + 9310);
  // Same when both current negative — but when current differs positively:
  const c = computeSuggestedPace({ currentPace: 2000, windowBuckets: buckets });
  assert.equal(c.suggested, 2000 + 5158 + 9310);
  assert.notEqual(c.suggested, a.suggested);
});

test('isSavingsLikeBucket uses mapFrom invest/insurance', () => {
  assert.equal(
    isSavingsLikeBucket({
      key: 'foo',
      label: 'Custom',
      mapFrom: ['invest'],
    }),
    true,
  );
  assert.equal(
    isSavingsLikeBucket({
      key: 'wants',
      label: 'Wants',
      mapFrom: ['wants'],
    }),
    false,
  );
});

test('window-scoped adherence differs from calendar-month sticky totals', () => {
  const scaled = [
    {
      id: '1',
      key: 'wants',
      label: 'Wants',
      percentage: 30,
      variant: 'wants' as const,
      mapFrom: ['wants' as const],
      sortOrder: 1,
      planned: 10000,
    },
  ];

  const shortWindow = resolveForecastWindow(
    'salary on 30th. start from date 30th june till 28th july. predict goals',
    NOW,
  );
  const longWindow = resolveForecastWindow(
    'salary on 30th. last three months predict goals',
    NOW,
  );

  const txns: TransactionDetail[] = [
    {
      id: 'a',
      date: new Date(2026, 6, 10),
      amount: 5000,
      type: 'EXPENSE',
      category: { name: 'Entertainment' },
    },
    {
      id: 'b',
      date: new Date(2026, 4, 10),
      amount: 20000,
      type: 'EXPENSE',
      category: { name: 'Entertainment' },
    },
  ];

  const short = computeWindowBucketAdherence({
    transactions: txns,
    scaledBuckets: scaled,
    window: shortWindow,
  });
  const long = computeWindowBucketAdherence({
    transactions: txns,
    scaledBuckets: scaled,
    window: longWindow,
  });

  assert.ok(short[0].actualMonthly !== long[0].actualMonthly);
});

test('forecast path does not treat 30th as amount filter (parser isolation check)', () => {
  // Documented contract: parseForecastRequest/runForecast never call applyInMemoryTxnFilters.
  // This test guards that payday parse still returns day-of-month, not an amount.
  assert.equal(parsePaydayFromQuery('salary on 30th of month expense forecast'), 30);
  const w = resolveForecastWindow(
    'salary on 30th last three months predict when I hit goals expense spending',
    NOW,
  );
  assert.equal(w.mode, 'pay_cycles');
  assert.ok(w.periods.length >= 1);
});
