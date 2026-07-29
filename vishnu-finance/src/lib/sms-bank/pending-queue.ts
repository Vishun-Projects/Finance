'use client';

import type { ParsedBankSmsDraft } from './parse-sms';

const QUEUE_KEY = 'bankSmsQueue:v1';
const SETTINGS_KEY = 'bankSmsSettings:v1';
const CURSOR_KEY = 'bankSmsSyncCursor:v1';

export type PendingSmsStatus = 'pending' | 'accepted' | 'rejected';

export type PendingSmsItem = ParsedBankSmsDraft & {
  status: PendingSmsStatus;
  dedupKey: string;
  enqueuedAt: number;
  transactionDbId?: string | null;
};

export type BankSmsSettings = {
  autoReadEnabled: boolean;
  overlayEnabled: boolean;
  retentionDays: number;
  disclosedAt: number | null;
};

const DEFAULT_SETTINGS: BankSmsSettings = {
  autoReadEnabled: false,
  overlayEnabled: false,
  retentionDays: 30,
  disclosedAt: null,
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

export function getBankSmsSettings(): BankSmsSettings {
  return { ...DEFAULT_SETTINGS, ...safeParse(readStorage(SETTINGS_KEY), {}) };
}

export function saveBankSmsSettings(patch: Partial<BankSmsSettings>): BankSmsSettings {
  const next = { ...getBankSmsSettings(), ...patch };
  writeStorage(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function getSmsSyncCursorMs(): number {
  const raw = readStorage(CURSOR_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function setSmsSyncCursorMs(ms: number): void {
  writeStorage(CURSOR_KEY, String(ms));
}

function buildDedupKey(draft: ParsedBankSmsDraft): string {
  if (draft.transactionId && draft.transactionId.trim().length > 5) {
    return `ref:${draft.transactionId.trim().toUpperCase()}`;
  }
  return `sms:${draft.smsId}`;
}

export function loadPendingSmsQueue(): PendingSmsItem[] {
  return safeParse<PendingSmsItem[]>(readStorage(QUEUE_KEY), []);
}

function persistQueue(items: PendingSmsItem[]): void {
  writeStorage(QUEUE_KEY, JSON.stringify(items));
}

export function pruneSmsQueue(retentionDays = getBankSmsSettings().retentionDays): PendingSmsItem[] {
  const cutoff = Date.now() - Math.max(1, retentionDays) * 24 * 60 * 60 * 1000;
  const items = loadPendingSmsQueue().filter((item) => {
    if (item.status === 'pending') return true;
    return item.enqueuedAt >= cutoff;
  });
  persistQueue(items);
  return items;
}

export function enqueueParsedSms(drafts: ParsedBankSmsDraft[]): { added: number; pending: PendingSmsItem[] } {
  const existing = pruneSmsQueue();
  const bySmsId = new Set(existing.map((e) => e.smsId));
  const byDedup = new Set(existing.map((e) => e.dedupKey));
  let added = 0;

  for (const draft of drafts) {
    const dedupKey = buildDedupKey(draft);
    if (bySmsId.has(draft.smsId) || byDedup.has(dedupKey)) continue;
    existing.push({
      ...draft,
      status: 'pending',
      dedupKey,
      enqueuedAt: Date.now(),
    });
    bySmsId.add(draft.smsId);
    byDedup.add(dedupKey);
    added++;
  }

  persistQueue(existing);
  return { added, pending: existing };
}

export function listPendingSms(): PendingSmsItem[] {
  return pruneSmsQueue().filter((i) => i.status === 'pending');
}

export function countPendingSms(): number {
  return listPendingSms().length;
}

export function markSmsStatus(
  smsId: string,
  status: PendingSmsStatus,
  transactionDbId?: string | null,
): PendingSmsItem[] {
  const items = loadPendingSmsQueue().map((item) =>
    item.smsId === smsId
      ? { ...item, status, transactionDbId: transactionDbId ?? item.transactionDbId }
      : item,
  );
  persistQueue(items);
  return items;
}

export function clearRejectedSms(): PendingSmsItem[] {
  const items = loadPendingSmsQueue().filter((i) => i.status !== 'rejected');
  persistQueue(items);
  return items;
}
