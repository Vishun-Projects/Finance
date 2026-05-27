'use client';

import React, { ReactNode } from 'react';
import { PageHeaderProvider } from '@/contexts/PageHeaderContext';

/** Legacy layout provider — navigation is responsive by viewport, not user preference. */
export function LayoutProvider({ children }: { children: ReactNode }) {
  return <PageHeaderProvider>{children}</PageHeaderProvider>;
}
