import {
  LayoutGrid,
  Heart,
  ReceiptText,
  Layers,
  Brain,
  Settings,
  Wallet,
  BookOpen,
  LineChart,
  Landmark,
  FileBarChart,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const primaryNavItemsConfig: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/advisor', label: 'Advisor', icon: Brain },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/plans', label: 'Plans', icon: Layers },
  { href: '/education', label: 'Learn', icon: BookOpen },
  { href: '/financial-health', label: 'Health Score', icon: Heart },
  { href: '/investments', label: 'Investments', icon: LineChart },
  { href: '/salary', label: 'Salary', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
];

/** Extra routes not in bottom nav primary tabs */
export const secondaryRouteTitles: Record<string, string> = {
  '/profile': 'Profile',
  '/phase-plan': 'Phase Plan',
  '/net-worth': 'Assets & debt',
  '/reports': 'Reports',
  '/education/daily-news/history': 'News History',
};

export function getPageTitle(pathname: string): string {
  const exactSecondary = secondaryRouteTitles[pathname];
  if (exactSecondary) return exactSecondary;

  if (pathname.startsWith('/education/daily-news/')) {
    return 'Daily News';
  }
  if (pathname.startsWith('/education/')) {
    return 'Learn';
  }

  const match = primaryNavItemsConfig.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  return match?.label ?? 'Vishnu Finance';
}

/** Secondary routes surfaced in Dashboard Overview Explore grid (ex bottom-nav More drawer) */
export const mobileExploreItems: NavItem[] = [
  ...primaryNavItemsConfig.slice(4),
  { href: '/net-worth', label: 'Net worth', icon: Landmark },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
];

/** @deprecated use primaryNavItemsConfig.slice(0, 4) directly */
export const mobileDrawerItems = mobileExploreItems;

export const mobileBottomNavItems = primaryNavItemsConfig.slice(0, 4);
