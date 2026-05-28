
'use client';

import { useState, useMemo, useCallback, useTransition, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Deadline, DeadlinesResponse, DeadlineStatus } from '@/features/plans/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { patterns } from '@/design/patterns';
import { cn } from '@/lib/utils';
import {
  AlarmClock,
  Calendar,
  CheckCircle,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Repeat,
  Trash2,
} from 'lucide-react';
import { CompactListRow } from '@/components/ui/compact-list-row';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';

interface DeadlinesPageClientProps {
  initialDeadlines: DeadlinesResponse;
  userId: string;
  layoutVariant?: 'standalone' | 'embedded';
}

interface DeadlineFormState {
  title: string;
  description: string;
  amount: string;
  dueDate: string;
  category: string;
  isRecurring: boolean;
  frequency: string;
  paymentMethod: string;
  accountDetails: string;
  notes: string;
}

const STATUS_FILTERS: Array<'all' | 'PENDING' | 'OVERDUE' | 'PAID' | 'SKIPPED'> = ['all', 'PENDING', 'OVERDUE', 'PAID', 'SKIPPED'];
const FREQUENCY_OPTIONS = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];

function formatCurrency(amount?: number | null): string {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function toLocalDate(value?: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function computeStatus(deadline: Deadline): { label: string; tone: 'default' | 'destructive' | 'secondary'; status: DeadlineStatus | 'OVERDUE' } {
  if (deadline.isCompleted) {
    return { label: 'Paid', tone: 'secondary', status: 'PAID' };
  }

  const due = new Date(deadline.dueDate);
  const now = new Date();
  if (due < now) {
    return { label: 'Overdue', tone: 'destructive', status: 'OVERDUE' };
  }

  return { label: 'Pending', tone: 'default', status: 'PENDING' };
}

export default function DeadlinesPageClient({ initialDeadlines, userId, layoutVariant = 'standalone' }: DeadlinesPageClientProps) {
  const searchParams = useSearchParams();
  const [deadlines, setDeadlines] = useState<Deadline[]>(initialDeadlines.data);
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'OVERDUE' | 'PAID' | 'SKIPPED'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [actionDeadline, setActionDeadline] = useState<Deadline | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [formState, setFormState] = useState<DeadlineFormState>({
    title: '',
    description: '',
    amount: '',
    dueDate: '',
    category: '',
    isRecurring: false,
    frequency: 'MONTHLY',
    paymentMethod: '',
    accountDetails: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();

  const resetForm = useCallback(() => {
    setEditingDeadline(null);
    setFormState({
      title: '',
      description: '',
      amount: '',
      dueDate: '',
      category: '',
      isRecurring: false,
      frequency: 'MONTHLY',
      paymentMethod: '',
      accountDetails: '',
      notes: '',
    });
  }, []);

  const refreshDeadlines = useCallback(async () => {
    startRefreshTransition(async () => {
      try {
        const response = await fetch(`/api/deadlines?userId=${encodeURIComponent(userId)}&page=1&pageSize=100`);
        if (!response.ok) {
          throw new Error('Failed to refresh deadlines');
        }
        const data = (await response.json()) as DeadlinesResponse;
        setDeadlines(Array.isArray(data?.data) ? data.data : []);
      } catch (error) {
        console.error('[deadlines] refresh failed', error);
      }
    });
  }, [userId]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    deadlines.forEach((deadline) => {
      if (deadline.category) unique.add(deadline.category);
    });
    return Array.from(unique);
  }, [deadlines]);

  const filteredDeadlines = useMemo(() => {
    return deadlines.filter((deadline) => {
      const { status } = computeStatus(deadline);
      const matchesStatus = statusFilter === 'all' ? true : status === statusFilter;
      const matchesCategory = categoryFilter === 'all' ? true : deadline.category === categoryFilter;
      const matchesSearch = searchTerm
        ? deadline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (deadline.description ?? '').toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [deadlines, statusFilter, categoryFilter, searchTerm]);

  const stats = useMemo(() => {
    const upcoming = filteredDeadlines.filter((deadline) => !deadline.isCompleted && new Date(deadline.dueDate) >= new Date());
    const overdue = filteredDeadlines.filter((deadline) => !deadline.isCompleted && new Date(deadline.dueDate) < new Date());
    const totalAmount = filteredDeadlines.reduce((sum, deadline) => sum + (deadline.amount ?? 0), 0);
    const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    return {
      total: filteredDeadlines.length,
      upcoming: upcoming.length,
      overdue: overdue.length,
      totalAmount,
      monthLabel,
    };
  }, [filteredDeadlines]);

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('action') === 'new' && searchParams.get('tab') === 'deadlines') {
      openCreateDialog();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openEditDialog = (deadline: Deadline) => {
    setEditingDeadline(deadline);
    setFormState({
      title: deadline.title,
      description: deadline.description ?? '',
      amount: deadline.amount ? String(deadline.amount) : '',
      dueDate: deadline.dueDate ? deadline.dueDate.slice(0, 10) : '',
      category: deadline.category ?? '',
      isRecurring: deadline.isRecurring,
      frequency: deadline.frequency ?? 'MONTHLY',
      paymentMethod: deadline.paymentMethod ?? '',
      accountDetails: deadline.accountDetails ?? '',
      notes: deadline.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleFormChange = (field: keyof DeadlineFormState, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formState.title || !formState.dueDate) {
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: formState.title.trim(),
        description: formState.description.trim() || null,
        amount: formState.amount ? parseFloat(formState.amount) : null,
        dueDate: new Date(formState.dueDate).toISOString(),
        category: formState.category.trim() || null,
        isRecurring: formState.isRecurring,
        frequency: formState.isRecurring ? formState.frequency : null,
        paymentMethod: formState.paymentMethod.trim() || null,
        accountDetails: formState.accountDetails.trim() || null,
        notes: formState.notes.trim() || null,
        userId,
      };

      const method = editingDeadline ? 'PATCH' : 'POST';
      if (editingDeadline) {
        payload.id = editingDeadline.id;
      }

      const response = await fetch('/api/deadlines', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save deadline');
      }

      resetForm();
      setDialogOpen(false);
      await refreshDeadlines();
    } catch (error) {
      console.error('[deadlines] save failed', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (deadlineId: string) => {
    setIsDeleting(deadlineId);
    try {
      const response = await fetch(`/api/deadlines?id=${encodeURIComponent(deadlineId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete deadline');
      }
      await refreshDeadlines();
    } catch (error) {
      console.error('[deadlines] delete failed', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleCompleted = async (deadline: Deadline) => {
    try {
      const response = await fetch('/api/deadlines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deadline.id,
          isCompleted: !deadline.isCompleted,
          status: !deadline.isCompleted ? 'PAID' : 'PENDING',
          completedDate: !deadline.isCompleted ? new Date().toISOString() : null,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update deadline');
      }
      await refreshDeadlines();
    } catch (error) {
      console.error('[deadlines] toggle complete failed', error);
    }
  };

  const isEmbedded = layoutVariant === 'embedded';

  return (
    <div
      className={cn(
        'w-full',
        !isEmbedded && 'min-h-screen bg-background',
        isEmbedded && 'space-y-4'
      )}
    >
      <div
        className={cn(
          isEmbedded
            ? 'space-y-3'
            : 'container-fluid space-y-4 pb-12 pt-4 md:pt-6 lg:pt-8',
        )}
      >
        {!isEmbedded ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Deadlines</h1>
              <p className="text-muted-foreground">Stay ahead of upcoming payments and commitments.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                onClick={() => refreshDeadlines()}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button className="gap-2 hidden sm:flex" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                New Deadline
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Deadlines</h2>
              <p className="text-xs text-muted-foreground">Review due dates and payments in one place.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                onClick={() => refreshDeadlines()}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button size="sm" className="gap-2 hidden sm:flex" onClick={openCreateDialog}>
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
          </div>
        )}

        {!isEmbedded ? (
          <section className={cn(patterns.cardGrid, 'lg:grid-cols-4')}>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Pending</p>
              <p className="mt-2 text-2xl font-medium tabular-nums numeric">{stats.upcoming}</p>
              <p className="mt-1 text-xs text-muted">{stats.monthLabel}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Overdue</p>
              <p className={cn('mt-2 text-2xl font-medium tabular-nums numeric', stats.overdue > 0 && 'text-[var(--danger)]')}>
                {stats.overdue}
              </p>
              <p className="mt-1 text-xs text-muted">Needs attention</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Total</p>
              <p className="mt-2 text-2xl font-medium tabular-nums numeric">{stats.total}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Amount due</p>
              <p className="mt-2 text-2xl font-medium tabular-nums numeric">{formatCurrency(stats.totalAmount)}</p>
            </div>
          </section>
        ) : null}

        <section className="card-base overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
              <div className="flex flex-wrap gap-1">
                {STATUS_FILTERS.map((s) => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 capitalize"
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === 'all' ? 'All' : s.toLowerCase()}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Search deadlines…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full max-w-xs"
              />
            </div>
            <div className="md:hidden">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setMobileFiltersOpen((v) => !v)}
                >
                  <Filter className="size-3.5" />
                  Filter
                </Button>
                <Input
                  placeholder="Search deadlines…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 flex-1"
                />
              </div>
              {mobileFiltersOpen && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {STATUS_FILTERS.map((s) => (
                    <Button
                      key={s}
                      variant={statusFilter === s ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 capitalize"
                      onClick={() => setStatusFilter(s)}
                    >
                      {s === 'all' ? 'All' : s.toLowerCase()}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-[11px] font-medium uppercase tracking-[0.08em] text-hint">
                  <th className="w-10 px-4 py-3">#</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Time left</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDeadlines.map((deadline, idx) => {
                  const statusMeta = computeStatus(deadline);
                  const dueDate = new Date(deadline.dueDate);
                  const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isOverdue = statusMeta.status === 'OVERDUE';

                  return (
                    <tr key={deadline.id} className="hover:bg-surface/80">
                      <td className="px-4 py-3 text-xs tabular-nums text-muted">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{deadline.title}</p>
                        {deadline.category ? (
                          <p className="text-xs capitalize text-muted">{deadline.category}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={statusMeta.tone === 'destructive' ? 'destructive' : 'outline'}
                          className="capitalize"
                        >
                          {statusMeta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">{toLocalDate(deadline.dueDate)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs', isOverdue ? 'text-[var(--danger)]' : 'text-muted')}>
                          {isOverdue
                            ? `${Math.abs(daysLeft)} days overdue`
                            : daysLeft > 0
                              ? `${daysLeft} days left`
                              : 'Due today'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums numeric">{formatCurrency(deadline.amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(deadline)}>
                            <Calendar className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn('size-8', deadline.isCompleted && 'text-[var(--success)]')}
                            onClick={() => handleToggleCompleted(deadline)}
                          >
                            <CheckCircle className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-[var(--danger)]"
                            onClick={() => handleDelete(deadline.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDeadlines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">
                      No deadlines found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {filteredDeadlines.map((deadline) => {
              const statusMeta = computeStatus(deadline);
              const dueDate = new Date(deadline.dueDate);
              const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isOverdue = statusMeta.status === 'OVERDUE';

              return (
                <CompactListRow
                  key={deadline.id}
                  icon={<AlarmClock className="size-4 text-muted" />}
                  title={deadline.title}
                  subtitle={`Due ${toLocalDate(deadline.dueDate)}`}
                  trailing={
                    <div className="text-right">
                      <p className="text-xs font-medium tabular-nums text-foreground">{formatCurrency(deadline.amount)}</p>
                      <span
                        className={cn(
                          'inline-block size-2 rounded-full',
                          isOverdue ? 'bg-[var(--danger)]' : 'bg-[var(--success)]'
                        )}
                      />
                    </div>
                  }
                  onClick={() => setActionDeadline(deadline)}
                />
              );
            })}
            {filteredDeadlines.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-muted">No deadlines found.</p>
            )}
          </div>
        </section>
      </div>

      <ResponsiveSheet
        open={!!actionDeadline}
        onOpenChange={(open) => !open && setActionDeadline(null)}
        title={actionDeadline?.title ?? 'Deadline'}
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (actionDeadline) openEditDialog(actionDeadline);
                setActionDeadline(null);
              }}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (actionDeadline) handleToggleCompleted(actionDeadline);
                setActionDeadline(null);
              }}
            >
              {actionDeadline?.isCompleted ? 'Mark pending' : 'Mark complete'}
            </Button>
            <Button
              variant="outline"
              className="text-[var(--danger)]"
              onClick={() => {
                if (actionDeadline) handleDelete(actionDeadline.id);
                setActionDeadline(null);
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        {actionDeadline && (
          <div className="space-y-2 text-sm">
            <p className="text-muted">Due {toLocalDate(actionDeadline.dueDate)}</p>
            <p className="tabular-nums">{formatCurrency(actionDeadline.amount)}</p>
          </div>
        )}
      </ResponsiveSheet>

      <ResponsiveSheet
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
        title={editingDeadline ? 'Update deadline' : 'Add deadline'}
        description="Keep track of upcoming bills, EMIs, and other important payments."
        footer={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlarmClock className="h-4 w-4" />}
              {editingDeadline ? 'Update deadline' : 'Create deadline'}
            </Button>
          </div>
        }
      >
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="deadline-title">
                  Title
                </label>
                <Input
                  id="deadline-title"
                  placeholder="e.g. Home loan EMI"
                  value={formState.title}
                  onChange={(event) => handleFormChange('title', event.target.value)}
                  className="h-11"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="deadline-description">
                  Description
                </label>
                <Textarea
                  id="deadline-description"
                  rows={3}
                  placeholder="Optional notes"
                  value={formState.description}
                  onChange={(event) => handleFormChange('description', event.target.value)}
                  className="resize-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="deadline-amount">
                    Amount (₹)
                  </label>
                  <Input
                    id="deadline-amount"
                    type="number"
                    min="0"
                    value={formState.amount}
                    onChange={(event) => handleFormChange('amount', event.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="deadline-date">
                    Due date
                  </label>
                  <Input
                    id="deadline-date"
                    type="date"
                    value={formState.dueDate}
                    onChange={(event) => handleFormChange('dueDate', event.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="deadline-category">
                    Category
                  </label>
                  <Input
                    id="deadline-category"
                    placeholder="e.g. housing, utilities"
                    value={formState.category}
                    onChange={(event) => handleFormChange('category', event.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="deadline-payment">
                    Payment method
                  </label>
                  <Input
                    id="deadline-payment"
                    placeholder="e.g. UPI, credit card"
                    value={formState.paymentMethod}
                    onChange={(event) => handleFormChange('paymentMethod', event.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="deadline-account">
                  Account details
                </label>
                <Input
                  id="deadline-account"
                  placeholder="Optional account notes"
                  value={formState.accountDetails}
                  onChange={(event) => handleFormChange('accountDetails', event.target.value)}
                  className="h-11"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Recurring reminder</p>
                  <p className="text-xs text-muted">Automatically resurface this deadline.</p>
                </div>
                <Switch
                  checked={formState.isRecurring}
                  onCheckedChange={(checked) => handleFormChange('isRecurring', checked)}
                />
              </div>
              {formState.isRecurring && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Frequency</label>
                  <Select
                    value={formState.frequency}
                    onValueChange={(value) => handleFormChange('frequency', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className="capitalize">
                          {option.toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="deadline-notes">
                  Notes
                </label>
                <Textarea
                  id="deadline-notes"
                  rows={2}
                  placeholder="Any additional details you want to remember"
                  value={formState.notes}
                  onChange={(event) => handleFormChange('notes', event.target.value)}
                  className="resize-none"
                />
              </div>

            </div>
      </ResponsiveSheet>
    </div>
  );
}
