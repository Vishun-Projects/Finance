'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BatteryCharging, Bell, MessageSquareText, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  SettingsPageLayout,
  SettingsSectionHeader,
  SettingsGroup,
  SettingsToggleRow,
  SettingsFieldGroup,
} from '@/features/settings/components/settings-ui';
import {
  checkNotificationAccess,
  checkBackgroundReliability,
  checkSmsBankPermissions,
  isSmsBankReaderSupported,
  openAppSettings,
  openAutoStartSettings,
  openBatteryOptimizationSettings,
  openNotificationAccessSettings,
  requestSmsOverlayPermission,
  startSmsBackgroundSync,
  stopSmsBackgroundSync,
} from '@/lib/mobile/sms-bank-reader';
import {
  clearRejectedSms,
  countPendingSms,
  getBankSmsSettings,
  saveBankSmsSettings,
  type BankSmsSettings,
} from '@/lib/sms-bank/pending-queue';
import { openSmsReview } from '@/lib/sms-bank/review-events';
import { syncBankSmsInbox, syncOverlayBubble } from '@/lib/sms-bank/sync';

export function BankSmsSettings() {
  const supported = isSmsBankReaderSupported();
  const [settings, setSettings] = useState<BankSmsSettings>(() => getBankSmsSettings());
  const [pendingCount, setPendingCount] = useState(0);
  const [notificationAccess, setNotificationAccess] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reliability, setReliability] = useState<{
    overlay: boolean;
    notificationAccess: boolean;
    manufacturer: string;
    batteryOptimizationsIgnored: boolean;
  } | null>(null);

  const refresh = async () => {
    setSettings(getBankSmsSettings());
    setPendingCount(countPendingSms());
    const access = await checkNotificationAccess();
    setNotificationAccess(access);
    const perms = await checkSmsBankPermissions();
    setOverlayGranted(Boolean(perms?.overlay));
    const rel = await checkBackgroundReliability();
    setReliability(rel);
  };

  useEffect(() => {
    void refresh();

    const onResume = () => {
      void refresh();
    };
    document.addEventListener('visibilitychange', onResume);
    const onReviewClose = () => {
      void refresh();
    };
    window.addEventListener('sms-review:close', onReviewClose);
    return () => {
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('sms-review:close', onReviewClose);
    };
  }, []);

  const patchSettings = (patch: Partial<BankSmsSettings>) => {
    const next = saveBankSmsSettings(patch);
    setSettings(next);
    return next;
  };

  const handleEnableAutoRead = async (enabled: boolean) => {
    if (!supported) {
      toast.error('Bank alert sync is Android-only');
      return;
    }

    if (!enabled) {
      patchSettings({ autoReadEnabled: false, overlayEnabled: false });
      await stopSmsBackgroundSync();
      await syncOverlayBubble();
      toast.message('Bank alert sync disabled');
      return;
    }

    if (!settings.disclosedAt) {
      const ok = window.confirm(
        'Vishnu Finance will read bank/UPI alerts from your notification shade (not your full SMS inbox). OTP and personal chats are ignored. Nothing is uploaded until you tap Yes. Continue?',
      );
      if (!ok) return;
      patchSettings({ disclosedAt: Date.now() });
    }

    setBusy(true);
    try {
      let access = await checkNotificationAccess();
      if (!access) {
        await openNotificationAccessSettings();
        toast.message('Enable Vishnu Finance under Notification access, then return here');
        await new Promise((r) => setTimeout(r, 800));
        access = await checkNotificationAccess();
        setNotificationAccess(access);
        if (!access) return;
      }

      setNotificationAccess(true);
      patchSettings({ autoReadEnabled: true });
      await startSmsBackgroundSync();
      const result = await syncBankSmsInbox({ notify: true });
      setPendingCount(result.pending);
      toast.success('Bank alert sync enabled');
    } finally {
      setBusy(false);
    }
  };

  const handleOverlay = async (enabled: boolean) => {
    if (!settings.autoReadEnabled) {
      toast.error('Enable bank alert sync first');
      return;
    }
    if (enabled) {
      const granted = await requestSmsOverlayPermission();
      if (!granted) {
        toast.message('Allow “Display over other apps” in system settings, then try again');
        const perms = await checkSmsBankPermissions();
        setOverlayGranted(Boolean(perms?.overlay));
        if (!perms?.overlay) return;
      }
      setOverlayGranted(true);
    }
    patchSettings({ overlayEnabled: enabled });
    await syncOverlayBubble();
  };

  const handleSyncNow = async () => {
    setBusy(true);
    try {
      const result = await syncBankSmsInbox({ notify: true });
      setPendingCount(result.pending);
      if (result.added === 0) toast.message('No active bank alerts in the notification shade');
    } finally {
      setBusy(false);
    }
  };

  const reliabilitySteps = [
    {
      label: 'Notification access enabled',
      done: Boolean(reliability?.notificationAccess),
      action: () => openNotificationAccessSettings(),
      cta: 'Open Notification access',
    },
    {
      label: 'Overlay permission enabled',
      done: Boolean(reliability?.overlay),
      action: () => requestSmsOverlayPermission(),
      cta: 'Enable overlay',
    },
    {
      label: 'Battery optimization unrestricted',
      done: Boolean(reliability?.batteryOptimizationsIgnored),
      action: () => openBatteryOptimizationSettings(),
      cta: 'Open battery settings',
    },
    {
      label: 'Auto-start / background allowed',
      done: false,
      action: () => openAutoStartSettings(),
      cta: `Open ${reliability?.manufacturer || 'device'} startup settings`,
    },
  ];

  if (!supported && Capacitor.isNativePlatform()) {
    return (
      <SettingsPageLayout>
        <p className="text-sm text-muted-foreground">Bank alert sync is available on Android only.</p>
      </SettingsPageLayout>
    );
  }

  if (!supported) {
    return (
      <SettingsPageLayout>
        <div className="space-y-3">
          <SettingsSectionHeader>Bank SMS</SettingsSectionHeader>
          <p className="text-sm text-muted-foreground">
            Install the Android app to capture Indian bank/UPI alerts from notifications, confirm
            drafts, and reconcile with monthly PDF statements.
          </p>
        </div>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout>
      <div className="space-y-1.5">
        <SettingsSectionHeader>Bank alert sync</SettingsSectionHeader>
        <SettingsGroup>
          <SettingsToggleRow
            label="Enable sync"
            hint="Read bank/UPI alerts from notifications. Confirm before saving."
            checked={settings.autoReadEnabled}
            onCheckedChange={(checked) => void handleEnableAutoRead(checked)}
            disabled={busy}
          />
          <SettingsToggleRow
            label="Floating bubble"
            hint="Show floating bubble when alerts need review (no permanent notification)"
            checked={settings.overlayEnabled}
            onCheckedChange={(checked) => void handleOverlay(checked)}
            disabled={busy || !settings.autoReadEnabled}
            bordered
          />
        </SettingsGroup>
      </div>

      {!notificationAccess && (
        <div className="space-y-1.5">
          <SettingsSectionHeader>Grant Notification access</SettingsSectionHeader>
          <SettingsFieldGroup bordered className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No SMS permission needed. Turn on Notification access so Vishnu Finance can read
              bank/UPI alerts as they appear.
            </p>
            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-foreground">
              <li>Tap Open Notification access</li>
              <li>
                Find <span className="font-medium">Vishnu Finance</span>
              </li>
              <li>Enable the toggle</li>
              <li>Return here and turn on Enable sync</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="btn-touch"
                onClick={() => void openNotificationAccessSettings()}
              >
                <Bell className="mr-2 size-4" />
                Open Notification access
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="btn-touch"
                disabled={busy}
                onClick={() => void refresh()}
              >
                I enabled it — refresh
              </Button>
            </div>
          </SettingsFieldGroup>
        </div>
      )}

      <div className="space-y-1.5">
        <SettingsSectionHeader>Status</SettingsSectionHeader>
        <SettingsFieldGroup bordered className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Notification access: {notificationAccess ? 'granted' : 'not granted'} · Overlay:{' '}
            {overlayGranted ? 'granted' : 'not granted'} · Pending: {pendingCount}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="btn-touch"
              disabled={busy || !settings.autoReadEnabled}
              onClick={() => void handleSyncNow()}
            >
              <RefreshCw className="mr-2 size-4" />
              Sync active alerts
            </Button>
            <Button
              type="button"
              size="sm"
              className="btn-touch"
              disabled={pendingCount === 0}
              onClick={() => openSmsReview()}
            >
              <MessageSquareText className="mr-2 size-4" />
              Review pending {pendingCount > 0 ? `(${pendingCount})` : ''}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="btn-touch"
              onClick={() => {
                clearRejectedSms();
                void refresh();
                toast.message('Cleared rejected alerts');
              }}
            >
              Clear rejected
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Captures new alerts going forward. Tap the floating bubble (or a new-alert
            notification) to review immediately — no need to dig through Settings.
          </p>
        </SettingsFieldGroup>
      </div>

      <div className="space-y-1.5">
        <SettingsSectionHeader>Background reliability setup</SettingsSectionHeader>
        <SettingsFieldGroup bordered className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No permanent notification is used. Complete these once so the floating bubble remains
            available when the app is in background.
          </p>
          <div className="space-y-2">
            {reliabilitySteps.map((step) => (
              <div
                key={step.label}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    className={`size-4 ${step.done ? 'text-success' : 'text-muted-foreground'}`}
                  />
                  <span className="text-sm">{step.label}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={step.done ? 'ghost' : 'secondary'}
                  className="btn-touch"
                  onClick={() => void step.action()}
                >
                  {step.done ? 'Done' : step.cta}
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="btn-touch"
              onClick={() => void refresh()}
            >
              <RefreshCw className="mr-2 size-4" />
              Re-check status
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="btn-touch"
              onClick={() => void openAppSettings()}
            >
              <BatteryCharging className="mr-2 size-4" />
              Open app settings
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: after opening recent apps, lock Vishnu Finance if your device supports lock/pin.
          </p>
        </SettingsFieldGroup>
      </div>
    </SettingsPageLayout>
  );
}
