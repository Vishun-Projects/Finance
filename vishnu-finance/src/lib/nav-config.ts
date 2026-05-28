import {
  LayoutGrid,
  Heart,
  ReceiptText,
  Layers,
  Brain,
  Settings,
  Wallet,
  BookOpen,
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
  { href: '/education', label: 'Insights', icon: BookOpen },
  { href: '/financial-health', label: 'Health Score', icon: Heart },
  { href: '/salary', label: 'Salary', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
];

/** Extra routes not in bottom nav primary tabs */
export const secondaryRouteTitles: Record<string, string> = {
  '/profile': 'Profile',
  '/phase-plan': 'Phase Plan',
  '/education/daily-news/history': 'News History',
};

export function getPageTitle(pathname: string): string {
  const exactSecondary = secondaryRouteTitles[pathname];
  if (exactSecondary) return exactSecondary;

  if (pathname.startsWith('/education/daily-news/')) {
    return 'Daily News';
  }
  if (pathname.startsWith('/education/')) {
    return 'Insights';
  }

  const match = primaryNavItemsConfig.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  return match?.label ?? 'Vishnu Finance';
}

export const mobilePrimaryNavItems = [
  ...primaryNavItemsConfig.slice(0, 4),
  { href: '#menu', label: 'More', icon: BookOpen }, // icon replaced in Navigation
];

export const mobileDrawerItems = primaryNavItemsConfig.slice(4);
