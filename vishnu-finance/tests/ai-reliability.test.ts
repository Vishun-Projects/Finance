import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fullJitterDelayMs,
  parseRetryAfterMs,
  isNonRetryableQuotaError,
  isRetryableAiError,
} from '../src/lib/ai-retry.ts';
import {
  checkAdvisorUserRateLimit,
  getAdvisorWindowLimit,
} from '../src/lib/advisor-rate-limit.ts';
import { suggestedFollowUps, buildTurnStatus } from '../src/lib/advisor-followups.ts';
import {
  extractSpecificDatesFromQuery,
  shouldDefaultToCurrentMonth,
  isSpecificDateLookupQuery,
} from '../src/lib/advisor-query-filters.ts';

test('parseRetryAfterMs reads seconds and ms headers', () => {
  const headers = new Headers({
    'retry-after': '7',
  });
  assert.equal(parseRetryAfterMs({ headers }), 7000);

  const headersMs = new Headers({
    'retry-after-ms': '1500',
  });
  assert.equal(parseRetryAfterMs({ headers: headersMs }), 1500);
});

test('fullJitterDelayMs stays within cap', () => {
  for (let i = 0; i < 20; i += 1) {
    const d = fullJitterDelayMs(10, 400, 5000);
    assert.ok(d >= 0 && d <= 5000);
  }
});

test('quota errors are not retryable', () => {
  assert.equal(isNonRetryableQuotaError(new Error('exceeded your current quota')), true);
  assert.equal(isRetryableAiError(new Error('503 overloaded')), true);
  assert.equal(isRetryableAiError(new Error('exceeded your current quota')), false);
});

test('advisor per-user window limit eventually blocks', () => {
  const { requests } = getAdvisorWindowLimit();
  const userId = `test-user-${Date.now()}`;
  let blocked = false;
  for (let i = 0; i < requests + 3; i += 1) {
    const r = checkAdvisorUserRateLimit(userId);
    if (!r.allowed) {
      blocked = true;
      assert.ok(r.retryAfterSec >= 1);
      assert.equal(r.remaining, 0);
      break;
    }
  }
  assert.equal(blocked, true);
});

test('suggestedFollowUps returns forecast chips', () => {
  const chips = suggestedFollowUps({
    userMessage: 'predict when I hit goals at this pace',
    isForecast: true,
  });
  assert.equal(chips.length, 3);
  assert.ok(chips.some((c) => /pace|pay cycle|goal/i.test(c)));
});

test('extractSpecificDatesFromQuery parses day-list asks', () => {
  const now = new Date(2026, 6, 28);
  const dates = extractSpecificDatesFromQuery(
    'show transactions of 30th May and 30th June',
    now,
  );
  assert.equal(dates.length, 2);
  assert.equal(dates[0].getMonth(), 4); // May
  assert.equal(dates[0].getDate(), 30);
  assert.equal(dates[1].getMonth(), 5); // June
  assert.equal(dates[1].getDate(), 30);
});

test('specific-date lookup does not fallback to current month', () => {
  const q = 'show transactions of 30th May and 30th June';
  assert.equal(isSpecificDateLookupQuery(q), true);
  assert.equal(shouldDefaultToCurrentMonth(q, undefined, []), false);
});

test('suggestedFollowUps keeps date-lookup chips relevant', () => {
  const chips = suggestedFollowUps({
    userMessage: 'show transactions of 30th May and 30th June',
    intent: 'analysis',
  });
  assert.equal(chips.length, 3);
  assert.ok(chips.every((c) => /date|transactions|csv|category|compare/i.test(c)));
});

test('suggestedFollowUps suppresses low-confidence defaults', () => {
  const chips = suggestedFollowUps({
    userMessage: 'help me',
    intent: 'general',
  });
  assert.equal(chips.length, 0);
});

test('buildTurnStatus joins parts', () => {
  const s = buildTurnStatus({
    forecastMode: true,
    windowLabel: '3 pay cycles',
    provider: 'gemini',
    txnCount: 12,
  });
  assert.match(s, /ForecastEngine/);
  assert.match(s, /gemini/);
  assert.match(s, /12 txns/);
});
