import test from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../src/features/money-plan/data/money-plan.ts';
import {
  REFERENCE_SALARY,
  buildScaledMoneyPlanView,
  buildScaledPlanAmounts,
  resolvePlanBaseIncome,
  scalePlanAmount,
} from '../src/lib/plan-income.ts';

test('scalePlanAmount scales from reference salary proportionally', () => {
  assert.equal(scalePlanAmount(10400, 46000), 10400);
  assert.equal(scalePlanAmount(10400, 50000), Math.round((10400 / REFERENCE_SALARY) * 50000));
  assert.equal(scalePlanAmount(2500, 50000), Math.round((2500 / REFERENCE_SALARY) * 50000));
});

test('resolvePlanBaseIncome prefers salary structure over transaction salary', () => {
  assert.deepEqual(
    resolvePlanBaseIncome({ salaryTakeHome: 52000, transactionSalary: 48000 }),
    { baseIncome: 52000, source: 'salary_structure' },
  );
  assert.deepEqual(
    resolvePlanBaseIncome({ salaryTakeHome: 0, transactionSalary: 48000 }),
    { baseIncome: 48000, source: 'transaction_salary' },
  );
  assert.deepEqual(
    resolvePlanBaseIncome({ salaryTakeHome: null, transactionSalary: null }),
    { baseIncome: DATA.salary, source: 'default' },
  );
});

test('buildScaledPlanAmounts keeps bucket totals aligned with line items', () => {
  const scaled = buildScaledPlanAmounts(50000);
  const lineItemSum = Array.from(scaled.lineItemPlanned.values()).reduce((sum, value) => sum + value, 0);
  const bucketSum = Array.from(scaled.bucketPlanned.values()).reduce((sum, value) => sum + value, 0);

  assert.equal(scaled.plannedTotal, lineItemSum);
  assert.equal(scaled.plannedTotal, bucketSum);
  assert.equal(scaled.plannedTotal, scalePlanAmount(DATA.salary, 50000));
});

test('buildScaledMoneyPlanView scales salary and totals together', () => {
  const view = buildScaledMoneyPlanView(50000, 'salary_structure');
  assert.equal(view.salary, 50000);
  assert.equal(view.plannedTotal, scalePlanAmount(DATA.salary, 50000));
  assert.equal(view.sip, scalePlanAmount(DATA.sip, 50000));
  assert.equal(view.budget.needs.amount, scalePlanAmount(DATA.budget.needs.amount, 50000));
});
