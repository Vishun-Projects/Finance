import { cn } from '@/lib/utils';

/** Layout patterns — declare once, use everywhere */
export const patterns = {
  /** Page padding — applied once in app layout */
  pageShell: 'w-full px-5 py-8 sm:px-8 lg:px-10',
  /** Fluid full-width content (no max-width cap) */
  pageFluid: 'w-full',
  /** @deprecated use pageFluid */
  pageContent: 'w-full',
  /** @deprecated use pageFluid */
  pageContentWide: 'w-full',
  sectionGap: 'mb-5',
  cardGrid: 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4',
  sidebar: 'flex w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-surface py-8 px-6',
  mainArea: 'flex-1 overflow-y-auto overflow-x-hidden bg-background custom-scrollbar',
} as const;

export function pattern(name: keyof typeof patterns, className?: string) {
  return cn(patterns[name], className);
}
