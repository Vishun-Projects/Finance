import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInFileDedupKey,
  countInFileDuplicateRecords,
  extractStableReference,
  generateDedupHash,
} from '../src/lib/import-dedup.ts';

test('generateDedupHash is stable for identical transactions', () => {
  const tx = {
    transactionDate: new Date('2026-05-26T00:00:00.000Z'),
    description: 'UPI-SWIGGY',
    creditAmount: 0,
    debitAmount: 250,
    transactionId: 'TXN123456789',
  };

  const hashA = generateDedupHash('user-1', tx);
  const hashB = generateDedupHash('user-1', tx);

  assert.equal(hashA, hashB);
  assert.match(hashA, /^id_user-1_TXN123456789$/);
});

test('countInFileDuplicateRecords separates unique rows from in-file duplicates', () => {
  const records = [
    { date_iso: '2026-05-26', description: 'UPI-SWIGGY', debit: 250, credit: 0 },
    { date_iso: '2026-05-26', description: 'UPI-SWIGGY', debit: 250, credit: 0 },
    { date_iso: '2026-05-27', description: 'NEFT CR', debit: 0, credit: 46000 },
  ];

  const result = countInFileDuplicateRecords(records);

  assert.equal(result.uniqueCount, 2);
  assert.equal(result.inFileDuplicate, 1);
});

test('countInFileDuplicateRecords treats different amounts as unique rows', () => {
  const records = [
    { date_iso: '2026-05-26', description: 'UPI-SWIGGY', debit: 250, credit: 0 },
    { date_iso: '2026-05-26', description: 'UPI-SWIGGY', debit: 300, credit: 0 },
  ];

  const result = countInFileDuplicateRecords(records);

  assert.equal(result.uniqueCount, 2);
  assert.equal(result.inFileDuplicate, 0);
});

test('same-day same-merchant rows with different UPI refs stay unique', () => {
  const morning = {
    date_iso: '2026-05-29',
    description: 'YESB0MCHUPI/Uber /UPI/614392751560/UPI',
    debit: 18,
    credit: 0,
    balance: 40123.19,
  };
  const evening = {
    date_iso: '2026-05-29',
    description: 'YESB0MCHUPI/Uber /UPI/645809611132/UPI',
    debit: 18,
    credit: 0,
    balance: 40105.19,
  };

  assert.notEqual(extractStableReference(morning.description), extractStableReference(evening.description));

  const result = countInFileDuplicateRecords([morning, evening]);
  assert.equal(result.uniqueCount, 2);
  assert.equal(result.inFileDuplicate, 0);

  const hashMorning = generateDedupHash('user-1', {
    transactionDate: new Date('2026-05-29T00:00:00.000Z'),
    description: morning.description,
    creditAmount: 0,
    debitAmount: 18,
    balance: morning.balance,
  });
  const hashEvening = generateDedupHash('user-1', {
    transactionDate: new Date('2026-05-29T00:00:00.000Z'),
    description: evening.description,
    creditAmount: 0,
    debitAmount: 18,
    balance: evening.balance,
  });
  assert.notEqual(hashMorning, hashEvening);
});

test('buildInFileDedupKey distinguishes rows by running balance when refs match', () => {
  const date = new Date('2026-05-29T00:00:00.000Z');
  const keyA = buildInFileDedupKey({
    transactionDate: date,
    description: 'same narration',
    creditAmount: 0,
    debitAmount: 18,
    balance: 40123.19,
  });
  const keyB = buildInFileDedupKey({
    transactionDate: date,
    description: 'same narration',
    creditAmount: 0,
    debitAmount: 18,
    balance: 40105.19,
  });
  assert.notEqual(keyA, keyB);
});
