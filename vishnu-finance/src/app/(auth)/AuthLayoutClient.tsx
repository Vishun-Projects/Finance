'use client';

import { useEffect } from 'react';

export function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  // Theme is managed by ThemeProvider, do not force light mode
  return <>{children}</>;
}

