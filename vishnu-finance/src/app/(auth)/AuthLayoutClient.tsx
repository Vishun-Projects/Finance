'use client';

import { useEffect } from 'react';

export function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  // Force light theme on auth pages
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'high-contrast');
    document.documentElement.classList.add('light');
  }, []);

  return <>{children}</>;
}

