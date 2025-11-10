
'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, CheckCircle, Filter, RefreshCw, RotateCcw, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/contexts/ToastContext';
import type { ManageTransactionsResponse, ManagedTransaction } from '@/types/transactions';
import { cn } from '@/lib/utils';

interface ManageTransactionsPageProps {
  initialData: ManageTransactionsResponse;
}

type ViewFilter = 'all' | 'active' | 'deleted';

type RestoreMode = 'selection' | 'filter';

type DeleteMode = 'selection' | 'filter';

const PAGE_SIZE_OPTIONS = [
  { label: '100', value: '100' },
  { label: '200', value: '200' },
  { label: '500', value: '500' },
  { label: '1000', value: '1000' },
  { label: 'All', value: 'all' },
];

export function ManageTransactionsPageClient({ initialData }: ManageTransactionsPageProps) {
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();

  const [transactions, setTransactions] = useState<ManagedTransaction[]>(
    initialData.transactions ?? [],
  );
  const [pagination, setPagination] = useState(initialData.pagination);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [financialCategory, setFinancialCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState('200');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'delete' | 'restore'>('delete');
  const [deleteMode, setDeleteMode] = useState<DeleteMode>('selection');
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('selection');
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const total = transactions.length;
    const deleted = transactions.filter((t) => t.isDeleted).length;
    const active = total - deleted;
    return { total, deleted, active };
  }, [transactions]);

  useEffect(() => {
    setTransactions(initialData.transactions ?? []);
    setPagination(initialData.pagination);
  }, [initialData.transactions, initialData.pagination]);

  const filteredTransactions = useMemo(() => {
    let data = [...transactions];

    if (viewFilter === 'active') {
      data = data.filter((item) => !item.isDeleted);
    }
    if (viewFilter === 'deleted') {
      data = data.filter((item) => item.isDeleted);
    }

    if (search) {
      const query = search.toLowerCase();
      data = data.filter((item) =>
        item.description.toLowerCase().includes(query) ||
        (item.category ?? '').toLowerCase().includes(query) ||
        (item.bankCode ?? '').toLowerCase().includes(query),
      );
    }

    return data;
  }, [transactions, viewFilter, search]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        includeDeleted: 'true',
        limit,
      });

      if (bankCode) params.set('bankCode', bankCode);
      if (financialCategory) params.set('financialCategory', financialCategory);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/transactions/manage?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load transactions');
      }

      const data = (await response.json()) as ManageTransactionsResponse;
      setTransactions(data.transactions ?? []);
      setPagination(data.pagination);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('[manage-transactions] fetch error', err);
      error('Error', 'Unable to load transactions');
    } finally {
      setLoading(false);
    }
  }, [bankCode, endDate, error, financialCategory, limit, startDate]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const performMutation = useCallback(
    async (endpoint: string, body: Record<string, unknown>) => {
      setLoading(true);
      try {
        const response = await fetch(endpoint, {
          method: endpoint.endsWith('delete') ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        const result = await response.json();
        return result;
      } catch (err) {
        console.error('[manage-transactions] mutation failed', err);
        error('Error', 'Request failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [error],
  );

  const handleConfirmDelete = async () => {
    setConfirmDeleteOpen(false);
    const payload: Record<string, unknown> = {};

    if (deleteMode === 'selection') {
      payload.transactionIds = Array.from(selectedIds);
      if (Array.isArray(payload.transactionIds) && payload.transactionIds.length === 0) {
        error('Error', 'Select at least one transaction');
        return;
      }
    } else {
      const filters: Record<string, string> = {};
      if (bankCode) filters.bankCode = bankCode;
      if (financialCategory) filters.financialCategory = financialCategory;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      payload.filters = filters;
    }

    const result = await performMutation('/api/transactions/delete', payload);
    if (result) {
      success('Deleted', 'Transactions removed successfully');
      await fetchTransactions();
    }
  };

  const handleConfirmRestore = async () => {
    setConfirmRestoreOpen(false);
    const payload: Record<string, unknown> = {};

    if (restoreMode === 'selection') {
      payload.transactionIds = Array.from(selectedIds).filter((id) =>
        transactions.find((tx) => tx.id === id)?.isDeleted,
      );
      if (Array.isArray(payload.transactionIds) && payload.transactionIds.length === 0) {
        error('Error', 'Select deleted transactions to restore');
        return;
      }
    } else {
      const filters: Record<string, string> = {};
      if (bankCode) filters.bankCode = bankCode;
      if (financialCategory) filters.financialCategory = financialCategory;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      payload.filters = filters;
    }

    const result = await performMutation('/api/transactions/restore', payload);
    if (result) {
      success('Restored', 'Transactions restored successfully');
      await fetchTransactions();
    }
  };

  const toggleFilterPane = () => setShowFilters((value) => !value);

  const bankCodes = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((item) => {
      if (item.bankCode) {
        set.add(item.bankCode);
      }
    });
    return Array.from(set).sort();
  }, [transactions]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((item) => {
      if (item.financialCategory) {
        set.add(item.financialCategory);
      }
    });
    return Array.from(set).sort();
  }, [transactions]);

  const actionsDisabled = loading || isPending;

  return (
    <div className="min-h-screen bg-background">
      <div className="container-fluid pb-16 pt-6 md:pt-8 lg:pt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Manage Transactions</h1>
            <p className="text-muted-foreground">
              Bulk delete or restore transactions imported from statements.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
              onClick={() => startTransition(fetchTransactions)}
              disabled={actionsDisabled}
            >
              <RefreshCw className={cn('h-4 w-4', (loading || isPending) && 'animate-spin')} />
              Refresh
            </Button>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to transactions
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total records</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {pagination?.total ? `${pagination.total} in database` : 'Includes applied filters'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active entries</CardDescription>
              <CardTitle className="text-3xl">{stats.active}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {stats.active > 0 ? 'Ready for analysis' : 'Import to get started'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Deleted entries</CardDescription>
              <CardTitle className="text-3xl text-destructive">{stats.deleted}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {stats.deleted > 0 ? 'Eligible for restore' : 'None removed yet'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Selected</CardDescription>
              <CardTitle className="text-3xl">{selectedIds.size}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Choose rows to restore or remove in bulk
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-border/70">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Refine by bank, category, or date range before acting.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                onClick={toggleFilterPane}
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide filters' : 'Show filters'}
              </Button>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger className="w-[140px] border border-border bg-card text-foreground">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-filter">Bank</Label>
                  <Select value={bankCode} onValueChange={setBankCode}>
                    <SelectTrigger id="bank-filter" className="border border-border bg-card text-foreground">
                      <SelectValue placeholder="All banks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All banks</SelectItem>
                      {bankCodes.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-filter">Category</Label>
                  <Select value={financialCategory} onValueChange={setFinancialCategory}>
                    <SelectTrigger id="category-filter" className="border border-border bg-card text-foreground">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="border border-border bg-card text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="border border-border bg-card text-foreground"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => startTransition(fetchTransactions)}
                  disabled={actionsDisabled}
                >
                  <Search className="h-4 w-4" />
                  Apply filters
                </Button>
                <Button
                  className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                  onClick={() => {
                    setBankCode('');
                    setFinancialCategory('');
                    setStartDate('');
                    setEndDate('');
                    startTransition(fetchTransactions);
                  }}
                  disabled={actionsDisabled}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="mt-6 border-border/70">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2">
              <CardTitle>Transactions</CardTitle>
              <CardDescription>Use the search or tabs to quickly isolate records before bulk actions.</CardDescription>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search description, category, bank..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full border border-border bg-card text-foreground sm:w-80"
                />
                <Button
                  className="border border-border bg-card text-foreground hover:bg-muted"
                  onClick={handleSelectAll}
                >
                  {selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0
                    ? 'Clear selection'
                    : 'Select all'}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  setModalMode('delete');
                  setDeleteMode('selection');
                  setConfirmDeleteOpen(true);
                }}
                disabled={actionsDisabled}
              >
                <Trash2 className="h-4 w-4" />
                Delete selected
              </Button>
              <Button
                className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                onClick={() => {
                  setModalMode('restore');
                  setRestoreMode('selection');
                  setConfirmRestoreOpen(true);
                }}
                disabled={actionsDisabled}
              >
                <CheckCircle className="h-4 w-4" />
                Restore selected
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={viewFilter} onValueChange={(value) => setViewFilter(value as ViewFilter)}>
              <TabsList className="flex w-full flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'deleted', label: 'Deleted' },
                ].map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex-1 border border-border bg-card text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {tab.label}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {tab.value === 'all' && stats.total}
                      {tab.value === 'active' && stats.active}
                      {tab.value === 'deleted' && stats.deleted}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <TransactionsTable
                  data={filteredTransactions}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  loading={loading || isPending}
                />
              </TabsContent>
              <TabsContent value="active" className="mt-4">
                <TransactionsTable
                  data={filteredTransactions.filter((item) => !item.isDeleted)}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  loading={loading || isPending}
                />
              </TabsContent>
              <TabsContent value="deleted" className="mt-4">
                <TransactionsTable
                  data={filteredTransactions.filter((item) => item.isDeleted)}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  loading={loading || isPending}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <ConfirmActionDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Confirm deletion"
        description="Choose whether to remove the selected transactions or everything that matches the filters."
        mode="delete"
        actionMode={deleteMode}
        onActionModeChange={setDeleteMode}
        onConfirm={handleConfirmDelete}
        disabled={actionsDisabled}
      />

      <ConfirmActionDialog
        open={confirmRestoreOpen}
        onOpenChange={setConfirmRestoreOpen}
        title="Restore transactions"
        description="Bring deleted transactions back into your account."
        mode="restore"
        actionMode={restoreMode}
        onActionModeChange={setRestoreMode}
        onConfirm={handleConfirmRestore}
        disabled={actionsDisabled}
      />
    </div>
  );
}

interface TransactionsTableProps {
  data: ManagedTransaction[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  loading: boolean;
}

function TransactionsTable({ data, selectedIds, onSelect, loading }: TransactionsTableProps) {
  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
        Loading transactions…
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No transactions match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/70">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Select</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Bank</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card text-sm text-foreground">
          {data.map((transaction) => {
            const isSelected = selectedIds.has(transaction.id);
            const amount = transaction.creditAmount ?? transaction.debitAmount ?? 0;
            const formattedDate = transaction.transactionDate
              ? format(new Date(transaction.transactionDate), 'dd MMM yyyy')
              : '—';
            return (
              <tr key={transaction.id} className={cn(isSelected && 'bg-primary/10')}> 
                <td className="px-4 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(transaction.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formattedDate}</span>
                  </div>
                </td>
                <td className="max-w-xs px-4 py-3 align-top">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{transaction.description}</p>
                    {transaction.rawData && (
                      <p className="text-xs text-muted-foreground">{transaction.rawData}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {transaction.category ?? transaction.financialCategory ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-muted-foreground">{transaction.bankCode ?? '—'}</td>
                <td className="px-4 py-3 align-top text-right font-semibold">
                  {transaction.creditAmount
                    ? `+₹${transaction.creditAmount.toLocaleString('en-IN')}`
                    : transaction.debitAmount
                    ? `-₹${transaction.debitAmount.toLocaleString('en-IN')}`
                    : '—'}
                </td>
                <td className="px-4 py-3 align-top">
                  <Badge className={cn(
                    'px-2 py-0.5 text-xs font-semibold',
                    transaction.isDeleted
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-emerald-50 text-emerald-700',
                  )}>
                    {transaction.isDeleted ? 'Deleted' : 'Active'}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  mode: 'delete' | 'restore';
  actionMode: 'selection' | 'filter';
  onActionModeChange: (mode: 'selection' | 'filter') => void;
  onConfirm: () => void;
  disabled?: boolean;
}

function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  mode,
  actionMode,
  onActionModeChange,
  onConfirm,
  disabled,
}: ConfirmActionDialogProps) {
  const isDelete = mode === 'delete';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            {isDelete
              ? 'Deleting is permanent. You can reimport statements later if you change your mind.'
              : 'Restoring will bring the transactions back into reports and analytics.'}
          </p>
          <div className="space-y-2">
            <Label>Action scope</Label>
            <div className="rounded-md border border-border bg-muted/40 p-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${mode}-mode`}
                  value="selection"
                  checked={actionMode === 'selection'}
                  onChange={() => onActionModeChange('selection')}
                  className="h-4 w-4"
                />
                <span>Selected transactions only</span>
              </label>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="radio"
                  name={`${mode}-mode`}
                  value="filter"
                  checked={actionMode === 'filter'}
                  onChange={() => onActionModeChange('filter')}
                  className="h-4 w-4"
                />
                <span>Everything matching the current filters</span>
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="border border-border bg-card text-foreground hover:bg-muted"
            onClick={() => onOpenChange(false)}
            disabled={disabled}
          >
            Cancel
          </Button>
          <Button
            className={cn(
              'gap-2',
              isDelete
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
            onClick={onConfirm}
            disabled={disabled}
          >
            {isDelete ? <Trash2 className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            {isDelete ? 'Delete' : 'Restore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
