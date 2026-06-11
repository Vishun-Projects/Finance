export type ScrollMode = 'page' | 'table';

export interface RouteLayoutConfig {
  scrollMode: ScrollMode;
  /** Hide global mobile top bar; page owns its header */
  hideGlobalTopBar: boolean;
  /** Skip pt-14 offset under global top bar on mobile */
  noTopOffset: boolean;
  /** Full-bleed content (no horizontal padding) */
  fullBleed: boolean;
  /** Shell fills main height without page padding (table-scroll routes) */
  tableScrollShell: boolean;
}

const DEFAULT: RouteLayoutConfig = {
  scrollMode: 'page',
  hideGlobalTopBar: false,
  noTopOffset: false,
  fullBleed: false,
  tableScrollShell: false,
};

const ROUTE_OVERRIDES: Record<string, Partial<RouteLayoutConfig>> = {
  '/dashboard': { hideGlobalTopBar: true, noTopOffset: true },
  '/plans': { hideGlobalTopBar: true, noTopOffset: true },
  '/advisor': { hideGlobalTopBar: true, noTopOffset: true, fullBleed: true },
  '/transactions': {
    scrollMode: 'table',
    tableScrollShell: true,
    hideGlobalTopBar: true,
    noTopOffset: true,
  },
};

function matchRoute(pathname: string): Partial<RouteLayoutConfig> | undefined {
  if (ROUTE_OVERRIDES[pathname]) return ROUTE_OVERRIDES[pathname];
  for (const [prefix, config] of Object.entries(ROUTE_OVERRIDES)) {
    if (prefix !== '/' && pathname.startsWith(prefix + '/')) return config;
  }
  return undefined;
}

export function getRouteLayoutConfig(pathname: string): RouteLayoutConfig {
  const override = matchRoute(pathname);
  return { ...DEFAULT, ...override };
}

export function hideGlobalTopBar(pathname: string): boolean {
  return getRouteLayoutConfig(pathname).hideGlobalTopBar;
}
