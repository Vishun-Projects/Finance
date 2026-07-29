'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { MessageSquareText, RefreshCw, Settings2 } from 'lucide-react';
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
  checkSmsBankPermissions,
  isSmsBankReaderSupported,
  openSmsAppSettings,
  requestSmsBankPermissions,
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
import { syncBankSmsInbox, syncOverlayBubble } from '@/lib/sms-bank/sync';
import { SmsReviewPanel } from '@/features/settings/components/sms-review-panel';

export function BankSmsSettings() {
  const supported = isSmsBankReaderSupported();
  const [settings, setSettings] = useState<BankSmsSettings>(() => getBankSmsSettings());
  const [pendingCount, setPendingCount] = useState(0);
  const [smsGranted, setSmsGranted] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [restrictedLikely, setRestrictedLikely] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const refresh = async () => {
    setSettings(getBankSmsSettings());
    setPendingCount(countPendingSms());
    const perms = await checkSmsBankPermissions();
    setSmsGranted(perms?.sms === 'granted');
    setOverlayGranted(Boolean(perms?.overlay));
    setRestrictedLikely(Boolean(perms?.restrictedLikely) || perms?.sms === 'denied');
  };

  useEffect(() => {
    void refresh();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('review') === '1' || params.get('smsReview') === '1') {
        setShowReview(true);
      }
    }
  }, []);

  const patchSettings = (patch: Partial<BankSmsSettings>) => {
    const next = saveBankSmsSettings(patch);
    setSettings(next);
    return next;
  };

  const handleEnableAutoRead = async (enabled: boolean) => {
    if (!supported) {
      toast.error('Bank SMS reading is Android-only');
      return;
    }

    if (!enabled) {
      patchSettings({ autoReadEnabled: false, overlayEnabled: false });
      await stopSmsBackgroundSync();
      await syncOverlayBubble();
      toast.message('Bank SMS auto-read disabled');
      return;
    }

    if (!settings.disclosedAt) {
      const ok = window.confirm(
        'Vishnu Finance will scan only Indian bank/UPI SMS senders on this device. OTP and personal chats are ignored. Nothing is uploaded until you tap Yes on each draft. Continue?',
      );
      if (!ok) return;
      patchSettings({ disclosedAt: Date.now() });
    }

    setBusy(true);
    try {
      const perms = await requestSmsBankPermissions();
      if (perms?.sms !== 'granted') {
        setRestrictedLikely(Boolean(perms?.restrictedLikely) || true);
        toast.error('SMS blocked by Android — unlock restricted settings first');
        return;
      }
      setSmsGranted(true);
      setRestrictedLikely(false);
      patchSettings({ autoReadEnabled: true });
      await startSmsBackgroundSync();
      const result = await syncBankSmsInbox({ notify: true });
      setPendingCount(result.pending);
      toast.success('Bank SMS auto-read enabled');
    } finally {
      setBusy(false);
    }
  };

  const handleOverlay = async (enabled: boolean) => {
    if (!settings.autoReadEnabled) {
      toast.error('Enable bank SMS auto-read first');
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
      if (result.added === 0) toast.message('No new bank SMS found');
    } finally {
      setBusy(false);
    }
  };

  if (!supported && Capacitor.isNativePlatform()) {
    return (
      <SettingsPageLayout>
        <p className="text-sm text-muted-foreground">
          Bank SMS auto-read is available on Android only.
        </p>
      </SettingsPageLayout>
    );
  }

  if (!supported) {
    return (
      <SettingsPageLayout>
        <div className="space-y-3">
          <SettingsSectionHeader>Bank SMS</SettingsSectionHeader>
          <p className="text-sm text-muted-foreground">
            Install the Android app to read Indian bank SMS on-device, confirm drafts, and reconcile
            them with monthly PDF statements. This feature is not available in the browser.
          </p>
        </div>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout>
      <div className="space-y-1.5">
        <SettingsSectionHeader>Bank SMS auto-read</SettingsSectionHeader>
        <SettingsGroup>
          <SettingsToggleRow
            label="Enable sync"
            hint="Read Indian bank/UPI alerts on this device. Confirm before saving."
            checked={settings.autoReadEnabled}
            onCheckedChange={(checked) => void handleEnableAutoRead(checked)}
            disabled={busy}
          />
          <SettingsToggleRow
            label="Floating count bubble"
            hint="Shows pending review count over other apps (off by default)"
            checked={settings.overlayEnabled}
            onCheckedChange={(checked) => void handleOverlay(checked)}
            disabled={busy || !settings.autoReadEnabled}
            bordered
          />
        </SettingsGroup>
      </div>

      {!smsGranted && (
        <div className="space-y-1.5">
          <SettingsSectionHeader>Unlock SMS permission</SettingsSectionHeader>
          <SettingsFieldGroup bordered className="space-y-3">
            <p className="text-sm text-muted-foreground">
              On HyperOS / Android 13+, sideloaded apps block SMS until you allow restricted
              settings. “Allow” stays greyed out until you do this:
            </p>
            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-foreground">
              <li>Open App info (button below)</li>
              <li>Tap the ⋮ menu (top right)</li>
              <li>Enable <span className="font-medium">Allow restricted settings</span></li>
              <li>Go to Permissions → SMS → Allow</li>
              <li>Return here and turn on Enable sync</li>
            </ol>
            {restrictedLikely && (
              <p className="text-xs text-warning">
                Android reported a restricted / denied SMS state for this install.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="btn-touch"
                onClick={() => void openSmsAppSettings()}
              >
                <Settings2 className="mr-2 size-4" />
                Open App info
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="btn-touch"
                disabled={busy}
                onClick={() => void handleEnableAutoRead(true)}
              >
                Retry SMS permission
              </Button>
            </div>
          </SettingsFieldGroup>
        </div>
      )}

      <div className="space-y-1.5">
        <SettingsSectionHeader>Status</SettingsSectionHeader>
        <SettingsFieldGroup bordered className="space-y-3">
          <p className="text-sm text-muted-foreground">
            SMS permission: {smsGranted ? 'granted' : 'not granted'} · Overlay:{' '}
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
              Sync inbox
            </Button>
            <Button
              type="button"
              size="sm"
              className="btn-touch"
              disabled={pendingCount === 0}
              onClick={() => setShowReview(true)}
            >
              <MessageSquareText className="mr-2 size-4" />
              Review {pendingCount > 0 ? `(${pendingCount})` : ''}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="btn-touch"
              onClick={() => {
                clearRejectedSms();
                void refresh();
                toast.message('Cleared rejected SMS');
              }}
            >
              Clear rejected
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a monthly PDF statement on Transactions to verify SMS imports by unique bank
            reference and optionally enrich empty notes.
          </p>
        </SettingsFieldGroup>
      </div>

      {showReview && (
        <SmsReviewPanel
          onClose={() => {
            setShowReview(false);
            void refresh();
          }}
          onChanged={() => {
            setPendingCount(countPendingSms());
            void syncOverlayBubble();
          }}
        />
      )}
    </SettingsPageLayout>
  );
}
