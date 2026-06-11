import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBalanceFromStatement } from '../src/lib/account-balance-service.ts';

test('resolveBalanceFromStatement prefers last txn balance over statement closing', () => {
  const endDate = new Date('2026-05-26T00:00:00.000Z');
  const txnDate = new Date('2026-05-26T00:00:00.000Z');
  const importedAt = new Date('2026-05-27T00:00:00.000Z');

  const result = resolveBalanceFromStatement({
    txnBalance: 253,
    txnDate,
    closingBalance: 5690,
    statementEndDate: endDate,
    importedAt,
    accountNumber: '1234',
    bankCode: 'HDFC',
    statementId: 'stmt-1',
  });

  assert.equal(result.amount, 253);
  assert.equal(result.source, 'last_txn_balance');
  assert.equal(result.statementId, 'stmt-1');
});

test('resolveBalanceFromStatement falls back to statement closing when txn balance missing', () => {
  const endDate = new Date('2026-05-26T00:00:00.000Z');

  const result = resolveBalanceFromStatement({
    txnBalance: null,
    txnDate: null,
    closingBalance: 253,
    statementEndDate: endDate,
    importedAt: new Date('2026-05-27T00:00:00.000Z'),
    accountNumber: '1234',
    bankCode: 'HDFC',
    statementId: 'stmt-2',
  });

  assert.equal(result.amount, 253);
  assert.equal(result.source, 'statement_closing');
});

test('resolveBalanceFromStatement returns empty amount when no balance sources exist', () => {
  const result = resolveBalanceFromStatement({
    txnBalance: null,
    txnDate: null,
    closingBalance: null,
    statementEndDate: new Date('2026-05-26T00:00:00.000Z'),
    importedAt: null,
    accountNumber: null,
    bankCode: null,
    statementId: null,
  });

  assert.equal(result.amount, null);
  assert.equal(result.source, null);
});
