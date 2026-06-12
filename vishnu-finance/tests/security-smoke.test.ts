import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeImportStorageKey } from '../src/lib/storage-path.ts';
import { validateOrigin, validateCsrfToken, guardMutationRequest } from '../src/lib/request-guard.ts';
import { NextRequest } from 'next/server';

test('sanitizeImportStorageKey rejects path traversal', () => {
  assert.equal(sanitizeImportStorageKey('../etc/passwd', 'user-1'), null);
  assert.equal(sanitizeImportStorageKey('user-docs/other-user/file.pdf', 'user-1'), null);
});

test('sanitizeImportStorageKey allows owner-scoped paths', () => {
  const key = 'uploads/user-1/imports/statement.pdf';
  assert.equal(sanitizeImportStorageKey(key, 'user-1'), key);
});

test('guardMutationRequest rejects missing CSRF on POST /api/app', () => {
  const request = new NextRequest('http://localhost:3000/api/app', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
    },
  });
  const result = guardMutationRequest(request, { action: 'transactions_create' });
  assert.ok(result);
  assert.equal(result?.status, 403);
});

test('validateCsrfToken accepts matching cookie and header', () => {
  const token = 'test-csrf-token-value';
  const request = new NextRequest('http://localhost:3000/api/app', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'x-csrf-token': token,
      cookie: `csrf-token=${token}`,
    },
  });
  assert.equal(validateCsrfToken(request), true);
});

test('validateOrigin allows localhost in development', () => {
  const request = new NextRequest('http://localhost:3000/api/app', {
    method: 'POST',
    headers: { origin: 'http://localhost:3000' },
  });
  assert.equal(validateOrigin(request), true);
});
