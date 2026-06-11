'use client';

import { usePathname } from 'next/navigation';

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname} className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
