'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MindmapNode, MindmapPayload } from '@/lib/advisor-artifacts/types';
import { cn } from '@/lib/utils';

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function MindmapTreeNode({
  node,
  depth,
  defaultOpen,
}: {
  node: MindmapNode;
  depth: number;
  defaultOpen: boolean;
}) {
  const hasChildren = Boolean(node.children?.length);
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn(depth > 0 && 'ml-3 border-l border-border/60 pl-2')}>
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-surface',
          !hasChildren && 'cursor-default hover:bg-transparent',
        )}
        onClick={() => hasChildren && setOpen((v) => !v)}
        aria-expanded={hasChildren ? open : undefined}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted" />
          )
        ) : (
          <span className="size-3.5 shrink-0" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {node.label}
        </span>
        {node.amount != null ? (
          <span className="shrink-0 tabular-nums text-muted">{formatInr(node.amount)}</span>
        ) : null}
      </button>
      {hasChildren && open
        ? node.children!.map((child) => (
            <MindmapTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              defaultOpen={depth < 1}
            />
          ))
        : null}
    </div>
  );
}

interface AdvisorMindmapProps {
  title?: string;
  payload: MindmapPayload;
  className?: string;
}

export function AdvisorMindmap({ title, payload, className }: AdvisorMindmapProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-xl border border-border/70 bg-card/70',
        className,
      )}
    >
      {title ? (
        <div className="border-b border-border/60 px-3.5 py-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            {title}
          </p>
          <p className="text-[10px] text-muted">Expand nodes to drill into categories and merchants</p>
        </div>
      ) : null}
      <div className="max-h-[360px] overflow-y-auto p-3">
        <MindmapTreeNode node={payload.root} depth={0} defaultOpen />
      </div>
    </div>
  );
}
