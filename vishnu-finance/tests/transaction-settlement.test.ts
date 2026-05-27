import test from 'node:test';
import assert from 'node:assert/strict';
import { computeIncomeBreakdown, classifyIncomeBucket } from '../src/lib/income-breakdown.ts';
import {
  computeSettlementNet,
  getEffectiveExpenseAmounts,
  amountsRoughlyMatch,
} from '../src/lib/transaction-settlement-service.ts';
import type { SettlementLookup } from '../src/lib/transaction-settlement-service.ts';

test('classifyIncomeBucket splits salary, family, and other', () => {
  assert.equal(
    classifyIncomeBucket({ creditAmount: 46000, categoryName: 'Salary', description: 'NEFT credit' }),
    'salary',
  );
  assert.equal(
    classifyIncomeBucket({ creditAmount: 5000, categoryName: 'Gifts & Donations', personName: 'Mamta Munsheelal Vishwakarma' }),
    'family',
  );
  assert.equal(
    classifyIncomeBucket({ creditAmount: 500, categoryName: 'Refund', description: 'cashback' }),
    'other',
  );
});

test('computeIncomeBreakdown totals income buckets', () => {
  const breakdown = computeIncomeBreakdown([
    { creditAmount: 46000, categoryName: 'Salary' },
    { creditAmount: 5000, categoryName: 'Gifts & Donations', personName: 'Mummy' },
    { creditAmount: 180, categoryName: 'Refund' },
  ]);

  assert.equal(breakdown.salary, 46000);
  assert.equal(breakdown.family, 5000);
  assert.equal(breakdown.other, 180);
  assert.equal(breakdown.total, 51180);
});

test('computeSettlementNet nets lend and return to zero expense', () => {
  const net = computeSettlementNet('LEND_RETURN', [
    { id: 'a', financialCategory: 'EXPENSE', creditAmount: 0, debitAmount: 500 },
    { id: 'b', financialCategory: 'INCOME', creditAmount: 500, debitAmount: 0 },
  ]);

  assert.equal(net.netExpense, 0);
  assert.equal(net.netIncome, 0);
});

test('computeSettlementNet keeps partial lend outstanding', () => {
  const net = computeSettlementNet('LEND_RETURN', [
    { id: 'a', financialCategory: 'EXPENSE', creditAmount: 0, debitAmount: 500 },
    { id: 'b', financialCategory: 'INCOME', creditAmount: 300, debitAmount: 0 },
  ]);

  assert.equal(net.netExpense, 200);
});

test('computeSettlementNet nets borrow and repay income', () => {
  const net = computeSettlementNet('BORROW_REPAY', [
    { id: 'a', financialCategory: 'INCOME', creditAmount: 1000, debitAmount: 0 },
    { id: 'b', financialCategory: 'EXPENSE', creditAmount: 0, debitAmount: 1000 },
  ]);

  assert.equal(net.netIncome, 0);
  assert.equal(net.netExpense, 0);
});

test('getEffectiveExpenseAmounts assigns net only to primary debit', () => {
  const lookup: SettlementLookup = {
    groups: [
      {
        id: 'settlement-1',
        label: 'Loan to Vinod',
        type: 'LEND_RETURN',
        members: [
          { id: 'debit-1', financialCategory: 'EXPENSE', creditAmount: 0, debitAmount: 500 },
          { id: 'credit-1', financialCategory: 'INCOME', creditAmount: 500, debitAmount: 0 },
        ],
      },
    ],
    byTransactionId: new Map([
      ['debit-1', {
        settlementId: 'settlement-1',
        type: 'LEND_RETURN',
        label: 'Loan to Vinod',
        transactionIds: ['debit-1', 'credit-1'],
        netExpense: 0,
        netIncome: 0,
      }],
      ['credit-1', {
        settlementId: 'settlement-1',
        type: 'LEND_RETURN',
        label: 'Loan to Vinod',
        transactionIds: ['debit-1', 'credit-1'],
        netExpense: 0,
        netIncome: 0,
      }],
    ]),
  };

  const effective = getEffectiveExpenseAmounts(
    [
      { id: 'debit-1', amount: 500 },
      { id: 'credit-1', amount: 0 },
      { id: 'debit-2', amount: 120 },
    ],
    lookup,
  );

  assert.equal(effective.get('debit-1'), 0);
  assert.equal(effective.get('credit-1'), 0);
  assert.equal(effective.get('debit-2'), 120);
});

test('amountsRoughlyMatch accepts small UPI rounding differences', () => {
  assert.equal(amountsRoughlyMatch(500, 500.5), true);
  assert.equal(amountsRoughlyMatch(500, 520), false);
});
