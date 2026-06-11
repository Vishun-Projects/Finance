import type { AppRouteLoaderVariant } from '@/components/feedback/app-route-loader';

const PATH_VARIANTS: Array<[string, AppRouteLoaderVariant]> = [
  ['/dashboard', 'dashboard'],
  ['/advisor', 'advisor'],
  ['/transactions', 'transactions'],
  ['/plans', 'plans'],
  ['/salary', 'salary'],
  ['/financial-health', 'generic'],
  ['/settings', 'generic'],
];

export function getRouteLoaderVariant(pathname: string): AppRouteLoaderVariant {
  const match = PATH_VARIANTS.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match?.[1] ?? 'generic';
}
