'use client';

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type SmsPermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';

export type BankSmsMessage = {
  id: string;
  address: string;
  body: string;
  date: number;
};

export type SmsBankPermissions = {
  sms: SmsPermissionState | string;
  overlay: boolean;
  openedSettings?: boolean;
  restrictedLikely?: boolean;
};

type SmsBankReaderPlugin = {
  checkPermissions(): Promise<SmsBankPermissions>;
  requestPermissions(): Promise<SmsBankPermissions>;
  requestOverlayPermission(): Promise<{ overlay: boolean; openedSettings?: boolean }>;
  openAppSettings(): Promise<{ opened: boolean }>;
  openSmsSettings(): Promise<{ opened: boolean; hint?: string }>;
  getRecentBankSms(options: { sinceMs?: number; limit?: number }): Promise<{ messages: BankSmsMessage[] }>;
  startBackgroundSync(): Promise<{ running: boolean }>;
  stopBackgroundSync(): Promise<{ running: boolean }>;
  setOverlayCount(options: { count: number; enabled: boolean }): Promise<{ count: number; enabled: boolean }>;
  isNativeAvailable(): Promise<{ available: boolean; platform: string }>;
  addListener(
    eventName: 'bankSmsReceived',
    listenerFunc: (event: BankSmsMessage) => void,
  ): Promise<PluginListenerHandle>;
};

const SmsBankReader = registerPlugin<SmsBankReaderPlugin>('SmsBankReader');

export function isSmsBankReaderSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function checkSmsBankPermissions(): Promise<SmsBankPermissions | null> {
  if (!isSmsBankReaderSupported()) return null;
  try {
    return await SmsBankReader.checkPermissions();
  } catch {
    return null;
  }
}

export async function requestSmsBankPermissions(): Promise<SmsBankPermissions | null> {
  if (!isSmsBankReaderSupported()) return null;
  try {
    return await SmsBankReader.requestPermissions();
  } catch {
    return null;
  }
}

export async function requestSmsOverlayPermission(): Promise<boolean> {
  if (!isSmsBankReaderSupported()) return false;
  try {
    const result = await SmsBankReader.requestOverlayPermission();
    if (result.overlay) return true;
    // User may grant in settings; re-check after a short delay is caller's job
    const again = await SmsBankReader.checkPermissions();
    return Boolean(again.overlay);
  } catch {
    return false;
  }
}

export async function openSmsAppSettings(): Promise<void> {
  if (!isSmsBankReaderSupported()) return;
  try {
    await SmsBankReader.openSmsSettings();
  } catch {
    try {
      await SmsBankReader.openAppSettings();
    } catch {
      /* ignore */
    }
  }
}

export async function getRecentBankSms(options?: {
  sinceMs?: number;
  limit?: number;
}): Promise<BankSmsMessage[]> {
  if (!isSmsBankReaderSupported()) return [];
  try {
    const result = await SmsBankReader.getRecentBankSms({
      sinceMs: options?.sinceMs ?? 0,
      limit: options?.limit ?? 100,
    });
    return result.messages ?? [];
  } catch (err) {
    console.warn('[SmsBankReader] getRecentBankSms failed', err);
    return [];
  }
}

export async function startSmsBackgroundSync(): Promise<boolean> {
  if (!isSmsBankReaderSupported()) return false;
  try {
    const result = await SmsBankReader.startBackgroundSync();
    return Boolean(result.running);
  } catch {
    return false;
  }
}

export async function stopSmsBackgroundSync(): Promise<void> {
  if (!isSmsBankReaderSupported()) return;
  try {
    await SmsBankReader.stopBackgroundSync();
  } catch {
    /* ignore */
  }
}

export async function setSmsOverlayCount(count: number, enabled: boolean): Promise<void> {
  if (!isSmsBankReaderSupported()) return;
  try {
    await SmsBankReader.setOverlayCount({ count, enabled });
  } catch {
    /* ignore */
  }
}

export async function addBankSmsReceivedListener(
  listener: (event: BankSmsMessage) => void,
): Promise<PluginListenerHandle | null> {
  if (!isSmsBankReaderSupported()) return null;
  try {
    return await SmsBankReader.addListener('bankSmsReceived', listener);
  } catch {
    return null;
  }
}
