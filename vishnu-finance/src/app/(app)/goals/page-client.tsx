
'use client';

import { useState, useMemo, useCallback, useTransition, useEffect } from 'react';
import { Goal, GoalPriority, GoalStatus } from '@/types/goals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  CheckCircle,
  Goal as GoalIcon,
  Loader2,
  Plus,
  RefreshCw,
  Target,
  Trash2,
} from 'lucide-react';
import { normalizeGoals } from '@/lib/utils/goal-normalize';
import FabButton from '@/components/ui/fab-button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface GoalsPageClientProps {
  initialGoals: Goal[];
  userId: string;
  layoutVariant?: 'standalone' | 'embedded';
  onGoalsChange?: (goals: Goal[]) => void;
}

interface GoalFormState {
  title: string;
  description: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  category: string;
  priority: GoalPriority;
}

const PRIORITY_OPTIONS: GoalPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_FILTERS: Array<'all' | GoalStatus> = ['all', 'ACTIVE', 'COMPLETED', 'PAUSED'];

function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '₹0';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateGoalProgress(goal: Goal): number {
  if (!goal.targetAmount) {
    return 0;
  }

  return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
}

export default function GoalsPageClient({
  initialGoals,
  userId,
  layoutVariant = 'standalone',
  onGoalsChange,
}: GoalsPageClientProps) {
  const [goals, setGoals] = useState<Goal[]>(() => normalizeGoals(initialGoals));
  const [statusFilter, setStatusFilter] = useState<'all' | GoalStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | GoalPriority>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formState, setFormState] = useState<GoalFormState>({
    title: '',
    description: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    category: '',
    priority: 'MEDIUM',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();

  useEffect(() => {
    setGoals(normalizeGoals(initialGoals));
  }, [initialGoals]);

  const resetForm = useCallback(() => {
    setEditingGoal(null);
    setFormState({
      title: '',
      description: '',
      targetAmount: '',
      currentAmount: '',
      targetDate: '',
      category: '',
      priority: 'MEDIUM',
    });
  }, []);

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setFormState({
      title: goal.title ?? '',
      description: goal.description ?? '',
      targetAmount: String(goal.targetAmount ?? ''),
      currentAmount: String(goal.currentAmount ?? ''),
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : '',
      category: goal.category ?? '',
      priority: goal.priority ?? 'MEDIUM',
    });
    setDialogOpen(true);
  };

  const refreshGoals = useCallback(async () => {
    try {
      const response = await fetch(`/api/goals?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        throw new Error('Failed to refresh goals');
      }
      const data = (await response.json()) as Goal[];
      const normalized = Array.isArray(data) ? normalizeGoals(data) : [];
      startRefreshTransition(() => {
        setGoals(normalized);
      });
      onGoalsChange?.(normalized);
      return normalized;
    } catch (error) {
      console.error('[goals] refresh failed', error);
      return null;
    }
  }, [userId, onGoalsChange]);

  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      const matchesSearch = searchTerm
        ? goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (goal.description ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (goal.category ?? '').toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesStatus = statusFilter === 'all'
        ? true
        : (goal.status ?? 'ACTIVE') === statusFilter;

      const matchesPriority = priorityFilter === 'all'
        ? true
        : goal.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [goals, searchTerm, statusFilter, priorityFilter]);

  const goalStats = useMemo(() => {
    const totalTarget = goals.reduce((sum, goal) => sum + (goal.targetAmount ?? 0), 0);
    const totalCurrent = goals.reduce((sum, goal) => sum + (goal.currentAmount ?? 0), 0);
    const completed = goals.filter((goal) => calculateGoalProgress(goal) >= 100 || goal.status === 'COMPLETED').length;
    const active = goals.length - completed;

    return {
      total: goals.length,
      completed,
      active,
      progressPercent: totalTarget ? Math.round((totalCurrent / totalTarget) * 100) : 0,
      totalTarget,
      totalCurrent,
    };
  }, [goals]);

  const handleFormChange = (field: keyof GoalFormState, value: string | GoalPriority) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formState.title || !formState.targetAmount) {
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: formState.title.trim(),
        description: formState.description.trim() || null,
        targetAmount: parseFloat(formState.targetAmount),
        currentAmount: formState.currentAmount ? parseFloat(formState.currentAmount) : 0,
        targetDate: formState.targetDate ? new Date(formState.targetDate).toISOString() : null,
        category: formState.category.trim() || null,
        priority: formState.priority,
        userId,
      };

      const endpoint = '/api/goals';
      const method = editingGoal ? 'PUT' : 'POST';

      if (editingGoal) {
        payload.id = editingGoal.id;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save goal');
      }

      resetForm();
      setDialogOpen(false);
      const updated = await refreshGoals();
      if (!updated && onGoalsChange) {
        onGoalsChange(goals);
      }
    } catch (error) {
      console.error('[goals] save failed', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    setIsDeleting(goalId);
    try {
      const response = await fetch(`/api/goals?id=${encodeURIComponent(goalId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      const updated = await refreshGoals();
      if (!updated && onGoalsChange) {
        onGoalsChange(goals);
      }
    } catch (error) {
      console.error('[goals] delete failed', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleMarkCompleted = async (goal: Goal) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goal.id,
          status: 'COMPLETED',
          currentAmount: goal.targetAmount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark goal complete');
      }

      const updated = await refreshGoals();
      if (!updated && onGoalsChange) {
        onGoalsChange(goals);
      }
    } catch (error) {
      console.error('[goals] mark complete failed', error);
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
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Goals</h1>
              <p className="text-muted-foreground">Track your financial targets and measure your progress.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                onClick={() => refreshGoals()}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button className="gap-2 hidden sm:flex" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                New Goal
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Goals</h2>
              <p className="text-xs text-muted-foreground">Stay on top of your savings targets.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-2 border border-border bg-card text-foreground hover:bg-muted"
                onClick={() => refreshGoals()}
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
          label="New Goal"
          icon={<Plus className="h-5 w-5" />}
          onClick={openCreateDialog}
          className="bg-primary text-primary-foreground"
        />

        {/* INDUSTRIAL_METRIC_GRID */}
        {!isEmbedded ? (
          <div className="grid grid-cols-1 md:grid-cols-4 border border-border">
            {[
              { label: 'Cumulative_Targets', value: formatCurrency(goalStats.totalTarget), sub: `${goalStats.total} Entities` },
              { label: 'Deployed_Capital', value: formatCurrency(goalStats.totalCurrent), sub: `${goalStats.progressPercent}% Sync` },
              { label: 'Active_Nodes', value: goalStats.active, sub: 'In_Progress' },
              { label: 'Fulfilled_Nodes', value: goalStats.completed, sub: 'Terminal_State' },
            ].map((stat, i) => (
              <div key={i} className={cn("p-4 flex flex-col justify-between h-24", i !== 3 && "border-r border-border")}>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</span>
                <div>
                  <span className="text-xl font-black tabular-nums numeric tracking-tighter block">{stat.value}</span>
                  <span className="text-[7px] font-bold text-muted-foreground/40 uppercase tracking-widest">{stat.sub}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* DATASHEET_LEDGER */}
        <div className="border border-border bg-background">
          <div className="h-10 px-4 flex items-center justify-between border-b border-border bg-muted/20">
            <div className="flex items-center gap-6">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground">GOAL_AUDIT_LEDGER</span>
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
                placeholder="FILTER_ID..."
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
                  <th className="text-left p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border">ENTITY_DESCRIPTOR</th>
                  <th className="text-left p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border">PRIORITY</th>
                  <th className="text-left p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border">PROGRESS_SYNC</th>
                  <th className="text-right p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border">CAPITAL_DEPLOYED</th>
                  <th className="text-right p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border">TARGET_CAPITAL</th>
                  <th className="text-right p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredGoals.map((goal, idx) => {
                  const progress = calculateGoalProgress(goal);
                  return (
                    <tr key={goal.id} className="group hover:bg-muted/5 transition-none">
                      <td className="p-3 text-[9px] font-bold font-mono text-muted-foreground/40 border-r border-border align-middle">
                        {(idx + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="p-3 border-r border-border">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-tight">{goal.title}</span>
                          <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">{goal.category || 'UNCLASSIFIED'}</span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-border">
                        <Badge variant="outline" className={cn(
                          "rounded-none h-4 px-1.5 text-[7px] font-black uppercase tracking-widest border border-border/50",
                          goal.priority === 'CRITICAL' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : 
                          goal.priority === 'HIGH' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "text-muted-foreground"
                        )}>
                          {goal.priority}
                        </Badge>
                      </td>
                      <td className="p-3 border-r border-border">
                         <div className="flex items-center gap-3">
                            <div className="flex-1 h-1 bg-border rounded-none">
                               <div className="bg-foreground h-full" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-[9px] font-black font-mono w-8 text-right">{progress}%</span>
                         </div>
                      </td>
                      <td className="p-3 border-r border-border text-right text-[10px] font-black tabular-nums numeric">
                        {formatCurrency(goal.currentAmount)}
                      </td>
                      <td className="p-3 border-r border-border text-right text-[10px] font-black tabular-nums numeric">
                        {formatCurrency(goal.targetAmount)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-none">
                          <Button variant="outline" size="icon" className="size-6 rounded-none border-border" onClick={() => openEditDialog(goal)}>
                            <Target className="size-3" />
                          </Button>
                          <Button variant="outline" size="icon" className="size-6 rounded-none border-border text-rose-500 hover:bg-rose-500/10" onClick={() => handleDelete(goal.id)}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredGoals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      NO_RECORDS_AVAILABLE
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
        <SheetContent side="bottom" className="h-[92vh] sm:h-auto sm:max-w-lg rounded-t-[2.5rem] p-0 overflow-hidden border-t border-border/10">
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-1.5 rounded-full bg-muted/40" />
          </div>
          <div className="px-6 py-4 overflow-y-auto h-full pb-32 sm:pb-6">
            <SheetHeader className="text-left mb-6">
              <SheetTitle className="text-xl font-black uppercase tracking-widest">{editingGoal ? 'Update goal' : 'Create goal'}</SheetTitle>
              <SheetDescription className="text-xs font-semibold uppercase tracking-tight opacity-70">
                Define your target amount, savings progress, and timeline.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="goal-title">
                  Title
                </label>
                <Input
                  id="goal-title"
                  placeholder="Build an emergency fund"
                  value={formState.title}
                  onChange={(event) => handleFormChange('title', event.target.value)}
                  className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="goal-description">
                  Description
                </label>
                <Textarea
                  id="goal-description"
                  rows={3}
                  placeholder="Add more context so you stay motivated"
                  value={formState.description}
                  onChange={(event) => handleFormChange('description', event.target.value)}
                  className="bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50 resize-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="goal-target">
                    Target (₹)
                  </label>
                  <Input
                    id="goal-target"
                    type="number"
                    min="0"
                    value={formState.targetAmount}
                    onChange={(event) => handleFormChange('targetAmount', event.target.value)}
                    className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="goal-current">
                    Saved (₹)
                  </label>
                  <Input
                    id="goal-current"
                    type="number"
                    min="0"
                    value={formState.currentAmount}
                    onChange={(event) => handleFormChange('currentAmount', event.target.value)}
                    className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="goal-date">
                    Target date
                  </label>
                  <Input
                    id="goal-date"
                    type="date"
                    value={formState.targetDate}
                    onChange={(event) => handleFormChange('targetDate', event.target.value)}
                    className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1" htmlFor="goal-category">
                    Category
                  </label>
                  <Input
                    id="goal-category"
                    placeholder="e.g. savings, travel"
                    value={formState.category}
                    onChange={(event) => handleFormChange('category', event.target.value)}
                    className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">Priority</label>
                <Select
                  value={formState.priority}
                  onValueChange={(value) => handleFormChange('priority', value as GoalPriority)}
                >
                  <SelectTrigger className="h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <SelectItem key={priority} value={priority} className="capitalize">
                        {priority.toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoalIcon className="h-4 w-4" />}
                  {editingGoal ? 'Update goal' : 'Create goal'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
