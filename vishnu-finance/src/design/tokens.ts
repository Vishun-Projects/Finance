export type ChipVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'orange'
  | 'neutral';

export type CalloutVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'orange'
  | 'purple'
  | 'neutral';

export type CategoryVariant = 'needs' | 'wants' | 'emi' | 'invest' | 'insurance';

export const categoryVariantMap: Record<CategoryVariant, ChipVariant> = {
  needs: 'info',
  wants: 'purple',
  emi: 'danger',
  invest: 'success',
  insurance: 'warning',
};

/** CSS variable names for category bar colors — values live only in tokens.css */
export const categoryColorVar: Record<CategoryVariant, string> = {
  needs: 'var(--category-needs)',
  wants: 'var(--category-wants)',
  emi: 'var(--category-emi)',
  invest: 'var(--category-invest)',
  insurance: 'var(--category-insurance)',
};

/** Chart series colors — read from CSS vars at runtime via getComputedStyle if needed */
export const chartColorVars = {
  credits: '--chart-credits',
  debits: '--chart-debits',
} as const;

export const cssVar = {
  bg: '--bg',
  bg2: '--bg2',
  border: '--border',
  text: '--text',
  muted: '--muted',
  hint: '--hint',
  accent: '--accent',
  chromeBg: '--chrome-bg',
  chromeBorder: '--chrome-border',
  chromeFg: '--chrome-fg',
  chromeFgActive: '--chrome-fg-active',
  chromeActive: '--chrome-active',
  textDisplay: '--text-display',
  textTitle: '--text-title',
  textSubtitle: '--text-subtitle',
  textBody: '--text-body',
  textLabel: '--text-label',
  textMicro: '--text-micro',
  spacePageX: '--space-page-x',
  spacePageY: '--space-page-y',
  spaceSection: '--space-section',
} as const;

export const DEFAULT_CATEGORY_COLOR = 'var(--category-default)';

export const CATEGORY_COLOR_PRESETS = [
  'var(--category-preset-01)',
  'var(--category-preset-02)',
  'var(--category-preset-03)',
  'var(--category-preset-04)',
  'var(--category-preset-05)',
  'var(--category-preset-06)',
  'var(--category-preset-07)',
  'var(--category-preset-08)',
  'var(--category-preset-09)',
  'var(--category-preset-10)',
  'var(--category-preset-11)',
  'var(--category-preset-12)',
  'var(--category-preset-13)',
  'var(--category-preset-14)',
  'var(--category-preset-15)',
  'var(--category-preset-16)',
] as const;

export function readCssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function getDefaultCategoryColorHex(): string {
  return readCssVar('--category-needs');
}

export function resolvePresetToHex(preset: string): string {
  if (preset.startsWith('var(')) {
    return readCssVar(preset.slice(4, -1));
  }
  return preset;
}

export function resolveCategoryColor(color?: string | null): string {
  return color ?? DEFAULT_CATEGORY_COLOR;
}

export function getSentimentChipVariant(
  sentimentOrScore: string | number
): ChipVariant {
  if (typeof sentimentOrScore === 'number') {
    if (sentimentOrScore >= 75) return 'success';
    if (sentimentOrScore >= 40) return 'warning';
    return 'danger';
  }

  if (sentimentOrScore === 'Bullish') return 'success';
  if (sentimentOrScore === 'Bearish') return 'danger';
  return 'warning';
}
