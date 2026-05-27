import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface PageHeroProps {
  tag?: string;
  title: string;
  subtitle?: ReactNode;
  className?: string;
}

export function PageHero({ tag, title, subtitle, className }: PageHeroProps) {
  return (
    <div className={cn('mb-5', className)}>
      {tag && <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-hint">{tag}</div>}
      <h1 className="text-[22px] font-medium text-foreground">{title}</h1>
      {subtitle && <div className="mt-1 text-[13px] text-hint">{subtitle}</div>}
    </div>
  );
}
