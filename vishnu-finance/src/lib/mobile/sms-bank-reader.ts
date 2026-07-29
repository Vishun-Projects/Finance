'use client';

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type SmsPermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';

export type BankSmsMessage = {
  id: string;
  address: string;
  body: string;
  date: number;
  packageName?: string;
};

export type SmsBankPermissions = {
  sms: SmsPermissionState | string;
  notificationAccess?: boolean;
  overlay: boolean;
  openedSettings?: boolean;
  restrictedLikely?: boolean;
};

type SmsBankReaderPlugin = {
  checkPermissions(): Promise<SmsBankPermissions>;
  requestPermissions(): Promise<SmsBankPermissions>;
  checkNotificationAccess(): Promise<{ enabled: boolean }>;
  openNotificationAccessSettings(): Promise<{ opened: boolean }>;
  requestOverlayPermission(): Promise<{ overlay: boolean; openedSettings?: boolean }>;
  checkBackgroundReliability(): Promise<{
    overlay: boolean;
    notificationAccess: boolean;
    manufacturer?: string;
    batteryOptimizationsIgnored?: boolean;
  }>;
  openBatteryOptimizationSettings(): Promise<{ opened: boolean }>;
  openAutoStartSettings(): Promise<{ opened: boolean }>;
  openAppSettings(): Promise<{ opened: boolean }>;
  openSmsSettings(): Promise<{ opened: boolean; hint?: string }>;
  getRecentBankSms(options: { sinceMs?: number; limit?: number }): Promise<{ messages: BankSmsMessage[] }>;
  getRecentBankNotifications(options: { limit?: number }): Promise<{ messages: BankSmsMessage[] }>;
  startBackgroundSync(): Promise<{ running: boolean }>;
  stopBackgroundSync(): Promise<{ running: boolean }>;
  setOverlayCount(options: { count: number; enabled: boolean }): Promise<{ count: number; enabled: boolean }>;
  isNativeAvailable(): Promise<{ available: boolean; platform: string; captureMode?: string }>;
  consumeReviewRequest(): Promise<{ pending: boolean }>;
  addListener(
    eventName: 'bankSmsReceived',
    listenerFunc: (event: BankSmsMessage) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'smsReviewRequested',
    listenerFunc: () => void,
  ): Promise<PluginListenerHandle>;
};

export type BackgroundReliabilityState = {
  overlay: boolean;
  notificationAccess: boolean;
  manufacturer: string;
  batteryOptimizationsIgnored: boolean;
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

export async function checkNotificationAccess(): Promise<boolean> {
  if (!isSmsBankReaderSupported()) return false;
  try {
    const result = await SmsBankReader.checkNotificationAccess();
    return Boolean(result.enabled);
  } catch {
    const perms = await checkSmsBankPermissions();
    return Boolean(perms?.notificationAccess) || perms?.sms === 'granted';
  }
}

/** Opens system Notification access settings (required grant path). */
export async function requestSmsBankPermissions(): Promise<SmsBankPermissions | null> {
  if (!isSmsBankReaderSupported()) return null;
  try {
    return await SmsBankReader.requestPermissions();
  } catch {
    return null;
  }
}

export async function openNotificationAccessSettings(): Promise<void> {
  if (!isSmsBankReaderSupported()) return;
  try {
    await SmsBankReader.openNotificationAccessSettings();
  } catch {
    try {
      await SmsBankReader.openSmsSettings();
    } catch {
      /* ignore */
    }
  }
}

export async function requestSmsOverlayPermission(): Promise<boolean> {
  if (!isSmsBankReaderSupported()) return false;
  try {
    const result = await SmsBankReader.requestOverlayPermission();
    if (result.overlay) return true;
    const again = await SmsBankReader.checkPermissions();
    return Boolean(again.overlay);
  } catch {
    return false;
  }
}

export async function openSmsAppSettings(): Promise<void> {
  await openNotificationAccessSettings();
}

export async function openAppSettings(): Promise<void> {
  if (!isSmsBankReaderSupported()) return;
  try {
    await SmsBankReader.openAppSettings();
  } catch {
    /* ignore */
  }
}

export async function checkBackgroundReliability(): Promise<BackgroundReliabilityState | null> {
  if (!isSmsBankReaderSupported()) return null;
  try {
    const result = await SmsBankReader.checkBackgroundReliability();
    return {
      overlay: Boolean(result.overlay),
      notificationAccess: Boolean(result.notificationAccess),
      manufacturer: result.manufacturer || 'unknown',
      batteryOptimizationsIgnored: Boolean(result.batteryOptimizationsIgnored),
    };
  } catch {
    return null;
  }
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (!isSmsBankReaderSupported()) return;
  try {
    await SmsBankReader.openBatteryOptimizationSettings();
  } catch {
    /* ignore */
  }
}

export async function openAutoStartSettings(): Promise<void> {
  if (!isSmsBankReaderSupported()) return;
  try {
    await SmsBankReader.openAutoStartSettings();
  } catch {
    /* ignore */
  }
}

export async function getRecentBankSms(options?: {
  sinceMs?: number;
  limit?: number;
}): Promise<BankSmsMessage[]> {
  return getRecentBankNotifications({ limit: options?.limit ?? 50 });
}

export async function getRecentBankNotifications(options?: {
  limit?: number;
}): Promise<BankSmsMessage[]> {
  if (!isSmsBankReaderSupported()) return [];
  try {
    const result = await SmsBankReader.getRecentBankNotifications({
      limit: options?.limit ?? 50,
    });
    return result.messages ?? [];
  } catch (err) {
    console.warn('[SmsBankReader] getRecentBankNotifications failed', err);
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

export async function addSmsReviewRequestedListener(
  listener: () => void,
): Promise<PluginListenerHandle | null> {
  if (!isSmsBankReaderSupported()) return null;
  try {
    return await SmsBankReader.addListener('smsReviewRequested', listener);
  } catch {
    return null;
  }
}

export async function consumeSmsReviewRequest(): Promise<boolean> {
  if (!isSmsBankReaderSupported()) return false;
  try {
    const result = await SmsBankReader.consumeReviewRequest();
    return Boolean(result.pending);
  } catch {
    return false;
  }
}
