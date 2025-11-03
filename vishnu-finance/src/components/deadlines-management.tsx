'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  Search,
  Download,
  Repeat,
  DollarSign,
  CreditCard,
  Building,
  Home,
  Car,
  GraduationCap,
  Heart,
  ShoppingCart,
  Plane,
  Gift,
  FileText
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Deadline } from '@/types';
import PageSkeleton from './page-skeleton';
import { Combobox } from './ui/combobox';

export default function DeadlinesManagement() {
  const { user, loading: authLoading } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    amount: '',
    category: '',
    isRecurring: false,
    frequency: 'monthly',
    paymentMethod: '',
    accountDetails: '',
    notes: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'rent': return <Home className="w-4 h-4" />;
      case 'mortgage': return <Building className="w-4 h-4" />;
      case 'car': return <Car className="w-4 h-4" />;
      case 'education': return <GraduationCap className="w-4 h-4" />;
      case 'healthcare': return <Heart className="w-4 h-4" />;
      case 'shopping': return <ShoppingCart className="w-4 h-4" />;
      case 'travel': return <Plane className="w-4 h-4" />;
      case 'gift': return <Gift className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string, isCompleted: boolean) => {
    if (isCompleted) return 'text-success';
    if (status === 'OVERDUE') return 'text-error';
    return 'text-warning';
  };

  const getStatusIcon = (status: string, isCompleted: boolean) => {
    if (isCompleted) return <CheckCircle className="w-4 h-4" />;
    if (status === 'OVERDUE') return <AlertTriangle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  // Fetch deadlines on component mount
  useEffect(() => {
    if (user && !authLoading) {
      fetchDeadlines();
    }
  }, [user, authLoading]);

  const fetchDeadlines = async () => {
    if (!user) return;
    
    try {
      setIsFetching(true);
      setError(null);
      
      const response = await fetch(`/api/deadlines?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setDeadlines(data);
      } else {
        throw new Error('Failed to fetch deadlines');
      }
    } catch (error) {
      console.error('Error fetching deadlines:', error);
      setError('Failed to load deadlines data. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/deadlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          userId: user.id
        }),
      });

      if (response.ok) {
        setFormData({
          title: '',
          description: '',
          dueDate: '',
          amount: '',
          category: '',
          isRecurring: false,
          frequency: 'monthly',
          paymentMethod: '',
          accountDetails: '',
          notes: ''
        });
        setShowForm(false);
        // Refresh deadlines list
        fetchDeadlines();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add deadline');
      }
    } catch (err) {
      console.error('Error adding deadline:', err);
      setError(err instanceof Error ? err.message : 'Failed to add deadline. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this deadline?')) return;

    try {
      const response = await fetch(`/api/deadlines?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchDeadlines();
      } else {
        throw new Error('Failed to delete deadline');
      }
    } catch (error) {
      console.error('Error deleting deadline:', error);
      setError('Failed to delete deadline. Please try again.');
    }
  };

  const handleToggleComplete = async (id: string, isCompleted: boolean) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/deadlines?id=${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      });

      if (response.ok) {
        fetchDeadlines();
      } else {
        throw new Error('Failed to update deadline');
      }
    } catch (error) {
      console.error('Error updating deadline:', error);
      setError('Failed to update deadline. Please try again.');
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (dueDate: Date, isCompleted: boolean) => {
    if (isCompleted) return 'minimal-badge-success';
    const daysUntil = getDaysUntilDue(dueDate);
    if (daysUntil < 0) return 'minimal-badge-error';
    if (daysUntil <= 7) return 'minimal-badge-warning';
    return 'minimal-badge-info';
  };

  const getStatusText = (dueDate: Date, isCompleted: boolean) => {
    if (isCompleted) return 'Completed';
    const daysUntil = getDaysUntilDue(dueDate);
    if (daysUntil < 0) return 'Overdue';
    if (daysUntil === 0) return 'Due Today';
    if (daysUntil === 1) return 'Due Tomorrow';
    if (daysUntil <= 7) return `Due in ${daysUntil} days`;
    return `Due in ${daysUntil} days`;
  };

  const filteredDeadlines = deadlines.filter(deadline => {
    const matchesSearch = deadline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deadline.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deadline.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'pending' && !deadline.isCompleted) ||
                         (filterStatus === 'completed' && deadline.isCompleted) ||
                         (filterStatus === 'overdue' && !deadline.isCompleted && getDaysUntilDue(deadline.dueDate) < 0);
    
    const matchesCategory = filterCategory === 'all' || deadline.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalDeadlines = deadlines.length;
  const completedDeadlines = deadlines.filter(deadline => deadline.isCompleted).length;
  const overdueDeadlines = deadlines.filter(deadline => 
    !deadline.isCompleted && getDaysUntilDue(deadline.dueDate) < 0
  ).length;
  const upcomingDeadlines = deadlines.filter(deadline => 
    !deadline.isCompleted && getDaysUntilDue(deadline.dueDate) <= 7 && getDaysUntilDue(deadline.dueDate) >= 0
  ).length;
  const recurringDeadlines = deadlines.filter(deadline => deadline.isRecurring).length;

  const categories = Array.from(new Set(deadlines.map(d => d.category).filter(Boolean)));

  if (isFetching) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-primary">Deadlines Management</h2>
          <p className="text-muted">Track important financial deadlines and due dates</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchDeadlines}
            className="minimal-button-secondary flex items-center space-x-2"
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="minimal-button-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Deadline</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="minimal-card-inset p-4 border-l-4 border-error">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-error" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Deadlines</p>
              <p className="text-2xl font-bold text-primary">{totalDeadlines}</p>
            </div>
            <div className="minimal-stat-inset">
              <Clock className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Completed</p>
              <p className="text-2xl font-bold text-success">{completedDeadlines}</p>
            </div>
            <div className="minimal-stat-inset">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Overdue</p>
              <p className="text-2xl font-bold text-error">{overdueDeadlines}</p>
            </div>
            <div className="minimal-stat-inset">
              <AlertTriangle className="w-6 h-6 text-error" />
            </div>
          </div>
        </div>

        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Upcoming (7 days)</p>
              <p className="text-2xl font-bold text-warning">{upcomingDeadlines}</p>
            </div>
            <div className="minimal-stat-inset">
              <Calendar className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>

        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Recurring</p>
              <p className="text-2xl font-bold text-info">{recurringDeadlines}</p>
            </div>
            <div className="minimal-stat-inset">
              <Repeat className="w-6 h-6 text-info" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search deadlines..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 minimal-input"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as any)}
            className="minimal-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCategory(e.target.value)}
            className="minimal-select"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <button className="minimal-button-small p-2">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Deadline Form */}
      {showForm && (
        <div className="minimal-card p-8 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-primary">Add New Deadline</h3>
            <button
              onClick={() => setShowForm(false)}
              className="minimal-button-small p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title Field */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-primary mb-3">
                  Deadline Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="minimal-input"
                  placeholder="e.g., Tax Filing, Insurance Renewal"
                />
              </div>

              {/* Category Field */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-primary mb-3">
                  Category
                </label>
                <Combobox
                  options={[
                    { value: 'Tax', label: 'Tax' },
                    { value: 'Insurance', label: 'Insurance' },
                    { value: 'Loan', label: 'Loan' },
                    { value: 'Credit Card', label: 'Credit Card' },
                    { value: 'Utility', label: 'Utility' },
                    { value: 'Subscription', label: 'Subscription' },
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

              {/* Due Date Field */}
              <div>
                <label htmlFor="dueDate" className="block text-sm font-semibold text-primary mb-3">
                  Due Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Calendar className="w-5 h-5 text-muted" />
                  </div>
                  <input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={handleChange}
                    className="minimal-input pl-12"
                  />
                </div>
              </div>

              {/* Amount Field */}
              <div>
                <label htmlFor="amount" className="block text-sm font-semibold text-primary mb-3">
                  Amount (₹) - Optional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign className="w-5 h-5 text-muted" />
                  </div>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    className="minimal-input pl-12"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Payment Method Field */}
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-semibold text-primary mb-3">
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="minimal-select"
                >
                  <option value="">Select payment method</option>
                  <option value="Online Banking">Online Banking</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Account Details Field */}
              <div>
                <label htmlFor="accountDetails" className="block text-sm font-semibold text-primary mb-3">
                  Account Details
                </label>
                <input
                  id="accountDetails"
                  name="accountDetails"
                  type="text"
                  value={formData.accountDetails}
                  onChange={handleChange}
                  className="minimal-input"
                  placeholder="Account number, card details, etc."
                />
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
                placeholder="Optional description..."
              />
            </div>

            {/* Recurring Deadline */}
            <div className="flex items-center space-x-3">
              <input
                id="isRecurring"
                name="isRecurring"
                type="checkbox"
                checked={formData.isRecurring}
                onChange={handleChange}
                className="minimal-checkbox"
              />
              <label htmlFor="isRecurring" className="text-sm font-medium text-primary flex items-center space-x-2">
                <Repeat className="w-4 h-4" />
                <span>This is a recurring deadline</span>
              </label>
            </div>

            {formData.isRecurring && (
              <div>
                <label htmlFor="frequency" className="block text-sm font-semibold text-primary mb-3">
                  Frequency
                </label>
                <select
                  id="frequency"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className="minimal-select"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <p className="text-xs text-muted mt-2">
                  Note: Recurring deadlines will automatically create entries for past months if the start date is in the past.
                </p>
              </div>
            )}

            {/* Notes Field */}
            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-primary mb-3">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                className="minimal-textarea"
                placeholder="Additional notes..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="minimal-button-primary w-full flex justify-center items-center py-4 px-6 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="minimal-loading mr-2"></div>
                  Adding Deadline...
                </div>
              ) : (
                <div className="flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Deadline
                </div>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Deadlines List */}
      <div className="minimal-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-primary">Your Deadlines</h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted">{filteredDeadlines.length} deadlines</span>
            <button className="minimal-button-small p-2">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {filteredDeadlines.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-muted text-lg font-medium mb-2">No deadlines found</p>
            <p className="text-muted">Try adjusting your search or filters</p>
            <button
              onClick={() => setShowForm(true)}
              className="minimal-button-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Deadline
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDeadlines.map((deadline) => {
              const statusColor = getStatusColor(deadline.status, deadline.isCompleted);
              const statusBadge = getStatusBadge(deadline.dueDate, deadline.isCompleted);
              const statusText = getStatusText(deadline.dueDate, deadline.isCompleted);
              const statusIcon = getStatusIcon(deadline.status, deadline.isCompleted);
              
              return (
                <div key={deadline.id} className="minimal-card-inset p-4 hover-lift transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="minimal-stat-inset p-2">
                        {statusIcon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className={`font-medium ${deadline.isCompleted ? 'line-through text-muted' : 'text-primary'}`}>
                            {deadline.title}
                          </h4>
                          <span className={`minimal-badge ${statusBadge}`}>
                            {statusText}
                          </span>
                          {deadline.isRecurring && (
                            <span className="minimal-badge minimal-badge-info flex items-center space-x-1">
                              <Repeat className="w-3 h-3" />
                              <span>Recurring</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted mb-2">
                          {deadline.category && (
                            <span className="flex items-center space-x-1">
                              {getCategoryIcon(deadline.category)}
                              <span>{deadline.category}</span>
                            </span>
                          )}
                          {deadline.amount && (
                            <span className="flex items-center space-x-1 font-medium currency-inr">
                              <DollarSign className="w-3 h-3" />
                              <span>{formatCurrency(deadline.amount)}</span>
                            </span>
                          )}
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(deadline.dueDate).toLocaleDateString('en-IN')}</span>
                          </span>
                        </div>
                        {deadline.description && (
                          <p className="text-sm text-muted mb-2">{deadline.description}</p>
                        )}
                        {(deadline.paymentMethod || deadline.accountDetails) && (
                          <div className="flex items-center space-x-4 text-xs text-muted">
                            {deadline.paymentMethod && (
                              <span>Payment: {deadline.paymentMethod}</span>
                            )}
                            {deadline.accountDetails && (
                              <span>Account: {deadline.accountDetails}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleComplete(deadline.id, deadline.isCompleted)}
                        className={`minimal-button-small p-2 transition-all ${
                          deadline.isCompleted 
                            ? 'text-success hover:bg-success hover:text-white' 
                            : 'text-primary hover:bg-primary hover:text-white'
                        }`}
                        title={deadline.isCompleted ? 'Mark as pending' : 'Mark as completed'}
                      >
                        {deadline.isCompleted ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(deadline.id)}
                        className="minimal-button-small p-2 text-error hover:bg-error hover:text-white transition-all"
                        title="Delete deadline"
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
