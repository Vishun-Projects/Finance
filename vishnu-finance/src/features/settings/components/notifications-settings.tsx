'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SettingsPageLayout,
  SettingsSectionHeader,
  SettingsGroup,
  SettingsToggleRow,
  SettingsFormField,
  SettingsSaveBar,
} from '@/features/settings/components/settings-ui';

export type NotificationPreferences = {
  emailEnabled: boolean;
  telegramEnabled: boolean;
  dailyQuoteEnabled: boolean;
  notificationEmail: string;
  telegramUserId: string;
};

type NotificationsSettingsProps = {
  preferences: NotificationPreferences;
  onPreferencesChange: (next: Partial<NotificationPreferences>) => void;
  pushEnabled: boolean;
  pushSupported: boolean;
  onPushToggle: (checked: boolean) => void;
  loading: boolean;
  saved: boolean;
  onSave: () => void;
  onTestAlert: () => void;
};

export function NotificationsSettings({
  preferences,
  onPreferencesChange,
  pushEnabled,
  pushSupported,
  onPushToggle,
  loading,
  saved,
  onSave,
  onTestAlert,
}: NotificationsSettingsProps) {
  return (
    <SettingsPageLayout>
      <div className="space-y-1.5">
        <SettingsSectionHeader>Channels</SettingsSectionHeader>
        <SettingsGroup>
          <SettingsToggleRow
            label="Email alerts"
            hint="Monthly digests and important updates"
            checked={preferences.emailEnabled}
            onCheckedChange={(checked) => onPreferencesChange({ emailEnabled: checked })}
          />
          <SettingsToggleRow
            label="Push notifications"
            hint={pushSupported ? 'Browser and mobile alerts' : 'Not supported in this browser'}
            checked={pushEnabled}
            onCheckedChange={onPushToggle}
            disabled={!pushSupported}
            bordered
          />
          <SettingsToggleRow
            label="Telegram"
            hint="Instant briefings via bot"
            checked={preferences.telegramEnabled}
            onCheckedChange={(checked) => onPreferencesChange({ telegramEnabled: checked })}
            bordered
          />
          <SettingsToggleRow
            label="Daily quote"
            hint="Morning inspiration and focus"
            checked={preferences.dailyQuoteEnabled}
            onCheckedChange={(checked) => onPreferencesChange({ dailyQuoteEnabled: checked })}
            bordered
          />
        </SettingsGroup>
      </div>

      {(preferences.emailEnabled || preferences.telegramEnabled) && (
        <div className="space-y-1.5">
          <SettingsSectionHeader>Delivery</SettingsSectionHeader>
          <SettingsGroup>
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 lg:p-4">
              {preferences.emailEnabled && (
                <SettingsFormField id="notification-email" label="Delivery email">
                  <Input
                    id="notification-email"
                    type="email"
                    placeholder="you@example.com"
                    value={preferences.notificationEmail}
                    onChange={(e) =>
                      onPreferencesChange({ notificationEmail: e.target.value })
                    }
                  />
                </SettingsFormField>
              )}
              {preferences.telegramEnabled && (
                <SettingsFormField
                  id="telegram-id"
                  label="Telegram chat ID"
                  bordered={preferences.emailEnabled}
                >
                  <Input
                    id="telegram-id"
                    placeholder="Your Telegram chat ID"
                    value={preferences.telegramUserId}
                    onChange={(e) =>
                      onPreferencesChange({ telegramUserId: e.target.value })
                    }
                  />
                </SettingsFormField>
              )}
            </div>
          </SettingsGroup>
        </div>
      )}

      <SettingsSaveBar
        onSave={onSave}
        loading={loading}
        saved={saved}
        saveLabel="Save alerts"
        secondaryAction={
          <Button type="button" variant="outline" onClick={onTestAlert} className="w-full lg:w-auto">
            Send test
          </Button>
        }
      />
    </SettingsPageLayout>
  );
}
