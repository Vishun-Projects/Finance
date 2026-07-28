import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReactNode } from 'react';

export type AppRouteLoaderVariant =
  | 'generic'
  | 'dashboard'
  | 'transactions'
  | 'plans'
  | 'advisor'
  | 'salary'
  | 'health'
  | 'settings'
  | 'investments'
  | 'net-worth'
  | 'reports'
  | 'education';

interface AppRouteLoaderProps {
  variant?: AppRouteLoaderVariant;
  title?: string;
  className?: string;
}

function MandateBand() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-6 w-40 max-w-[70%]" />
      <Skeleton className="h-3 w-56 max-w-full" />
      <div className="flex flex-wrap gap-2 pt-1">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <MandateBand />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Skeleton className="h-96 rounded-md" />
        <div className="space-y-4">
          <Skeleton className="h-52 rounded-md" />
          <Skeleton className="h-64 rounded-md" />
        </div>
      </div>
    </>
  );
}

function TransactionsSkeleton() {
  return (
    <>
      <MandateBand />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
      <div className="grid min-h-[20rem] flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <Skeleton className="h-full min-h-[16rem] rounded-md" />
        <Skeleton className="hidden h-full min-h-[16rem] rounded-md lg:block" />
      </div>
    </>
  );
}

function PlansSkeleton() {
  return (
    <>
      <MandateBand />
      <Skeleton className="h-9 w-full max-w-xs rounded-[13px]" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-md" />
    </>
  );
}

function AdvisorSkeleton() {
  return (
    <>
      <div className="space-y-2 border-b border-border pb-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-9 w-full max-w-xs rounded-[13px]" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-md" />
        <Skeleton className="h-40 rounded-md" />
        <Skeleton className="h-28 rounded-md" />
      </div>
    </>
  );
}

function SalarySkeleton() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-36 rounded-md" />
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Skeleton className="h-48 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
      </div>
    </>
  );
}

function HealthSkeleton() {
  return (
    <>
      <MandateBand />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-72 rounded-md lg:col-span-5" />
        <Skeleton className="h-72 rounded-md lg:col-span-7" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-md" />
        ))}
      </div>
    </>
  );
}

function SettingsSkeleton() {
  return (
    <>
      <MandateBand />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <Skeleton className="hidden h-64 rounded-md lg:block" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xs rounded-md" />
          <Skeleton className="h-48 rounded-md" />
          <Skeleton className="h-48 rounded-md" />
        </div>
      </div>
    </>
  );
}

function InvestmentsSkeleton() {
  return (
    <>
      <MandateBand />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-md" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Skeleton className="h-48 rounded-md" />
        <Skeleton className="h-48 rounded-md" />
      </div>
    </>
  );
}

function NetWorthSkeleton() {
  return (
    <>
      <MandateBand />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-md" />
        <Skeleton className="h-72 rounded-md" />
      </div>
    </>
  );
}

function ReportsSkeleton() {
  return (
    <>
      <MandateBand />
      <Skeleton className="h-10 w-full max-w-md rounded-md" />
      <Skeleton className="h-96 rounded-md" />
    </>
  );
}

function EducationSkeleton() {
  return (
    <>
      <MandateBand />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-40 rounded-md" />
        ))}
      </div>
    </>
  );
}

function GenericSkeleton() {
  return (
    <>
      <MandateBand />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="md:col-span-2 h-64 rounded-md" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-md" />
          <Skeleton className="h-32 rounded-md" />
        </div>
      </div>
    </>
  );
}

const VARIANTS: Record<AppRouteLoaderVariant, () => ReactNode> = {
  generic: GenericSkeleton,
  dashboard: DashboardSkeleton,
  transactions: TransactionsSkeleton,
  plans: PlansSkeleton,
  advisor: AdvisorSkeleton,
  salary: SalarySkeleton,
  health: HealthSkeleton,
  settings: SettingsSkeleton,
  investments: InvestmentsSkeleton,
  'net-worth': NetWorthSkeleton,
  reports: ReportsSkeleton,
  education: EducationSkeleton,
};

export function AppRouteLoader({
  variant = 'generic',
  title = 'Loading page',
  className,
}: AppRouteLoaderProps) {
  const Body = VARIANTS[variant];

  return (
    <div
      className={cn(
        'w-full animate-in fade-in duration-300',
        'space-y-5 px-4 py-4 sm:px-6 lg:px-10 lg:py-8',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{title}</span>
      <Body />
    </div>
  );
}
