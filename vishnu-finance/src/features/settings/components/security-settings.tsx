'use client';

import { useState } from 'react';
import { Trash2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SettingsPageLayout,
  SettingsSectionHeader,
  SettingsGroup,
  SettingsToggleRow,
  SettingsFieldGroup,
  SettingsNavRow,
} from '@/features/settings/components/settings-ui';

type SecuritySettingsProps = {
  privacy: { dataSharing: boolean; analytics: boolean };
  onPrivacyChange: (next: Partial<{ dataSharing: boolean; analytics: boolean }>) => void;
};

export function SecuritySettings({ privacy, onPrivacyChange }: SecuritySettingsProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  return (
    <SettingsPageLayout>
      <div className="space-y-1.5">
        <SettingsSectionHeader>Account</SettingsSectionHeader>
        <SettingsGroup>
          <SettingsNavRow
            label="Change password"
            hint="Update your sign-in password"
            onClick={() => setShowPasswordForm((v) => !v)}
          />
          {showPasswordForm && (
            <SettingsFieldGroup bordered className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input id="current-password" type="password" autoComplete="current-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" />
              </div>
              <Button className="btn-touch w-full sm:w-auto">
                <Key className="mr-2 size-4" />
                Update password
              </Button>
            </SettingsFieldGroup>
          )}
        </SettingsGroup>
      </div>

      <div className="space-y-1.5">
        <SettingsSectionHeader>Privacy</SettingsSectionHeader>
        <SettingsGroup>
          <SettingsToggleRow
            label="Data sharing"
            hint="Anonymous usage data to improve the app"
            checked={privacy.dataSharing}
            onCheckedChange={(checked) => onPrivacyChange({ dataSharing: checked })}
          />
          <SettingsToggleRow
            label="Analytics"
            hint="Help us understand how features are used"
            checked={privacy.analytics}
            onCheckedChange={(checked) => onPrivacyChange({ analytics: checked })}
            bordered
          />
        </SettingsGroup>
      </div>

      <div className="space-y-1.5">
        <SettingsSectionHeader>Danger zone</SettingsSectionHeader>
        <SettingsGroup destructive>
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-destructive">Delete account</p>
              <p className="mt-0.5 text-xs text-destructive/80">
                Permanently remove your account and all data
              </p>
            </div>
            <Button variant="destructive" size="sm" className="btn-touch shrink-0">
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </div>
        </SettingsGroup>
      </div>
    </SettingsPageLayout>
  );
}
