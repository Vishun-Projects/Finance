'use client';

import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@/features/settings/components/settings-ui/settings-row';

export function SettingsToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
  bordered,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  bordered?: boolean;
}) {
  return (
    <SettingsRow label={label} hint={hint} bordered={bordered}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </SettingsRow>
  );
}
