'use client';

import React, { useState, useMemo } from 'react';
import { Search, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import QuickRangeChips, { type QuickRange } from './quick-range-chips';

export const TransactionFilterContent = React.memo(function TransactionFilterContent({
  initialFilters,
  categories,
  onApply,
  onReset,
  computeRange,
}: {
  initialFilters: {
    search: string;
    categoryId: string;
    type: string;
    amountPreset: string;
    range: QuickRange;
    startDate: string;
    endDate: string;
  };
  categories: Array<{ id: string; name: string }>;
  onApply: (filters: typeof initialFilters) => void;
  onReset: () => void;
  computeRange: (range: QuickRange) => [string, string];
}) {
  const [draft, setDraft] = useState(initialFilters);
  const [dateRangePickerOpen, setDateRangePickerOpen] = useState(false);

  const rangeLabel = useMemo(() => {
    if (draft.range && draft.range !== 'custom') {
      const labels: Record<string, string> = {
        month: 'This month',
        lastMonth: 'Last month',
        quarter: 'This quarter',
        year: 'This year',
        all: 'All time',
      };
      return labels[draft.range] || 'Custom Range';
    }
    if (draft.startDate && draft.endDate) {
      return `${format(new Date(draft.startDate), 'd MMM')} - ${format(new Date(draft.endDate), 'd MMM yyyy')}`;
    }
    return 'Select Range';
  }, [draft.range, draft.startDate, draft.endDate]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Date range</label>
        <QuickRangeChips
          value={draft.range}
          onChange={(val) => {
            const range = computeRange(val);
            setDraft((prev) => ({ ...prev, range: val, startDate: range[0], endDate: range[1] || '' }));
          }}
          className="gap-1.5"
        />
        <Popover open={dateRangePickerOpen} onOpenChange={setDateRangePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 w-full justify-start gap-2 text-xs">
              <CalendarIcon size={14} className="text-muted-foreground" />
              {rangeLabel}
              <ChevronDown size={14} className="ml-auto text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto border-border p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={draft.startDate ? new Date(draft.startDate) : undefined}
              selected={
                draft.startDate
                  ? { from: new Date(draft.startDate), to: draft.endDate ? new Date(draft.endDate) : undefined }
                  : undefined
              }
              onSelect={(range) => {
                if (range?.from) {
                  setDraft((prev) => ({
                    ...prev,
                    range: 'custom',
                    startDate: format(range.from!, 'yyyy-MM-dd'),
                    endDate: range.to ? format(range.to, 'yyyy-MM-dd') : '',
                  }));
                  if (range.to) setDateRangePickerOpen(false);
                }
              }}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Description, store, UPI…"
            className="h-9 pl-9"
            value={draft.search}
            onChange={(e) => setDraft((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Category</label>
        <Select
          value={draft.categoryId || 'all'}
          onValueChange={(val) => setDraft((prev) => ({ ...prev, categoryId: val === 'all' ? '' : val }))}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Transaction type</label>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant={draft.type === 'ALL' || !draft.type ? 'default' : 'ghost'}
            className="h-8 capitalize"
            onClick={() => setDraft((prev) => ({ ...prev, type: 'ALL' }))}
          >
            All
          </Button>
          {(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT'] as const).map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={draft.type === t ? 'default' : 'ghost'}
              className="h-8 capitalize"
              onClick={() => setDraft((prev) => ({ ...prev, type: t }))}
            >
              {t.toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Amount range</label>
        <div className="flex flex-wrap gap-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'lt1k', label: '<1k' },
            { value: '1to10k', label: '1–10k' },
            { value: '10to50k', label: '10–50k' },
            { value: '50to100k', label: '50–100k' },
            { value: 'gt100k', label: '>100k' },
          ].map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={
                draft.amountPreset === opt.value || (!draft.amountPreset && opt.value === 'all')
                  ? 'default'
                  : 'ghost'
              }
              className="h-8"
              onClick={() => setDraft((prev) => ({ ...prev, amountPreset: opt.value }))}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-t border-border pt-4">
        <Button variant="outline" className="flex-1" size="sm" onClick={onReset}>
          Reset
        </Button>
        <Button className="flex-1" size="sm" onClick={() => onApply(draft)}>
          Apply filters
        </Button>
      </div>
    </div>
  );
});
