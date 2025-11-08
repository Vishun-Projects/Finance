import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatFileSize, validateDeleteMode } from '@/lib/document-utils';

test('formatFileSize handles nullish values', () => {
  assert.equal(formatFileSize(undefined), '—');
  assert.equal(formatFileSize(null), '—');
  assert.equal(formatFileSize(NaN), '—');
  assert.equal(formatFileSize(0), '—');
});

test('formatFileSize formats bytes and larger units', () => {
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(1048576), '1.0 MB');
  assert.equal(formatFileSize(1073741824), '1.0 GB');
});

test('validateDeleteMode defaults to document-only', () => {
  assert.equal(validateDeleteMode(undefined), 'document-only');
  assert.equal(validateDeleteMode(null), 'document-only');
  assert.equal(validateDeleteMode(''), 'document-only');
  assert.equal(validateDeleteMode('invalid'), 'document-only');
});

test('validateDeleteMode allows cascade delete', () => {
  assert.equal(validateDeleteMode('document-and-transactions'), 'document-and-transactions');
});
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatFileSize, validateDeleteMode } from '../src/lib/document-utils';

test('formatFileSize handles nullish values', () => {
  assert.equal(formatFileSize(undefined), '—');
  assert.equal(formatFileSize(null), '—');
  assert.equal(formatFileSize(NaN), '—');
  assert.equal(formatFileSize(0), '—');
});

test('formatFileSize formats bytes and larger units', () => {
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(1048576), '1.0 MB');
  assert.equal(formatFileSize(1073741824), '1.0 GB');
});

test('validateDeleteMode defaults to document-only', () => {
  assert.equal(validateDeleteMode(undefined), 'document-only');
  assert.equal(validateDeleteMode(null), 'document-only');
  assert.equal(validateDeleteMode(''), 'document-only');
  assert.equal(validateDeleteMode('invalid'), 'document-only');
});

test('validateDeleteMode allows cascade delete', () => {
  assert.equal(validateDeleteMode('document-and-transactions'), 'document-and-transactions');
});

