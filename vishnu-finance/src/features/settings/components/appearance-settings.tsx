'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SettingsPageLayout,
  SettingsSectionHeader,
  SettingsGroup,
  SettingsFieldGroup,
  SettingsThemePicker,
  SettingsSaveBar,
  SettingsPickerRow,
} from '@/features/settings/components/settings-ui';

export type AppearancePreferences = {
  language: string;
  dateFormat: string;
  timezone: string;
};

type AppearanceSettingsProps = {
  theme: string;
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  preferences: AppearancePreferences;
  onPreferencesChange: (next: Partial<AppearancePreferences>) => void;
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  lastUpdated?: Date | null;
  loading: boolean;
  saved: boolean;
  onSave: () => void;
};

const CURRENCIES = [
  ['INR', 'Indian Rupee (₹)'],
  ['USD', 'US Dollar ($)'],
  ['EUR', 'Euro (€)'],
  ['GBP', 'British Pound (£)'],
  ['SGD', 'Singapore Dollar (S$)'],
  ['AED', 'UAE Dirham'],
] as const;

const LANGUAGES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
};

const TIMEZONES: Record<string, string> = {
  'Asia/Kolkata': 'Asia/Kolkata (IST)',
  UTC: 'UTC',
  'America/New_York': 'America/New_York',
  'Europe/London': 'Europe/London',
};

function PickerSelect({
  id,
  value,
  onValueChange,
  options,
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} aria-label={id} />
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AppearanceSettings({
  theme,
  onThemeChange,
  preferences,
  onPreferencesChange,
  selectedCurrency,
  onCurrencyChange,
  lastUpdated,
  loading,
  saved,
  onSave,
}: AppearanceSettingsProps) {
  const currencyLabel =
    CURRENCIES.find(([code]) => code === selectedCurrency)?.[1] ?? selectedCurrency;

  return (
    <SettingsPageLayout>
      <div className="space-y-1.5">
        <SettingsSectionHeader>Theme</SettingsSectionHeader>
        <SettingsGroup>
          <SettingsFieldGroup className="py-3 lg:py-4">
            <SettingsThemePicker value={theme} onChange={onThemeChange} />
          </SettingsFieldGroup>
        </SettingsGroup>
      </div>

      <div className="space-y-1.5">
        <SettingsSectionHeader>Region</SettingsSectionHeader>
        <SettingsGroup>
          <SettingsPickerRow
            label="Language"
            value={LANGUAGES[preferences.language] ?? preferences.language}
            trigger={
              <PickerSelect
                id="language-picker"
                value={preferences.language}
                onValueChange={(value) => onPreferencesChange({ language: value })}
                options={Object.entries(LANGUAGES).map(([value, label]) => ({ value, label }))}
              />
            }
          />
          <SettingsPickerRow
            label="Currency"
            value={currencyLabel}
            bordered
            trigger={
              <PickerSelect
                id="currency-picker"
                value={selectedCurrency}
                onValueChange={onCurrencyChange}
                options={CURRENCIES.map(([value, label]) => ({ value, label }))}
              />
            }
          />
          <SettingsPickerRow
            label="Timezone"
            value={TIMEZONES[preferences.timezone] ?? preferences.timezone}
            bordered
            trigger={
              <PickerSelect
                id="timezone-picker"
                value={preferences.timezone}
                onValueChange={(value) => onPreferencesChange({ timezone: value })}
                options={Object.entries(TIMEZONES).map(([value, label]) => ({ value, label }))}
              />
            }
          />
          <SettingsPickerRow
            label="Date format"
            value={preferences.dateFormat}
            bordered
            trigger={
              <PickerSelect
                id="date-format-picker"
                value={preferences.dateFormat}
                onValueChange={(value) => onPreferencesChange({ dateFormat: value })}
                options={[
                  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                ]}
              />
            }
          />
          {lastUpdated && (
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Rates updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </SettingsGroup>
      </div>

      <SettingsSaveBar onSave={onSave} loading={loading} saved={saved} />
    </SettingsPageLayout>
  );
}
