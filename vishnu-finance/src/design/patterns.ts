import { cn } from '@/lib/utils';

/** Layout patterns — declare once, use everywhere */
export const patterns = {
  /** Page padding — applied once in app layout */
  pageShell: 'w-full px-5 py-8 sm:px-8 lg:px-10',
  /** Tighter mobile page padding (below lg) */
  pageShellMobile: 'w-full px-4 py-4 lg:px-10 lg:py-8',
  /** Fluid full-width content (no max-width cap) */
  pageFluid: 'w-full',
  sectionGap: 'mb-5',
  cardGrid: 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4',
  sidebar: 'flex w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-surface py-8 px-6',
  mainArea: 'flex-1 overflow-y-auto overflow-x-hidden bg-background custom-scrollbar',
  /** Sticky page header below mobile top bar */
  mobilePageHeader:
    'sticky top-[calc(3rem+env(safe-area-inset-top))] z-30 lg:hidden glass-ultra-thin glass-text px-3 py-3',
  /** Minimum 44px touch target */
  touchTarget: 'min-h-11 min-w-11 inline-flex items-center justify-center',
  /** Bottom sheet base styling */
  bottomSheetBase:
    'glass-thick glass-text glass-sheet-bottom safe-bottom overflow-hidden flex flex-col',
  /** Default bottom sheet (medium height) — prefer mobileSheetHeightClasses at call site */
  bottomSheet:
    'glass-thick glass-text glass-sheet-bottom max-h-[min(85dvh,640px)] safe-bottom overflow-hidden flex flex-col',
  /** Standard card list spacing for mobile table replacements */
  mobileCardList: 'space-y-3 lg:hidden',
  /** Horizontal scroll KPI strip on mobile */
  mobileKpiStrip: 'flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  /** Compact KPI pill inside strip */
  mobileKpiPill: 'min-w-[5.5rem] shrink-0 rounded-md p-2.5',
  /** Icon-led compact list row */
  mobileCompactRow: 'py-2.5 px-3',
  /** Collapsible section summary row */
  mobileSectionCollapse: 'border-t border-border',
  /** Hero metric block — primary answer at top of mobile screens */
  mobileHeroMetric: 'rounded-xl border border-border bg-card p-5',
  /** Processed insight card with optional action */
  mobileInsightCard: 'rounded-xl border border-border bg-card/80 p-4',
  /** iOS-style grouped list container */
  mobileGroupedList: 'overflow-hidden rounded-xl border border-border bg-card',
  /** Desktop authenticated content shell */
  desktopContentShell: 'w-full space-y-6 pb-16',
  /** Constrained desktop page column (plans, settings-style pages) */
  pageColumn: 'mx-auto w-full max-w-[var(--page-max-width)]',
  /** Sticky horizontal tab strip under mobile header */
  mobileStickyTabs: 'sticky z-30 flex gap-2 overflow-x-auto pb-1 lg:hidden',
  /** Day-grouped activity feed spacing */
  mobileActivityFeed: 'space-y-1',
} as const;

export function pattern(name: keyof typeof patterns, className?: string) {
  return cn(patterns[name], className);
}
