import { cn } from '@/lib/utils';

/** Text hierarchy helpers — standard Tailwind sizes (matches pre–visual-hierarchy app) */
export const textRoles = {
  pageTitle: 'text-lg font-semibold text-foreground lg:text-xl',
  mandate: 'text-xs text-muted lg:text-sm',
  metricLabel: 'text-[10px] font-medium uppercase tracking-[0.06em] text-hint',
  metricValue: 'text-sm font-semibold tabular-nums text-foreground',
  navLabel: 'text-[10px] font-medium text-muted-foreground',
  navLabelActive: 'text-[10px] font-semibold text-foreground',
  sectionLabel: 'text-[11px] font-medium uppercase tracking-[0.08em] text-hint',
  body: 'text-sm text-foreground',
} as const;

export type TextRole = keyof typeof textRoles;

export function textRole(role: TextRole, className?: string) {
  return cn(textRoles[role], className);
}
