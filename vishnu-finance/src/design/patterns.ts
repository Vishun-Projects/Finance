import { cn } from '@/lib/utils';

/** Layout patterns — declare once, use everywhere */
export const patterns = {
  /** Page padding — applied once in app layout */
  pageShell: 'w-full px-5 py-8 sm:px-8 lg:px-10',
  /** Tighter mobile page padding (below lg) */
  pageShellMobile: 'w-full px-4 py-4 lg:px-10 lg:py-8',
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
  /** Sticky page header below mobile top bar */
  mobilePageHeader:
    'sticky top-[calc(3rem+env(safe-area-inset-top))] z-30 lg:hidden bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 py-3',
  /** Minimum 44px touch target */
  touchTarget: 'min-h-11 min-w-11 inline-flex items-center justify-center',
  /** Bottom sheet styling */
  bottomSheet:
    'rounded-t-2xl border-t max-h-[min(92vh,calc(100dvh-env(safe-area-inset-top)))] safe-bottom overflow-y-auto',
  /** Standard card list spacing for mobile table replacements */
  mobileCardList: 'space-y-3 md:hidden',
} as const;

export function pattern(name: keyof typeof patterns, className?: string) {
  return cn(patterns[name], className);
}
