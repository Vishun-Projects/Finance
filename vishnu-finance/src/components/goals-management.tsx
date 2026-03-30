'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle,
  ArrowLeft,
  Save
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PageSkeleton from '@/components/feedback/page-skeleton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Combobox } from './ui/combobox';

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  category?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function GoalsManagement() {
  const { user, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    category: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch goals on component mount
  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      setIsFetching(true);
      setError(null);

      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'goals_list', userId: user.id }),
      });
      if (response.ok) {
        const data = await response.json();
        setGoals(data);
      } else {
        throw new Error('Failed to fetch goals');
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      setError('Failed to load goals data. Please try again.');
    } finally {
      setIsFetching(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) {
      void fetchGoals();
    }
  }, [user, authLoading, fetchGoals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'goals_create',
          ...formData,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount) || 0,
          userId: user.id,
        }),
      });

      if (response.ok) {
        setFormData({
          title: '',
          description: '',
          targetAmount: '',
          currentAmount: '',
          targetDate: '',
          category: ''
        });
        setShowForm(false);
        // Refresh goals list
        fetchGoals();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add goal');
      }
    } catch (err) {
      console.error('Error adding goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to add goal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'goals_delete', id }),
      });

      if (response.ok) {
        fetchGoals();
      } else {
        throw new Error('Failed to delete goal');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError('Failed to delete goal. Please try again.');
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };



  const totalGoals = goals.length;
  const completedGoals = goals.filter(goal => goal.currentAmount >= goal.targetAmount).length;
  const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  if (isFetching) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-black tracking-tighter uppercase text-foreground">Strategic Allocation</h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Capital Deployment & Goal Audit</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchGoals}
            className="minimal-button-small flex items-center space-x-2 btn-touch"
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="minimal-button-primary flex items-center space-x-2 btn-touch"
          >
            <Plus className="w-4 h-4" />
            <span>Add Goal</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="minimal-card-inset p-4 border-l-4 border-error">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-error" />
            <span className="text-error font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-error hover:text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats - Industrial Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Primary Targets', value: totalGoals, Icon: Target, color: 'text-primary' },
          { label: 'Secured', value: completedGoals, Icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Capital Required', value: formatCurrency(totalTargetAmount), Icon: DollarSign, color: 'text-blue-500' },
          { label: 'Deployed', value: formatCurrency(totalCurrentAmount), Icon: TrendingUp, color: 'text-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className="card-base p-4 border-l-4 border-l-border hover:border-l-primary transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <stat.Icon className={cn("w-4 h-4 opacity-50", stat.color)} />
            </div>
            <p className={cn("text-xl font-black tracking-tight tabular-nums", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Add Goal Form */}
      {showForm && (
        <div className="minimal-card p-8 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-primary">Add New Goal</h3>
            <button
              onClick={() => setShowForm(false)}
              className="minimal-button-small p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title Field */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-primary mb-3">
                  Goal Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="minimal-input"
                  placeholder="e.g., Buy a House, Emergency Fund"
                />
              </div>

              {/* Category Field */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-primary mb-3">
                  Category
                </label>
                <Combobox
                  options={[
                    { value: 'Savings', label: 'Savings' },
                    { value: 'Investment', label: 'Investment' },
                    { value: 'Purchase', label: 'Purchase' },
                    { value: 'Emergency Fund', label: 'Emergency Fund' },
                    { value: 'Travel', label: 'Travel' },
                    { value: 'Education', label: 'Education' },
                    { value: 'Other', label: 'Other' }
                  ]}
                  value={formData.category}
                  onValueChange={(value) => {
                    const event = {
                      target: { name: 'category', value: value || '' }
                    } as React.ChangeEvent<HTMLSelectElement>;
                    handleChange(event);
                  }}
                  placeholder="Select a category"
                  searchPlaceholder="Search categories..."
                />
              </div>

              {/* Target Amount Field */}
              <div>
                <label htmlFor="targetAmount" className="block text-sm font-semibold text-primary mb-3">
                  Target Amount (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign className="w-5 h-5 text-muted" />
                  </div>
                  <input
                    id="targetAmount"
                    name="targetAmount"
                    type="number"
                    step="0.01"
                    required
                    value={formData.targetAmount}
                    onChange={handleChange}
                    className="minimal-input pl-12"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Current Amount Field */}
              <div>
                <label htmlFor="currentAmount" className="block text-sm font-semibold text-primary mb-3">
                  Current Amount (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign className="w-5 h-5 text-muted" />
                  </div>
                  <input
                    id="currentAmount"
                    name="currentAmount"
                    type="number"
                    step="0.01"
                    value={formData.currentAmount}
                    onChange={handleChange}
                    className="minimal-input pl-12"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Target Date Field */}
              <div>
                <label htmlFor="targetDate" className="block text-sm font-semibold text-primary mb-3">
                  Target Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Calendar className="w-5 h-5 text-muted" />
                  </div>
                  <input
                    id="targetDate"
                    name="targetDate"
                    type="date"
                    required
                    value={formData.targetDate}
                    onChange={handleChange}
                    className="minimal-input pl-12"
                  />
                </div>
              </div>


            </div>

            {/* Description Field */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-primary mb-3">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="minimal-textarea"
                placeholder="Optional description of your goal..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="minimal-button-primary w-full flex justify-center items-center py-4 px-6 font-semibold disabled:opacity-50 disabled:cursor-not-allowed btn-touch"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="minimal-loading mr-2"></div>
                  Adding Goal...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  Add Goal
                </div>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Goals List - High Density Audit */}
      <div className="card-base p-0 overflow-hidden border-none bg-transparent space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-secondary">Active Deployment Pipeline</h3>
          <span className="text-[10px] font-black text-muted-foreground uppercase">{goals.length} Strategic Units</span>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-muted text-lg font-medium mb-2">No goals set yet</p>
            <p className="text-muted">Set your first financial goal to get started!</p>
            <button
              onClick={() => setShowForm(true)}
              className="minimal-button-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Goal
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {goals.map((goal) => {
              const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
              const isCompleted = goal.currentAmount >= goal.targetAmount;

              return (
                <div key={goal.id} className="card-base p-6 border-l-4 border-l-primary/20 hover:border-l-primary transition-all">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-base font-black uppercase tracking-tight text-foreground">{goal.title}</h4>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{goal.category || 'General Capital'}</p>
                        </div>
                        {isCompleted && (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
                            Strategic Goal Secured
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 rounded bg-muted/20 border border-border/50">
                        <div>
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Target</p>
                          <p className="text-sm font-black text-foreground tabular-nums">{formatCurrency(goal.targetAmount)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Funded</p>
                          <p className="text-sm font-black text-emerald-500 tabular-nums">{formatCurrency(goal.currentAmount)}</p>
                        </div>
                        <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-border/50 pt-2 md:pt-0 md:pl-4">
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Deadline</p>
                          <p className="text-sm font-black text-foreground uppercase">{goal.targetDate ? format(new Date(goal.targetDate), 'MMM yyyy') : 'No Limit'}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Allocation Progress</span>
                          <span className="text-xs font-black text-primary tabular-nums">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                          <div
                            className="h-full bg-primary transition-all duration-500 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6">
                      <Button variant="outline" size="sm" className="h-9 px-3 border-border hover:bg-muted text-[10px] font-black uppercase tracking-widest">
                        Update
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(goal.id)}
                        className="h-9 px-3 border-border hover:bg-rose-500/10 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest"
                      >
                        Abort
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
