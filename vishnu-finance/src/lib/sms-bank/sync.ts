'use client';

import { toast } from 'sonner';
import {
  addBankSmsReceivedListener,
  getRecentBankSms,
  isSmsBankReaderSupported,
  setSmsOverlayCount,
  type BankSmsMessage,
} from '@/lib/mobile/sms-bank-reader';
import { parseBankSms } from './parse-sms';
import {
  countPendingSms,
  enqueueParsedSms,
  getBankSmsSettings,
  getSmsSyncCursorMs,
  setSmsSyncCursorMs,
} from './pending-queue';

async function syncOverlayBubble(): Promise<void> {
  const settings = getBankSmsSettings();
  const count = countPendingSms();
  await setSmsOverlayCount(count, settings.overlayEnabled && settings.autoReadEnabled);
}

function ingestMessages(messages: BankSmsMessage[]): number {
  const drafts = messages
    .map((m) =>
      parseBankSms({
        id: m.id,
        address: m.address,
        body: m.body,
        date: m.date,
      }),
    )
    .filter((d): d is NonNullable<typeof d> => d != null);

  const { added } = enqueueParsedSms(drafts);
  return added;
}

/** Bounded inbox catch-up since last cursor (default last 14 days on first run). */
export async function syncBankSmsInbox(options?: {
  notify?: boolean;
  lookbackDays?: number;
}): Promise<{ added: number; pending: number }> {
  if (!isSmsBankReaderSupported()) return { added: 0, pending: countPendingSms() };

  const settings = getBankSmsSettings();
  if (!settings.autoReadEnabled) return { added: 0, pending: countPendingSms() };

  const lookbackMs = (options?.lookbackDays ?? 14) * 24 * 60 * 60 * 1000;
  const cursor = getSmsSyncCursorMs();
  const sinceMs = cursor > 0 ? cursor : Date.now() - lookbackMs;

  const messages = await getRecentBankSms({ sinceMs, limit: 150 });
  const added = ingestMessages(messages);

  let maxDate = sinceMs;
  for (const m of messages) {
    if (m.date > maxDate) maxDate = m.date;
  }
  setSmsSyncCursorMs(Math.max(maxDate, Date.now() - 60_000));

  await syncOverlayBubble();

  const pending = countPendingSms();
  if (options?.notify !== false && added > 0) {
    toast.message(`${added} bank message${added === 1 ? '' : 's'} ready to review`);
  }

  return { added, pending };
}

export async function ingestRealtimeBankSms(message: BankSmsMessage): Promise<void> {
  const settings = getBankSmsSettings();
  if (!settings.autoReadEnabled) return;
  const added = ingestMessages([message]);
  if (message.date) setSmsSyncCursorMs(Math.max(getSmsSyncCursorMs(), message.date));
  await syncOverlayBubble();
  if (added > 0) {
    toast.message('New bank SMS ready to review');
  }
}

let listenerStarted = false;

export async function startBankSmsClientListeners(): Promise<void> {
  if (!isSmsBankReaderSupported() || listenerStarted) return;
  listenerStarted = true;
  await addBankSmsReceivedListener((event) => {
    void ingestRealtimeBankSms(event);
  });
}

export { syncOverlayBubble };
