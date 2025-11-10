
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
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  CheckCircle,
  ClipboardList,
  Goal as GoalIcon,
  Loader2,
  Plus,
  RefreshCw,
  Target,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { normalizeGoals } from '@/lib/utils/goal-normalize';

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
            ? 'space-y-4'
            : 'container-fluid space-y-6 pb-16 pt-6 md:pt-8 lg:pt-10',
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
              <Button className="gap-2" onClick={openCreateDialog}>
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
                <CardDescription>Total goals</CardDescription>
                <CardTitle className="text-3xl">
                  {goalStats.total}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-4 w-4" />
                  {goalStats.completed} completed
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active goals</CardDescription>
                <CardTitle className="text-3xl">{goalStats.active}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Momentum matters
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Invested amount</CardDescription>
                <CardTitle className="text-3xl">{formatCurrency(goalStats.totalCurrent)}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                toward ₹{goalStats.totalTarget.toLocaleString('en-IN')}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Overall progress</CardDescription>
                <CardTitle className="text-3xl">{goalStats.progressPercent}%</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                toward ₹{goalStats.totalTarget.toLocaleString('en-IN')} in targets
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 space-y-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | GoalStatus)}>
              <TabsList className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((status) => (
                  <TabsTrigger key={status} value={status} className="capitalize">
                    {status === 'all' ? 'All' : status.toLowerCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                <Button
                  className={cn(
                    'h-9 rounded-md border px-3 text-sm capitalize transition-colors',
                    priorityFilter === 'all'
                      ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                  onClick={() => setPriorityFilter('all')}
                >
                  All priorities
                </Button>
                {PRIORITY_OPTIONS.map((priority) => (
                  <Button
                    key={priority}
                    className={cn(
                      'h-9 rounded-md border px-3 text-sm capitalize transition-colors',
                      priorityFilter === priority
                        ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border-border bg-card text-foreground hover:bg-muted'
                    )}
                    onClick={() => setPriorityFilter(priority)}
                  >
                    {priority.toLowerCase()}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Search goals"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full min-w-[200px] sm:w-64"
              />
            </div>
          </div>

          <Tabs value="list">
            <TabsContent value="list" className="mt-4 space-y-4">
              {filteredGoals.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {goals.length === 0 ? 'Create your first goal to get started.' : 'No goals match the current filters.'}
                  </CardContent>
                </Card>
              ) : (
                filteredGoals.map((goal) => {
                  const progress = calculateGoalProgress(goal);
                  const isCompleted = progress >= 100 || goal.status === 'COMPLETED';

                  return (
                    <Card key={goal.id} className="border-border/70 shadow-none">
                      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold capitalize',
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-primary/10 text-primary'
                              )}
                            >
                              {goal.priority.toLowerCase()}
                            </span>
                            {goal.category && (
                              <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-semibold capitalize text-muted-foreground">
                                {goal.category.toLowerCase()}
                              </span>
                            )}
                            {isCompleted && (
                              <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                                Completed
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              {goal.title}
                            </h3>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground">
                                {goal.description}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span>
                                Target: {formatCurrency(goal.targetAmount ?? 0)}
                              </span>
                              <span>
                                Saved: {formatCurrency(goal.currentAmount ?? 0)}
                              </span>
                              {goal.targetDate && (
                                <span>
                                  Due by {new Date(goal.targetDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-2 rounded-full bg-primary transition-all',
                                  progress >= 100 && 'bg-emerald-500'
                                )}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-stretch gap-2 sm:w-64">
                          <Button
                            className="justify-between border border-border bg-card text-foreground hover:bg-muted"
                            onClick={() => openEditDialog(goal)}
                          >
                            <span>Edit goal</span>
                            <Target className="h-4 w-4" />
                          </Button>
                          <Button
                            className={cn(
                              'justify-between',
                              isCompleted
                                ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            )}
                            disabled={isCompleted}
                            onClick={() => handleMarkCompleted(goal)}
                          >
                            <span>{isCompleted ? 'Completed' : 'Mark complete'}</span>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            className="justify-between bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-70"
                            onClick={() => handleDelete(goal.id)}
                            disabled={isDeleting === goal.id}
                          >
                            <span>{isDeleting === goal.id ? 'Deleting…' : 'Delete'}</span>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Update goal' : 'Create goal'}</DialogTitle>
            <DialogDescription>
              Define your target amount, savings progress, and timeline to stay accountable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="goal-title">
                Title
              </label>
              <Input
                id="goal-title"
                placeholder="Build an emergency fund"
                value={formState.title}
                onChange={(event) => handleFormChange('title', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="goal-description">
                Description
              </label>
              <Textarea
                id="goal-description"
                rows={3}
                placeholder="Add more context so you stay motivated"
                value={formState.description}
                onChange={(event) => handleFormChange('description', event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="goal-target">
                  Target amount (₹)
                </label>
                <Input
                  id="goal-target"
                  type="number"
                  min="0"
                  value={formState.targetAmount}
                  onChange={(event) => handleFormChange('targetAmount', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="goal-current">
                  Saved so far (₹)
                </label>
                <Input
                  id="goal-current"
                  type="number"
                  min="0"
                  value={formState.currentAmount}
                  onChange={(event) => handleFormChange('currentAmount', event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="goal-date">
                  Target date
                </label>
                <Input
                  id="goal-date"
                  type="date"
                  value={formState.targetDate}
                  onChange={(event) => handleFormChange('targetDate', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="goal-category">
                  Category
                </label>
                <Input
                  id="goal-category"
                  placeholder="e.g. savings, travel"
                  value={formState.category}
                  onChange={(event) => handleFormChange('category', event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <Select
                value={formState.priority}
                onValueChange={(value) => handleFormChange('priority', value as GoalPriority)}
              >
                <SelectTrigger>
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
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoalIcon className="h-4 w-4" />}
              {editingGoal ? 'Update goal' : 'Create goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
