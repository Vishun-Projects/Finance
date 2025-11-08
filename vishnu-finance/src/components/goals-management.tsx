'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Target, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Edit, 
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  BarChart3,
  PieChart,
  ArrowLeft,
  Save
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PageSkeleton from './page-skeleton';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
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
  useEffect(() => {
    if (user && !authLoading) {
      fetchGoals();
    }
  }, [user, authLoading]);

  const fetchGoals = async () => {
    if (!user) return;
    
    try {
      setIsFetching(true);
      setError(null);
      
      const response = await fetch(`/api/goals?userId=${user.id}`);
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
  };

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
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount) || 0,
          userId: user.id
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
      const response = await fetch(`/api/goals?id=${id}`, {
        method: 'DELETE',
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
          <h2 className="text-2xl font-bold text-primary">Goals Management</h2>
          <p className="text-muted">Set and track your financial goals</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Goals</p>
              <p className="text-2xl font-bold text-primary">{totalGoals}</p>
            </div>
            <div className="minimal-stat-inset">
              <Target className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Completed</p>
              <p className="text-2xl font-bold text-success">{completedGoals}</p>
            </div>
            <div className="minimal-stat-inset">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Target</p>
              <p className="text-2xl font-bold text-info currency-inr">{formatCurrency(totalTargetAmount)}</p>
            </div>
            <div className="minimal-stat-inset">
              <DollarSign className="w-6 h-6 text-info" />
            </div>
          </div>
        </div>

        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Saved</p>
              <p className="text-2xl font-bold text-success currency-inr">{formatCurrency(totalCurrentAmount)}</p>
            </div>
            <div className="minimal-stat-inset">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>
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

      {/* Goals List */}
      <div className="minimal-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-primary">Your Goals</h3>
          <span className="text-sm text-muted">{goals.length} goals</span>
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
                <div key={goal.id} className="minimal-card-inset p-6 hover-lift transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                                             <div className="flex items-center space-x-3 mb-2">
                         <h4 className="text-lg font-semibold text-primary">{goal.title}</h4>
                         {isCompleted && (
                           <span className="minimal-badge minimal-badge-success">
                             Completed
                           </span>
                         )}
                       </div>
                      <p className="text-muted mb-3">{goal.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted">Target Amount</p>
                          <p className="font-semibold text-primary currency-inr">{formatCurrency(goal.targetAmount)}</p>
                      </div>
                      <div>
                          <p className="text-sm text-muted">Current Amount</p>
                          <p className="font-semibold text-success currency-inr">{formatCurrency(goal.currentAmount)}</p>
                      </div>
                        <div>
                          <p className="text-sm text-muted">Target Date</p>
                          <p className="font-semibold text-info">{goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('en-IN') : 'Not set'}</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted">Progress</span>
                          <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>
                        <div className="minimal-progress">
                      <div 
                            className="minimal-progress-fill" 
                            style={{ width: `${progress}%` }}
                      ></div>
                        </div>
                    </div>
                  </div>
                  
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="minimal-button-small p-2 text-error hover:bg-error hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
