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
  PieChart,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const desktopNavSections: NavSection[] = [
  {
    id: 'core',
    label: 'Core',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
      { href: '/advisor', label: 'Advisor', icon: Brain },
      { href: '/transactions', label: 'Transactions', icon: ReceiptText },
      { href: '/plans', label: 'Plans', icon: Layers },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { href: '/salary', label: 'Salary', icon: Wallet },
      { href: '/investments', label: 'Investments', icon: LineChart },
      { href: '/net-worth', label: 'Net Worth', icon: Landmark },
      { href: '/financial-health', label: 'Health', icon: Heart },
      { href: '/analytics', label: 'Analytics', icon: PieChart },
      { href: '/reports', label: 'Reports', icon: FileBarChart },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/education', label: 'Education', icon: BookOpen },
    ],
  },
];

/** Flat desktop sidebar — no section headers */
export const desktopNavItems: NavItem[] = desktopNavSections.flatMap((s) => s.items);

/** Flat list for mobile bottom nav, page titles, and legacy consumers */
export const primaryNavItemsConfig: NavItem[] = desktopNavSections.flatMap((s) => s.items);

/** Extra routes not in bottom nav primary tabs */
export const secondaryRouteTitles: Record<string, string> = {
  '/profile': 'Profile',
  '/phase-plan': 'Phase Plan',
  '/net-worth': 'Assets & debt',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
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
    (item) => pathname === item.href || pathname.startsWith(item.href + '/'),
  );
  return match?.label ?? 'Vishnu Finance';
}

/** Secondary routes surfaced in Dashboard Overview Explore grid */
export const mobileExploreItems: NavItem[] = [
  ...desktopNavSections.find((s) => s.id === 'finance')!.items,
  ...desktopNavSections.find((s) => s.id === 'account')!.items.filter((i) => i.href !== '/settings'),
];

export const mobileBottomNavItems = desktopNavSections.find((s) => s.id === 'core')!.items;
