'use client';

import { useEffect, useState } from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface ChartContainerProps {
  height?: number;
  className?: string;
  children: React.ReactElement;
}

/** Recharts needs an explicit pixel height and client mount before chart context initializes. */
export function ChartContainer({ height = 208, className, children }: ChartContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn('w-full overflow-hidden', className)} style={{ height }} aria-hidden />;
  }

  return (
    <div className={cn('w-full overflow-hidden', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
