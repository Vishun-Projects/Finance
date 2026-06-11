'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Calendar, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

interface DashboardSearchBarProps {
  className?: string;
}

export function DashboardSearchBar({ className }: DashboardSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const goSearch = (q?: string) => {
    void hapticLight();
    const params = new URLSearchParams();
    if (q?.trim()) params.set('search', q.trim());
    params.set('range', 'month');
    router.push(`/transactions?${params.toString()}`);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <form
        className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 py-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          goSearch(query);
        }}
      >
        <Search className="size-4 shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transactions, payees…"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          aria-label="Search transactions"
        />
      </form>
      <button
        type="button"
        onClick={() => goSearch()}
        className="btn-touch flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2.5 text-xs font-medium text-foreground"
      >
        <Calendar className="size-3.5 text-muted" />
        Month
      </button>
    </div>
  );
}
