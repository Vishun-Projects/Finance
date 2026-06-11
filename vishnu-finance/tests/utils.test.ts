import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCompactRupees, toNumber } from '../src/lib/utils.ts';

test('toNumber coerces string amounts from API', () => {
  assert.equal(toNumber('300000'), 300000);
  assert.equal(toNumber(null), 0);
});

test('formatCompactRupees formats lakhs compactly', () => {
  assert.equal(formatCompactRupees(300000), '₹3L');
  assert.equal(formatCompactRupees(800001), '₹8L');
});

test('formatCompactRupees never appends raw concatenated totals', () => {
  const concatenatedStringTotal = '300000500000001';
  const numeric = toNumber(concatenatedStringTotal);
  assert.equal(formatCompactRupees(numeric), '₹3,00,00,050Cr');
});

test('wishlist totalCost uses numeric addition with string API costs', () => {
  const items = [
    { estimatedCost: '300000' },
    { estimatedCost: 500000 },
    { estimatedCost: '1' },
  ] as Array<{ estimatedCost: string | number }>;

  const total = items.reduce((sum, item) => sum + toNumber(item.estimatedCost), 0);
  assert.equal(total, 800001);
  assert.equal(formatCompactRupees(total), '₹8L');
});
