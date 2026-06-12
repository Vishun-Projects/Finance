
'use client';

import { useState, useMemo, useCallback, useTransition, useEffect, useOptimistic } from 'react';
import { useSearchParams } from 'next/navigation';
import { Goal, GoalPriority, GoalStatus } from '@/features/plans/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { patterns } from '@/design/patterns';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  CheckCircle,
  Filter,
  Goal as GoalIcon,
  Loader2,
  Plus,
  RefreshCw,
  Target,
  Trash2,
} from 'lucide-react';
import { normalizeGoals } from '@/lib/utils/goal-normalize';
import { CompactListRow } from '@/components/ui/compact-list-row';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';
import { Chip } from '@/components/ui/chip';
import {
  computeGoalMonthlyRequired,
  formatDisciplineCurrency,
  goalPaceLabel,
  type DisciplineSummary,
} from '@/lib/plans-discipline';
import { formatDateLabel } from '@/features/plans/hooks/use-plans-insights';

interface GoalsPageClientProps {
  initialGoals: Goal[];
  userId: string;
  layoutVariant?: 'standalone' | 'embedded';
  onGoalsChange?: (goals: Goal[]) => void;
  disciplineSummary?: DisciplineSummary | null;
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
const CONTRIBUTION_SOURCES = ['Salary', 'Savings', 'Bonus', 'Investment', 'Other'] as const;

interface ContributionFormState {
  amount: string;
  source: (typeof CONTRIBUTION_SOURCES)[number];
  note: string;
}

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
  disciplineSummary,
}: GoalsPageClientProps) {
  const [goals, setGoals] = useState<Goal[]>(() => normalizeGoals(initialGoals));
  const [optimisticGoals, markGoalCompleteOptimistic] = useOptimistic(
    goals,
    (state, goalId: string) =>
      state.map((g) =>
        g.id === goalId
          ? { ...g, status: 'COMPLETED' as GoalStatus, currentAmount: g.targetAmount }
          : g,
      ),
  );
  const displayGoals = optimisticGoals;
  const [statusFilter, setStatusFilter] = useState<'all' | GoalStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | GoalPriority>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [actionGoal, setActionGoal] = useState<Goal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [contributionForm, setContributionForm] = useState<ContributionFormState>({
    amount: '',
    source: 'Savings',
    note: '',
  });
  const [isContributing, setIsContributing] = useState(false);
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
  const searchParams = useSearchParams();

  useEffect(() => {
    if (initialGoals.length > 0) {
      setGoals(normalizeGoals(initialGoals));
    }
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

  const openContributionDialog = (goal: Goal) => {
    setContributionGoal(goal);
    setContributionForm({ amount: '', source: 'Savings', note: '' });
    setContributionOpen(true);
  };

  const resetContributionForm = () => {
    setContributionGoal(null);
    setContributionForm({ amount: '', source: 'Savings', note: '' });
  };

  useEffect(() => {
    if (searchParams.get('action') === 'new' && searchParams.get('tab') === 'goals') {
      openCreateDialog();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  useEffect(() => {
    if (initialGoals.length === 0 && userId) {
      void refreshGoals();
    }
  }, [initialGoals.length, userId, refreshGoals]);

  const filteredGoals = useMemo(() => {
    return displayGoals.filter((goal) => {
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
  }, [displayGoals, searchTerm, statusFilter, priorityFilter]);

  const goalStats = useMemo(() => {
    const totalTarget = displayGoals.reduce((sum, goal) => sum + (goal.targetAmount ?? 0), 0);
    const totalCurrent = displayGoals.reduce((sum, goal) => sum + (goal.currentAmount ?? 0), 0);
    const completed = displayGoals.filter((goal) => calculateGoalProgress(goal) >= 100 || goal.status === 'COMPLETED').length;
    const active = displayGoals.length - completed;

    return {
      total: displayGoals.length,
      completed,
      active,
      progressPercent: totalTarget ? Math.round((totalCurrent / totalTarget) * 100) : 0,
      totalTarget,
      totalCurrent,
    };
  }, [displayGoals]);

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
    markGoalCompleteOptimistic(goal.id);
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
      await refreshGoals();
    }
  };

  const handleContribute = async () => {
    if (!contributionGoal) return;

    const amount = parseFloat(contributionForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    setIsContributing(true);
    try {
      const newTotal = contributionGoal.currentAmount + amount;
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contributionGoal.id,
          contributionAmount: amount,
          contributionSource: contributionForm.source,
          contributionNote: contributionForm.note.trim() || null,
          currentAmount: newTotal,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add contribution');
      }

      setContributionOpen(false);
      resetContributionForm();
      const updated = await refreshGoals();
      if (!updated && onGoalsChange) {
        onGoalsChange(goals);
      }
    } catch (error) {
      console.error('[goals] contribution failed', error);
    } finally {
      setIsContributing(false);
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
        {disciplineSummary && disciplineSummary.capacity.available > 0 && goals.length > 0 && (
          <section className="card-base border-[var(--success)]/30 bg-[var(--success)]/5 p-3">
            <p className="text-sm font-medium text-foreground">Fund goals from plan headroom</p>
            <p className="mt-1 text-xs text-muted">
              You have {formatDisciplineCurrency(disciplineSummary.capacity.available)} available this month from
              headroom + underspend. Mark a contribution from SIP or savings toward a goal below.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 h-8"
              onClick={() => {
                const behind = goals.find((g) => g.status === 'ACTIVE');
                if (behind) openContributionDialog(behind);
              }}
            >
              Record goal contribution
            </Button>
          </section>
        )}

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
        ) : null}

        {!isEmbedded ? (
          <section className={cn(patterns.cardGrid, 'lg:grid-cols-4')}>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Total target</p>
              <p className="mt-2 text-2xl font-medium tabular-nums numeric">{formatCurrency(goalStats.totalTarget)}</p>
              <p className="mt-1 text-xs text-muted">{goalStats.total} goals</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Saved so far</p>
              <p className="mt-2 text-2xl font-medium tabular-nums numeric">{formatCurrency(goalStats.totalCurrent)}</p>
              <p className="mt-1 text-xs text-muted">{goalStats.progressPercent}% progress</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Active</p>
              <p className="mt-2 text-2xl font-medium tabular-nums numeric">{goalStats.active}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Completed</p>
              <p className="mt-2 text-2xl font-medium tabular-nums numeric">{goalStats.completed}</p>
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
                placeholder="Search goals…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full max-w-xs"
              />
            </div>
            <div className="lg:hidden">
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
                  placeholder="Search goals…"
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
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Goal</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Pace</th>
                  <th className="px-4 py-3">₹/month</th>
                  <th className="px-4 py-3 text-right">Saved</th>
                  <th className="px-4 py-3 text-right">Target</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredGoals.map((goal, idx) => {
                  const progress = calculateGoalProgress(goal);
                  const discipline = computeGoalMonthlyRequired(goal);
                  return (
                    <tr key={goal.id} className="hover:bg-surface/80">
                      <td className="px-4 py-3 text-xs text-muted tabular-nums">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{goal.title}</p>
                        {goal.targetDate ? (
                          <p className="text-[11px] text-muted">Target {formatDateLabel(goal.targetDate)}</p>
                        ) : (
                          <p className="text-[11px] text-muted">No target date</p>
                        )}
                        {goal.category ? (
                          <p className="text-xs text-muted capitalize">{goal.category}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">{goal.priority.toLowerCase()}</Badge>
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className="text-xs tabular-nums text-muted w-8 text-right">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Chip
                          variant={
                            discipline.paceStatus === 'on_track'
                              ? 'success'
                              : discipline.paceStatus === 'behind'
                                ? 'warning'
                                : 'neutral'
                          }
                          className="text-[10px]"
                        >
                          {goalPaceLabel(discipline.paceStatus)}
                        </Chip>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs text-muted">
                        {discipline.monthlyRequired != null
                          ? formatDisciplineCurrency(discipline.monthlyRequired)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums numeric">{formatCurrency(goal.currentAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums numeric">{formatCurrency(goal.targetAmount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-[var(--success)]"
                            title="Add contribution"
                            onClick={() => openContributionDialog(goal)}
                          >
                            <ArrowUpRight className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="Mark complete"
                            onClick={() => handleMarkCompleted(goal)}
                          >
                            <CheckCircle className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(goal)}>
                            <Target className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-[var(--danger)]" onClick={() => handleDelete(goal.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredGoals.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted">
                      No goals found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border lg:hidden">
            {filteredGoals.map((goal) => {
              const progress = calculateGoalProgress(goal);
              const discipline = computeGoalMonthlyRequired(goal);
              return (
                <CompactListRow
                  key={goal.id}
                  icon={<Target className="size-4 text-muted" />}
                  title={goal.title}
                  subtitle={
                    discipline.monthlyRequired != null
                      ? `${formatDisciplineCurrency(discipline.monthlyRequired)}/mo · ${goalPaceLabel(discipline.paceStatus)}`
                      : goal.targetDate
                        ? `Target ${formatDateLabel(goal.targetDate)} · ${goalPaceLabel(discipline.paceStatus)}`
                        : 'Set target date'
                  }
                  trailing={
                    <span className="text-xs text-muted">
                      {progress}% · {formatCurrency(goal.currentAmount)}
                    </span>
                  }
                  onClick={() => setActionGoal(goal)}
                />
              );
            })}
            {filteredGoals.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-muted">No goals found.</p>
            )}
          </div>
        </section>
      </div>

      <ResponsiveSheet
        open={!!actionGoal}
        onOpenChange={(open) => !open && setActionGoal(null)}
        title={actionGoal?.title ?? 'Goal'}
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => {
                if (actionGoal) {
                  openContributionDialog(actionGoal);
                  setActionGoal(null);
                }
              }}
            >
              <ArrowUpRight className="mr-2 size-3.5" />
              Add contribution
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (actionGoal) {
                  void handleMarkCompleted(actionGoal);
                  setActionGoal(null);
                }
              }}
            >
              <CheckCircle className="mr-2 size-3.5" />
              Mark complete
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (actionGoal) openEditDialog(actionGoal);
                setActionGoal(null);
              }}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-[var(--danger)]"
              onClick={() => {
                if (actionGoal) handleDelete(actionGoal.id);
                setActionGoal(null);
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        {actionGoal && (
          <div className="space-y-3 text-sm">
            {(() => {
              const discipline = computeGoalMonthlyRequired(actionGoal);
              return (
                <>
                  <p className="text-muted">
                    {calculateGoalProgress(actionGoal)}% · {formatCurrency(actionGoal.currentAmount)} of{' '}
                    {formatCurrency(actionGoal.targetAmount)}
                  </p>
                  {discipline.monthlyRequired != null && (
                    <p className="text-xs text-foreground">
                      Save {formatDisciplineCurrency(discipline.monthlyRequired)}/mo
                      {actionGoal.targetDate ? ` until ${formatDateLabel(actionGoal.targetDate)}` : ''}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize">{actionGoal.priority.toLowerCase()}</Badge>
                    <Chip
                      variant={
                        discipline.paceStatus === 'on_track'
                          ? 'success'
                          : discipline.paceStatus === 'behind'
                            ? 'warning'
                            : 'neutral'
                      }
                      className="text-[10px]"
                    >
                      {goalPaceLabel(discipline.paceStatus)}
                    </Chip>
                  </div>
                </>
              );
            })()}
            {actionGoal.contributions && actionGoal.contributions.length > 0 && (
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Recent contributions</p>
                {actionGoal.contributions.slice(0, 3).map((contribution) => (
                  <div key={contribution.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted">{contribution.source}</span>
                    <span className="tabular-nums text-foreground">{formatCurrency(contribution.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ResponsiveSheet>

      <ResponsiveSheet
        open={contributionOpen}
        onOpenChange={(open) => {
          setContributionOpen(open);
          if (!open) resetContributionForm();
        }}
        title="Add contribution"
        description={contributionGoal ? `Add funds to ${contributionGoal.title}` : undefined}
        footer={
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setContributionOpen(false);
                resetContributionForm();
              }}
              disabled={isContributing}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleContribute}
              disabled={isContributing || !contributionForm.amount}
            >
              {isContributing ? <Loader2 className="size-4 animate-spin" /> : 'Save contribution'}
            </Button>
          </div>
        }
      >
        {contributionGoal && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-surface p-3 text-sm">
              <p className="text-muted">Current saved</p>
              <p className="mt-1 text-lg font-medium tabular-nums">{formatCurrency(contributionGoal.currentAmount)}</p>
              <p className="mt-2 text-xs text-hint">
                Target {formatCurrency(contributionGoal.targetAmount)}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="contribution-amount">
                Amount (₹)
              </label>
              <Input
                id="contribution-amount"
                type="number"
                min="1"
                placeholder="5000"
                value={contributionForm.amount}
                onChange={(event) => setContributionForm((prev) => ({ ...prev, amount: event.target.value }))}
                className="h-11"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Source</label>
              <Select
                value={contributionForm.source}
                onValueChange={(value) =>
                  setContributionForm((prev) => ({
                    ...prev,
                    source: value as ContributionFormState['source'],
                  }))
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRIBUTION_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="contribution-note">
                Note (optional)
              </label>
              <Textarea
                id="contribution-note"
                rows={2}
                placeholder="e.g. May salary savings"
                value={contributionForm.note}
                onChange={(event) => setContributionForm((prev) => ({ ...prev, note: event.target.value }))}
              />
            </div>
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
        title={editingGoal ? 'Update goal' : 'Create goal'}
        description="Set your target amount, progress, and timeline."
        footer={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
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
        }
      >
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="goal-title">
                  Title
                </label>
                <Input
                  id="goal-title"
                  placeholder="Build an emergency fund"
                  value={formState.title}
                  onChange={(event) => handleFormChange('title', event.target.value)}
                  className="h-11"
                  autoFocus
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
                  className="bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50 resize-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="goal-target">
                    Target (₹)
                  </label>
                  <Input
                    id="goal-target"
                    type="number"
                    min="0"
                    value={formState.targetAmount}
                    onChange={(event) => handleFormChange('targetAmount', event.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="goal-current">
                    Saved (₹)
                  </label>
                  <Input
                    id="goal-current"
                    type="number"
                    min="0"
                    value={formState.currentAmount}
                    onChange={(event) => handleFormChange('currentAmount', event.target.value)}
                    className="h-11"
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
                    className="h-11"
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
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Priority</label>
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

            </div>
      </ResponsiveSheet>
    </div>
  );
}
