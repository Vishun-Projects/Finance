import type { AppRouteLoaderVariant } from '@/components/feedback/app-route-loader';
import { getPageTitle } from '@/lib/nav-config';

/** Show skeleton if navigation exceeds this — Doherty threshold (~400ms). */
export const DOHERTY_THRESHOLD_MS = 400;

export function getRouteLoaderVariant(pathname: string): AppRouteLoaderVariant {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/transactions')) return 'transactions';
  if (pathname.startsWith('/plans')) return 'plans';
  if (pathname.startsWith('/advisor')) return 'advisor';
  if (pathname.startsWith('/salary')) return 'salary';
  if (pathname.startsWith('/financial-health')) return 'health';
  if (pathname.startsWith('/settings') || pathname.startsWith('/profile')) return 'settings';
  if (pathname.startsWith('/investments')) return 'investments';
  if (pathname.startsWith('/net-worth') || pathname.startsWith('/phase-plan')) return 'net-worth';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/education')) return 'education';
  return 'generic';
}

export function getRouteLoaderTitle(pathname: string): string {
  return `Loading ${getPageTitle(pathname)}`;
}
