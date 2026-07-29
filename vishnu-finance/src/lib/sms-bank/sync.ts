'use client';

import { toast } from 'sonner';
import {
  addBankSmsReceivedListener,
  checkNotificationAccess,
  getRecentBankNotifications,
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

/** Catch-up from active notification drawer (not historical SMS inbox). */
export async function syncBankSmsInbox(options?: {
  notify?: boolean;
}): Promise<{ added: number; pending: number }> {
  if (!isSmsBankReaderSupported()) return { added: 0, pending: countPendingSms() };

  const settings = getBankSmsSettings();
  if (!settings.autoReadEnabled) return { added: 0, pending: countPendingSms() };

  const hasAccess = await checkNotificationAccess();
  if (!hasAccess) return { added: 0, pending: countPendingSms() };

  const messages = await getRecentBankNotifications({ limit: 50 });
  const added = ingestMessages(messages);

  let maxDate = getSmsSyncCursorMs();
  for (const m of messages) {
    if (m.date > maxDate) maxDate = m.date;
  }
  if (maxDate > 0) setSmsSyncCursorMs(maxDate);

  await syncOverlayBubble();

  const pending = countPendingSms();
  if (options?.notify !== false && added > 0) {
    toast.message(`${added} bank alert${added === 1 ? '' : 's'} ready to review`);
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
    toast.message('New bank alert ready to review');
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
