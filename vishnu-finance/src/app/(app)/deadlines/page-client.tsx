
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
import FabButton from '@/components/ui/fab-button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

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

        {/* Mobile FAB */}
        <FabButton
          label="New Deadline"
          icon={<Plus className="h-5 w-5" />}
          onClick={openCreateDialog}
          className="bg-primary text-primary-foreground"
        />

        {/* INDUSTRIAL_METRIC_GRID */}
        {!isEmbedded ? (
          <div className="grid grid-cols-1 md:grid-cols-4 border border-border">
            {[
              { label: 'Pending_Protocol', value: stats.upcoming, sub: `${stats.monthLabel} Context` },
              { label: 'Overdue_Criticality', value: stats.overdue, sub: 'Requires_Immediate_Sync', critical: stats.overdue > 0 },
              { label: 'Total_Node_Count', value: stats.total, sub: 'System_Tracking' },
              { label: 'Cumulative_Liability', value: formatCurrency(stats.totalAmount), sub: 'Across_All_Nodes' },
            ].map((stat, i) => (
              <div key={i} className={cn("p-4 flex flex-col justify-between h-24", i !== 3 && "border-r border-border")}>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</span>
                <div>
                  <span className={cn("text-xl font-black tabular-nums numeric tracking-tighter block", stat.critical && "text-rose-500")}>{stat.value}</span>
                  <span className="text-[7px] font-bold text-muted-foreground/40 uppercase tracking-widest">{stat.sub}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* AUDIT_LEDGER_SYSTEM */}
        <div className="border border-border bg-background">
          <div className="h-10 px-4 flex items-center justify-between border-b border-border bg-muted/20">
            <div className="flex items-center gap-6">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground">DEADLINE_AUDIT_LEDGER</span>
              <div className="flex gap-1">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-1 transition-none",
                      statusFilter === s ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
               <Input
                placeholder="PROBE_ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-6 w-32 rounded-none border-border bg-transparent text-[8px] font-black uppercase tracking-widest focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/5">
                  <th className="text-left p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border w-10">#</th>
                  <th className="text-left p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border">TRANSACTION_PROTOCOL</th>
                  <th className="text-left p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border">STATUS</th>
                  <th className="text-left p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border">TEMPORAL_MARKER</th>
                  <th className="text-left p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border">SYNC_STATE</th>
                  <th className="text-right p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border">AMOUNT</th>
                  <th className="text-right p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground">CONTROLS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDeadlines.map((deadline, idx) => {
                  const statusMeta = computeStatus(deadline);
                  const dueDate = new Date(deadline.dueDate);
                  const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isOverdue = statusMeta.status === 'OVERDUE';
                  
                  return (
                    <tr key={deadline.id} className="group hover:bg-muted/5 transition-none">
                      <td className="p-3 text-[9px] font-bold font-mono text-muted-foreground/40 border-r border-border align-middle">
                        {(idx + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="p-3 border-r border-border">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-tight">{deadline.title}</span>
                          <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">{deadline.category || 'UNCLASSIFIED'}</span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-border">
                         <div className={cn(
                            "inline-flex items-center h-4 px-1.5 text-[7px] font-black uppercase tracking-widest border",
                            statusMeta.tone === 'destructive' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : 
                            statusMeta.tone === 'secondary' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground border-border/50"
                         )}>
                            {statusMeta.label}
                         </div>
                      </td>
                      <td className="p-3 border-r border-border">
                         <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase">{toLocalDate(deadline.dueDate)}</span>
                            <span className="text-[7px] font-bold text-muted-foreground uppercase">PROTO_DATE</span>
                         </div>
                      </td>
                      <td className="p-3 border-r border-border">
                         <div className="flex items-center gap-2">
                            <Clock className={cn("size-3", isOverdue ? "text-rose-500" : "text-muted-foreground/40")} />
                            <span className={cn("text-[8px] font-black uppercase tracking-widest", isOverdue ? "text-rose-500" : "text-foreground/80")}>
                               {isOverdue ? `${Math.abs(daysLeft)}D_DELAY` : daysLeft > 0 ? `${daysLeft}D_REMAIN` : 'SYNC_TODAY'}
                            </span>
                         </div>
                      </td>
                      <td className="p-3 border-r border-border text-right text-[10px] font-black tabular-nums numeric">
                        {formatCurrency(deadline.amount)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-none">
                          <Button variant="outline" size="icon" className="size-6 rounded-none border-border" onClick={() => openEditDialog(deadline)}>
                            <Calendar className="size-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className={cn("size-6 rounded-none border-border", deadline.isCompleted ? "text-emerald-500 border-emerald-500/30" : "")} 
                            onClick={() => handleToggleCompleted(deadline)}
                          >
                            <CheckCircle className="size-3" />
                          </Button>
                          <Button variant="outline" size="icon" className="size-6 rounded-none border-border text-rose-500 hover:bg-rose-500/10" onClick={() => handleDelete(deadline.id)}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDeadlines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      NO_ACTIVE_PROTOCOLS
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Sheet open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <SheetContent side="bottom" className="h-[92vh] sm:h-auto sm:max-w-xl rounded-t-[2.5rem] p-0 overflow-hidden border-t border-border/10">
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-1.5 rounded-full bg-muted/40" />
          </div>
          <div className="px-6 py-4 overflow-y-auto h-full pb-32 sm:pb-6">
            <SheetHeader className="text-left mb-6">
              <SheetTitle className="text-xl font-black uppercase tracking-widest">{editingDeadline ? 'Update deadline' : 'Add deadline'}</SheetTitle>
              <SheetDescription className="text-xs font-semibold uppercase tracking-tight opacity-70">
                Keep track of upcoming bills, EMIs, and other important payments.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="deadline-title">
                  Title
                </label>
                <Input
                  id="deadline-title"
                  placeholder="e.g. Home loan EMI"
                  value={formState.title}
                  onChange={(event) => handleFormChange('title', event.target.value)}
                  className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="deadline-description">
                  Description
                </label>
                <Textarea
                  id="deadline-description"
                  rows={3}
                  placeholder="Optional notes"
                  value={formState.description}
                  onChange={(event) => handleFormChange('description', event.target.value)}
                  className="bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50 resize-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="deadline-amount">
                    Amount (₹)
                  </label>
                  <Input
                    id="deadline-amount"
                    type="number"
                    min="0"
                    value={formState.amount}
                    onChange={(event) => handleFormChange('amount', event.target.value)}
                    className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="deadline-date">
                    Due date
                  </label>
                  <Input
                    id="deadline-date"
                    type="date"
                    value={formState.dueDate}
                    onChange={(event) => handleFormChange('dueDate', event.target.value)}
                    className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="deadline-category">
                    Category
                  </label>
                  <Input
                    id="deadline-category"
                    placeholder="e.g. housing, utilities"
                    value={formState.category}
                    onChange={(event) => handleFormChange('category', event.target.value)}
                    className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="deadline-payment">
                    Payment method
                  </label>
                  <Input
                    id="deadline-payment"
                    placeholder="e.g. UPI, credit card"
                    value={formState.paymentMethod}
                    onChange={(event) => handleFormChange('paymentMethod', event.target.value)}
                    className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="deadline-account">
                  Account details
                </label>
                <Input
                  id="deadline-account"
                  placeholder="Optional account notes"
                  value={formState.accountDetails}
                  onChange={(event) => handleFormChange('accountDetails', event.target.value)}
                  className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/10">
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-foreground">Recurring reminder</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tight opacity-70">Automatically resurface this deadline.</p>
                </div>
                <Switch
                  checked={formState.isRecurring}
                  onCheckedChange={(checked) => handleFormChange('isRecurring', checked)}
                />
              </div>
              {formState.isRecurring && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Frequency</label>
                  <Select
                    value={formState.frequency}
                    onValueChange={(value) => handleFormChange('frequency', value)}
                  >
                    <SelectTrigger className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50">
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
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="deadline-notes">
                  Notes
                </label>
                <Textarea
                  id="deadline-notes"
                  rows={2}
                  placeholder="Any additional details you want to remember"
                  value={formState.notes}
                  onChange={(event) => handleFormChange('notes', event.target.value)}
                  className="bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50 resize-none"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-4">
                <Button
                  variant="outline"
                  className="h-12 border-border bg-card text-foreground hover:bg-muted font-bold uppercase tracking-widest text-[10px]"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="h-12 gap-2 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlarmClock className="h-4 w-4" />}
                  {editingDeadline ? 'Update deadline' : 'Create deadline'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
