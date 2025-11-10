
'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import type { Deadline, DeadlinesResponse, DeadlineStatus } from '@/types/deadlines';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  AlarmClock,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Repeat,
  Trash2,
} from 'lucide-react';

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
  const [deadlines, setDeadlines] = useState<Deadline[]>(initialDeadlines.data);
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'OVERDUE' | 'PAID' | 'SKIPPED'>('all');
  const [searchTerm, setSearchTerm] = useState('');
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
            ? 'space-y-4'
            : 'container-fluid space-y-6 pb-16 pt-6 md:pt-8 lg:pt-10',
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
              <Button className="gap-2" onClick={openCreateDialog}>
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
              <Button size="sm" className="gap-2" onClick={openCreateDialog}>
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
          </div>
        )}

        {!isEmbedded && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Due this month</CardDescription>
                <CardTitle className="text-3xl">{stats.upcoming}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                Tracking {stats.monthLabel}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Overdue</CardDescription>
                <CardTitle className="text-3xl text-destructive">{stats.overdue}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                Make a plan to clear these soon
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total scheduled</CardDescription>
                <CardTitle className="text-3xl">{stats.total}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {stats.total ? 'Organised and under control' : 'Add your first reminder'}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Amount due</CardDescription>
                <CardTitle className="text-3xl">{formatCurrency(stats.totalAmount)}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                Across all pending deadlines
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 space-y-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <TabsList className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((status) => (
                  <TabsTrigger key={status} value={status} className="capitalize">
                    {status === 'all' ? 'All' : status.toLowerCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="capitalize">
                      {category.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search deadlines"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full min-w-[200px] sm:w-64"
              />
            </div>
          </div>

          <Tabs value="list">
            <TabsContent value="list" className="mt-4 space-y-4">
              {filteredDeadlines.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {deadlines.length === 0 ? 'No reminders yet. Add your first deadline.' : 'No deadlines match the current filters.'}
                  </CardContent>
                </Card>
              ) : (
                filteredDeadlines.map((deadline) => {
                  const statusMeta = computeStatus(deadline);
                  const dueDate = new Date(deadline.dueDate);
                  const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isOverdue = statusMeta.status === 'OVERDUE';

                  return (
                    <Card key={deadline.id} className="border-border/70 shadow-none">
                      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold',
                                statusMeta.tone === 'destructive' && 'bg-destructive/10 text-destructive-foreground',
                                statusMeta.tone === 'secondary' && 'bg-emerald-100 text-emerald-700',
                                statusMeta.tone === 'default' && 'bg-primary/10 text-primary'
                              )}
                            >
                              {statusMeta.label}
                            </span>
                            {deadline.category && (
                              <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-semibold capitalize text-muted-foreground">
                                {deadline.category.toLowerCase()}
                              </span>
                            )}
                            {deadline.isRecurring && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                                <Repeat className="h-3 w-3" />
                                {deadline.frequency?.toLowerCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              {deadline.title}
                            </h3>
                            {deadline.description && (
                              <p className="text-sm text-muted-foreground">
                                {deadline.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Due {toLocalDate(deadline.dueDate)}
                            </span>
                            <span className="flex items-center gap-2">
                              <AlarmClock className="h-4 w-4" />
                              {isOverdue
                                ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`
                                : daysLeft >= 0
                                  ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`
                                  : 'Due today'}
                            </span>
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {formatCurrency(deadline.amount)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-stretch gap-2 sm:w-64">
                          <Button
                            className="justify-between border border-border bg-card text-foreground hover:bg-muted"
                            onClick={() => openEditDialog(deadline)}
                          >
                            <span>Edit</span>
                            <Calendar className="h-4 w-4" />
                          </Button>
                          <Button
                            className={cn(
                              'justify-between',
                              deadline.isCompleted
                                ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            )}
                            onClick={() => handleToggleCompleted(deadline)}
                          >
                            <span>{deadline.isCompleted ? 'Mark as pending' : 'Mark as paid'}</span>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            className="justify-between bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-70"
                            onClick={() => handleDelete(deadline.id)}
                            disabled={isDeleting === deadline.id}
                          >
                            <span>{isDeleting === deadline.id ? 'Deleting…' : 'Delete'}</span>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingDeadline ? 'Update deadline' : 'Add deadline'}</DialogTitle>
            <DialogDescription>
              Keep track of upcoming bills, EMIs, and other important payments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="deadline-title">
                Title
              </label>
              <Input
                id="deadline-title"
                placeholder="e.g. Home loan EMI"
                value={formState.title}
                onChange={(event) => handleFormChange('title', event.target.value)}
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
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Recurring reminder</p>
                <p className="text-xs text-muted-foreground">Automatically resurface this deadline at the chosen frequency.</p>
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
                  <SelectTrigger>
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
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              className="border border-border bg-card text-foreground hover:bg-muted"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
