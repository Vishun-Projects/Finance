'use client';

import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { cn, formatRupees } from '@/lib/utils';
import type { BucketAdherence } from '@/lib/plan-adherence-service';

function progressClass(status: BucketAdherence['status']) {
  if (status === 'over') return '[&>div]:bg-[var(--danger)]';
  if (status === 'warning') return '[&>div]:bg-[var(--warning)]';
  return '[&>div]:bg-[var(--success)]';
}

interface BudgetProgressRowProps {
  bucket: BucketAdherence;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function BudgetProgressRow({ bucket, href, onClick, className }: BudgetProgressRowProps) {
  const content = (
    <>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium text-foreground">{bucket.label}</span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted">
          {formatRupees(bucket.actual)}{' '}
          <span className={cn(bucket.status === 'over' ? 'text-[var(--danger)]' : 'text-[var(--success)]')}>
            / {formatRupees(bucket.planned)}
          </span>
        </span>
      </div>
      <Progress value={Math.min(100, bucket.percentUsed)} className={cn('h-1', progressClass(bucket.status))} />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn('block rounded-md px-1 py-1.5 transition-colors active:bg-muted/40', className)}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn('block w-full rounded-md px-1 py-1.5 text-left transition-colors active:bg-muted/40', className)}
      >
        {content}
      </button>
    );
  }

  return <div className={cn('px-1 py-1.5', className)}>{content}</div>;
}
