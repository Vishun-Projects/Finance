'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  X,
  CheckSquare,
  Trash2,
  Tag,
  Sparkles,
  FileText,
  MoreHorizontal,
  ChevronDown,
  Moon,
  Sun,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { NavPill, NavPillGroup } from '@/components/ui/nav-pill';
import { patterns } from '@/design/patterns';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PageMandate } from '@/components/layout/page-mandate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ImportStatement {
  id: string;
  bankCode: string;
  transactionCount: number;
  importedAt: string;
  closingBalance?: number;
  statementStartDate?: string;
  statementEndDate?: string;
  isCurrentBalanceSource?: boolean;
}

interface TransactionToolbarProps {
  localSearch: string;
  onSearch: (value: string) => void;
  period: 'daily' | 'weekly' | 'monthly' | 'custom';
  onPeriodChange: (p: 'daily' | 'weekly' | 'monthly' | 'custom') => void;
  onOpenFilters: () => void;
  showSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  onOpenImport: () => void;
  onAutoCategorize: () => void;
  onAdd: () => void;
  isBulkUpdating: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  mobilePanel: 'list' | 'calendar' | 'breakdown';
  onMobilePanelChange: (panel: 'list' | 'calendar' | 'breakdown') => void;
  importStatements: ImportStatement[];
  formatAmount: (value: number) => string;
  selectedCount: number;
  onBulkCategorize: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export function TransactionToolbar({
  localSearch,
  onSearch,
  period,
  onPeriodChange,
  onOpenFilters,
  showSelectionMode,
  onToggleSelectionMode,
  onOpenImport,
  onAutoCategorize,
  onAdd,
  isBulkUpdating,
  isDarkMode,
  onToggleTheme,
  mobilePanel,
  onMobilePanelChange,
  importStatements,
  formatAmount,
  selectedCount,
  onBulkCategorize,
  onBulkDelete,
  onClearSelection,
}: TransactionToolbarProps) {
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  return (
    <>
      <div className="mb-4 hidden shrink-0 flex-wrap items-center gap-2 md:flex">
        <div className="relative min-w-[160px] flex-1 basis-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
          <Input
            type="text"
            placeholder="Search transactions..."
            className="h-9 rounded-md border-border bg-card pl-9 text-sm"
            value={localSearch}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <NavPillGroup className="shrink-0">
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <NavPill key={p} label={p} active={period === p} onClick={() => onPeriodChange(p)} />
          ))}
        </NavPillGroup>
        <Button variant="outline" size="sm" onClick={onOpenFilters}>
          <Filter className="mr-2 size-3.5" />
          Filters
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Actions
              <ChevronDown className="ml-1 size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggleSelectionMode}>
              <CheckSquare className="mr-2 size-3.5" />
              Select
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenImport}>
              <FileText className="mr-2 size-3.5" />
              Import
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAutoCategorize} disabled={isBulkUpdating}>
              <Sparkles className={cn('mr-2 size-3.5', isBulkUpdating && 'animate-spin')} />
              Auto categorize
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-2 size-3.5" />
          Add
        </Button>
      </div>

      <div className="mb-3 flex shrink-0 flex-col gap-2 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
            <Input
              type="text"
              placeholder="Search transactions..."
              className="h-9 rounded-md border-border bg-card pl-9 text-sm"
              value={localSearch}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="btn-touch shrink-0 px-2.5"
            onClick={() => setMobileToolsOpen(true)}
            aria-label="More actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="btn-touch shrink-0 px-2.5" onClick={onAdd} aria-label="Add transaction">
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex w-full flex-col gap-0">
          <NavPillGroup variant="segmented" className="w-full -mx-4 px-4">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <NavPill
                key={p}
                variant="segmented"
                label={p}
                active={period === p}
                onClick={() => onPeriodChange(p)}
              />
            ))}
          </NavPillGroup>
          <NavPillGroup variant="segmented" className="w-full -mx-4 px-4">
            {(
              [
                ['list', 'List'],
                ['calendar', 'Cal'],
                ['breakdown', 'Stats'],
              ] as const
            ).map(([panel, label]) => (
              <NavPill
                key={panel}
                variant="segmented"
                label={label}
                active={mobilePanel === panel}
                onClick={() => onMobilePanelChange(panel)}
              />
            ))}
          </NavPillGroup>
        </div>
      </div>

      <Sheet open={mobileToolsOpen} onOpenChange={setMobileToolsOpen}>
        <SheetContent side="bottom" className={cn(patterns.bottomSheet, 'rounded-t-2xl p-4 lg:hidden')}>
          <SheetHeader className="mb-3 text-left">
            <SheetTitle className="text-base">Actions</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 justify-start gap-2"
              onClick={() => {
                onOpenFilters();
                setMobileToolsOpen(false);
              }}
            >
              <Filter className="size-4" /> Filters
            </Button>
            <Button
              variant="outline"
              className="h-11 justify-start gap-2"
              onClick={() => {
                onToggleSelectionMode();
                setMobileToolsOpen(false);
              }}
            >
              <CheckSquare className="size-4" /> Select
            </Button>
            <Button
              variant="outline"
              className="h-11 justify-start gap-2"
              onClick={() => {
                onOpenImport();
                setMobileToolsOpen(false);
              }}
            >
              <FileText className="size-4" /> Import
            </Button>
            <Button
              variant="outline"
              className="h-11 justify-start gap-2"
              onClick={() => {
                onAutoCategorize();
                setMobileToolsOpen(false);
              }}
              disabled={isBulkUpdating}
            >
              <Sparkles className={cn('size-4', isBulkUpdating && 'animate-spin')} /> Auto categorize
            </Button>
          </div>
          {importStatements.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-foreground">Statement imports</p>
              <ul className="max-h-40 space-y-2 overflow-y-auto text-[11px] text-muted">
                {importStatements.slice(0, 5).map((stmt) => (
                  <li key={stmt.id} className="rounded-md border border-border bg-surface/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{stmt.bankCode}</span>
                      {stmt.isCurrentBalanceSource && (
                        <Badge variant="outline" className="text-[9px]">
                          Current balance
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 tabular-nums">
                      {stmt.closingBalance != null ? formatAmount(stmt.closingBalance) : '—'} closing ·{' '}
                      {stmt.transactionCount} txns
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {selectedCount > 0 && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[90%] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-8 duration-300 md:bottom-8 md:w-auto">
          <div className="flex w-full items-center justify-between gap-3 rounded-none border border-border bg-foreground px-4 py-3 text-background shadow-2xl md:w-auto md:gap-6 md:px-6 md:py-4">
            <div className="flex shrink-0 items-center gap-3 border-r border-background/20 pr-3 md:pr-6">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/10 text-sm font-bold">
                {selectedCount}
              </div>
              <p className="hidden text-sm font-bold tracking-tight lg:block">Selected</p>
            </div>
            <div className="flex flex-1 items-center justify-center gap-1 md:gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 flex-1 gap-1 px-2 text-[10px] font-bold uppercase tracking-widest text-background hover:bg-background/10 md:flex-none md:gap-2 md:px-4"
                onClick={onBulkCategorize}
              >
                <Tag size={14} className="shrink-0" />
                <span className="truncate">Categorize</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 flex-1 gap-1 px-2 text-[10px] font-bold uppercase tracking-widest text-danger hover:bg-[var(--danger-bg)] md:flex-none md:gap-2 md:px-4"
                onClick={onBulkDelete}
              >
                <Trash2 size={14} className="shrink-0" />
                <span className="truncate">Delete</span>
              </Button>
            </div>
            <div className="shrink-0 border-l border-background/20 pl-2 md:border-none md:pl-4">
              <button
                onClick={onClearSelection}
                className="rounded-full p-2 transition-colors hover:bg-background/10"
                title="Clear selection"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TransactionMobileHeader({
  isLoading,
  accountBalance,
  income,
  expense,
  formatAmount,
  isDarkMode,
  onToggleTheme,
}: {
  isLoading: boolean;
  accountBalance: { amount?: number | null } | null;
  income: number;
  expense: number;
  formatAmount: (v: number) => string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}) {
  if (isLoading) return null;

  return (
    <div className="safe-top mb-3 flex shrink-0 items-start justify-between gap-2 lg:hidden">
      <PageMandate
        className="min-w-0 flex-1"
        title="Transactions"
        mandate="All money movement — import, categorize, search, and export."
        metrics={[
          {
            label: 'Bank balance',
            value: accountBalance?.amount != null ? formatAmount(accountBalance.amount) : '—',
          },
          { label: 'Income', value: formatAmount(income), tone: 'success' },
          { label: 'Expenses', value: formatAmount(expense), tone: 'danger' },
        ]}
      />
      <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
        <button
          type="button"
          onClick={onToggleTheme}
          className="btn-touch flex size-9 items-center justify-center rounded-full border border-border/60 text-muted hover:bg-surface hover:text-foreground"
          aria-label="Toggle theme"
          suppressHydrationWarning
        >
          {isDarkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
      </div>
    </div>
  );
}
