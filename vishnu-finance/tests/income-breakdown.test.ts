import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSalaryCredits } from '../src/lib/income-breakdown.ts';

test('computeSalaryCredits detects partial salary against active take-home band', () => {
  const credits = computeSalaryCredits(
    [{ creditAmount: 17000, description: 'NEFT CR', categoryName: 'Transfer' }],
    { activeMonthlyTakeHome: 46000 },
  );
  assert.equal(credits, 17000);
});

test('computeSalaryCredits prefers explicit salary category', () => {
  const credits = computeSalaryCredits([
    { creditAmount: 17000, description: 'Payroll', categoryName: 'Salary' },
    { creditAmount: 5000, description: 'From papa', personName: 'Papa' },
  ]);
  assert.equal(credits, 17000);
});
