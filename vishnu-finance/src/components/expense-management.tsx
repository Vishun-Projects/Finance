'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Calendar, 
  Save, 
  Edit, 
  Trash2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  X,
  TrendingDown,
  Search,
  Filter,
  Download,
  Tag,
  Receipt,
  CreditCard,
  Wallet
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { DateRangeFilter } from './ui/date-range-filter';
import { Combobox } from './ui/combobox';
import FabButton from './ui/fab-button';
import MobileHeader from './ui/mobile-header';
import FilterSheet from './ui/filter-sheet';
import QuickRangeChips, { QuickRange } from './ui/quick-range-chips';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  notes?: string;
  store?: string;
  personName?: string;
  commodity?: string;
  upiId?: string;
  accountNumber?: string;
  // New Transaction model fields
  creditAmount?: number;
  debitAmount?: number;
  financialCategory?: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER';
}

export default function ExpenseManagement() {
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterCommodity, setFilterCommodity] = useState<string>('all');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    date: '',
    description: '',
    paymentMethod: '',
    notes: ''
  });
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [quickRange, setQuickRange] = useState<QuickRange>('month');
  const [amountPreset, setAmountPreset] = useState<'all'|'lt1k'|'1to10k'|'10to50k'|'50to100k'|'gt100k'>('all');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('quickRange_expenses');
      if (saved) {
        applyQuickRange(saved as QuickRange);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { localStorage.setItem('quickRange_expenses', quickRange); } catch {}
  }, [quickRange]);

  const applyQuickRange = (range: QuickRange) => {
    const today = new Date();
    let start: Date, end: Date;
    switch (range) {
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'lastMonth':
        const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start = new Date(prev.getFullYear(), prev.getMonth(), 1);
        end = new Date(prev.getFullYear(), prev.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'quarter':
        const q = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), q * 3, 1);
        end = new Date(today.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'all':
        start = new Date(2020, 0, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'custom':
        setQuickRange('custom');
        return;
    }
    setQuickRange(range);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    if (user && !authLoading) {
      fetchExpenses();
    }
  }, [user, authLoading, startDate, endDate]);

  const fetchExpenses = async () => {
    console.log('🔄 EXPENSE COMPONENT - Fetching expenses...');
    console.log('🔄 EXPENSE COMPONENT - User ID:', user?.id);
    
    if (!user?.id) {
      console.log('❌ EXPENSE COMPONENT - No user ID available');
      setIsFetching(false);
      return;
    }

    try {
      console.log('🔄 EXPENSE COMPONENT - Making API call to /api/expenses...');
      // Fetch with large pageSize to get all data for accurate totals (max 10000)
      const response = await fetch(`/api/expenses?userId=${user.id}&start=${startDate}&end=${endDate}&pageSize=10000&includeTotal=true`);
      console.log('🔄 EXPENSE COMPONENT - API Response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ EXPENSE COMPONENT - API Response data:', JSON.stringify(responseData, null, 2));
        
        // Handle paginated response structure { data: [...], pagination: {...} }
        // or legacy array format for backward compatibility
        const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
        
        // Store pagination metadata if available
        if (responseData.pagination) {
          setTotalCount(responseData.pagination.total || data.length);
        } else {
          setTotalCount(data.length);
        }
        
        // Transform the data to match the frontend interface
        const transformedData = data.map((expense: any) => ({
          id: expense.id,
          title: expense.description || '', // Map description to title
          amount: parseFloat(expense.amount),
          category: expense.categoryId || '',
          date: expense.date,
          description: expense.notes || '',
          paymentMethod: '',
          receiptUrl: '',
          notes: expense.notes || '',
          store: expense.store || '',
          personName: expense.personName || '',
          commodity: expense.notes || '', // commodity is stored in notes field
          upiId: expense.upiId || '',
          accountNumber: expense.accountNumber || ''
        }));
        setExpenses(transformedData);
      } else {
        const errorData = await response.json();
        console.log('❌ EXPENSE COMPONENT - API Error response:', JSON.stringify(errorData, null, 2));
        throw new Error('Failed to fetch expenses');
      }
    } catch (error) {
      console.error('❌ EXPENSE COMPONENT - Error fetching expenses:', error);
      setError('Failed to fetch expenses');
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
    console.log('📝 EXPENSE COMPONENT - Form submitted');
    console.log('📝 EXPENSE COMPONENT - Form data:', {
      title: formData.title,
      amount: formData.amount,
      category: formData.category,
      date: formData.date,
      description: formData.description,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
      userId: user?.id
    });

    if (!user?.id) {
      console.log('❌ EXPENSE COMPONENT - No user ID for form submission');
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEditMode && editingExpense) {
        // Edit existing expense
        console.log('✏️ EXPENSE COMPONENT - Making PUT request to /api/expenses...');
        const response = await fetch('/api/expenses', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingExpense.id,
            title: formData.title,
            amount: formData.amount,
            category: formData.category,
            date: formData.date,
            description: formData.description,
            paymentMethod: formData.paymentMethod,
            notes: formData.notes,
            userId: user.id
          }),
        });

        console.log('✏️ EXPENSE COMPONENT - PUT Response status:', response.status);
        
        if (response.ok) {
          const updatedExpense = await response.json();
          console.log('✅ EXPENSE COMPONENT - Successfully updated expense:', JSON.stringify(updatedExpense, null, 2));
          // Transform the updated expense data to match the frontend interface
          const transformedUpdatedExpense = {
            id: updatedExpense.id,
            title: updatedExpense.description || '',
            amount: parseFloat(updatedExpense.amount),
            category: updatedExpense.categoryId || '',
            date: updatedExpense.date,
            description: updatedExpense.notes || '',
            paymentMethod: '',
            receiptUrl: '',
            notes: updatedExpense.notes || ''
          };
          setExpenses(prev => prev.map(expense => 
            expense.id === editingExpense.id ? transformedUpdatedExpense : expense
          ));
          resetForm();
        } else {
          const errorData = await response.json();
          console.log('❌ EXPENSE COMPONENT - PUT Error response:', JSON.stringify(errorData, null, 2));
          throw new Error(errorData.error || 'Failed to update expense');
        }
      } else {
        // Create new expense
        console.log('📝 EXPENSE COMPONENT - Making POST request to /api/expenses...');
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: formData.title,
            amount: formData.amount,
            category: formData.category,
            date: formData.date,
            description: formData.description,
            paymentMethod: formData.paymentMethod,
            notes: formData.notes,
            userId: user.id
          }),
        });

        console.log('📝 EXPENSE COMPONENT - POST Response status:', response.status);
        
        if (response.ok) {
          const newExpense = await response.json();
          console.log('✅ EXPENSE COMPONENT - Successfully created expense:', JSON.stringify(newExpense, null, 2));
          // Transform the new expense data to match the frontend interface
          const transformedNewExpense = {
            id: newExpense.id,
            title: newExpense.description || '',
            amount: parseFloat(newExpense.amount),
            category: newExpense.categoryId || '',
            date: newExpense.date,
            description: newExpense.notes || '',
            paymentMethod: '',
            receiptUrl: '',
            notes: newExpense.notes || ''
          };
          setExpenses(prev => [transformedNewExpense, ...prev]);
          resetForm();
        } else {
          const errorData = await response.json();
          console.log('❌ EXPENSE COMPONENT - POST Error response:', JSON.stringify(errorData, null, 2));
          throw new Error(errorData.error || 'Failed to add expense');
        }
      }
    } catch (err) {
      console.error('❌ EXPENSE COMPONENT - Error submitting expense:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit expense. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      category: '',
      date: '',
      description: '',
      paymentMethod: '',
      notes: ''
    });
    setEditingExpense(null);
    setIsEditMode(false);
    setShowForm(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditMode(true);
    setFormData({
      title: expense.title,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      description: expense.description || '',
      paymentMethod: expense.paymentMethod || '',
      notes: expense.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setExpenses(prev => prev.filter(expense => expense.id !== id));
      } else {
        throw new Error('Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      setError('Failed to delete expense. Please try again.');
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = (expense.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;
    const matchesStore = filterStore === 'all' || 
                         (expense.store && expense.store.toLowerCase().includes(filterStore.toLowerCase())) ||
                         (expense.personName && expense.personName.toLowerCase().includes(filterStore.toLowerCase()));
    const matchesCommodity = filterCommodity === 'all' || 
                             (expense.commodity && expense.commodity.toLowerCase().includes(filterCommodity.toLowerCase()));
    // Optional amount range presets (applied via filter sheet)
    const amountNum = typeof expense.amount === 'number' ? expense.amount : parseFloat(String(expense.amount)) || 0;
    let inRange = true;
    switch (amountPreset) {
      case 'lt1k': inRange = amountNum < 1000; break;
      case '1to10k': inRange = amountNum >= 1000 && amountNum <= 10000; break;
      case '10to50k': inRange = amountNum > 10000 && amountNum <= 50000; break;
      case '50to100k': inRange = amountNum > 50000 && amountNum <= 100000; break;
      case 'gt100k': inRange = amountNum > 100000; break;
      default: inRange = true;
    }
    
    return matchesSearch && matchesCategory && matchesStore && matchesCommodity && inRange;
  });

  const storesPersons = Array.from(new Set(
    expenses
      .map(e => [e.store, e.personName])
      .flat()
      .filter(Boolean)
      .map(String)
  ));
  
  const commodities = Array.from(new Set(
    expenses
      .map(e => e.commodity)
      .filter(Boolean)
      .map(String)
  ));

  // Calculate totals from filtered expenses (respects date range and filters)

  // Calculate total expenses in the filtered date range
  const totalExpenses = filteredExpenses.reduce((sum, expense) => {
    const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(String(expense.amount)) || 0;
    if (amount > 0 && !isNaN(amount) && isFinite(amount)) {
      return sum + amount;
    }
    return sum;
  }, 0);

  // Calculate this month's expenses (only expenses from current month in the filtered data)
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const thisMonthExpenses = filteredExpenses.reduce((sum, expense) => {
    try {
      const dateStr = expense.date.toString().slice(0, 10); // Ensure YYYY-MM-DD format
      const expenseDate = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
      
      if (!isNaN(expenseDate.getTime()) && expenseDate >= currentMonthStart && expenseDate <= currentMonthEnd) {
        const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(String(expense.amount)) || 0;
        if (amount > 0 && !isNaN(amount) && isFinite(amount)) {
          return sum + amount;
        }
      }
    } catch {
      // Skip invalid dates
    }
    return sum;
  }, 0);

  const categories = Array.from(new Set(expenses.map(e => e.category)));

  if (isFetching) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="flex space-x-3">
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="minimal-card p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 animate-pulse">
          <div className="h-10 bg-gray-200 rounded flex-1"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>

        {/* Expenses List Skeleton */}
        <div className="minimal-card p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in mobile-body pb-bottom-bar">
      {/* Sticky Mobile Header */}
      <MobileHeader
        title="Expenses"
        subtitle="Manage and track expenses"
        right={(
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="minimal-button-secondary btn-touch px-3 py-2"
              aria-label="Open Filters"
            >
              Filters
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="minimal-button-primary btn-touch px-3 py-2"
              aria-label="Add Expense"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      />
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-primary">Expense Management</h2>
          <p className="text-muted">Track and manage your expenses and bank debits</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-3">
          <button
            onClick={fetchExpenses}
            className="minimal-button-secondary flex items-center space-x-2 btn-touch w-full sm:w-auto"
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        <button
          onClick={() => setShowForm(true)}
            className="minimal-button-primary flex items-center space-x-2 btn-touch w-full sm:w-auto"
        >
            <Plus className="w-4 h-4" />
          <span>Add Expense</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="minimal-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Debits</p>
              <p className="text-xs text-muted mb-1">(Bank debits + expenses)</p>
              <p className="text-2xl font-bold text-error currency-inr">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="minimal-stat-inset">
              <TrendingDown className="w-6 h-6 text-error" />
            </div>
          </div>
        </div>

        <div className="minimal-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">This Month</p>
              <p className="text-2xl font-bold text-warning currency-inr">{formatCurrency(thisMonthExpenses)}</p>
            </div>
            <div className="minimal-stat-inset">
              <Calendar className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>

        <div className="minimal-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Transactions</p>
              <p className="text-2xl font-bold text-primary">{totalCount || expenses.length}</p>
            </div>
            <div className="minimal-stat-inset">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <QuickRangeChips value={quickRange} onChange={applyQuickRange} className="md:flex xl:hidden" />
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
          showPresets={false}
        />
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 minimal-input"
            />
          </div>
          <Combobox
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.map(category => ({ value: category, label: category }))
            ]}
            value={filterCategory}
            onValueChange={(value) => setFilterCategory(value || 'all')}
            placeholder="All Categories"
            searchPlaceholder="Search categories..."
            className="min-w-[200px]"
          />
          <Combobox
            options={[
              { value: 'all', label: 'All Stores/People' },
              ...storesPersons.map(store => ({ value: store, label: store }))
            ]}
            value={filterStore}
            onValueChange={(value) => setFilterStore(value || 'all')}
            placeholder="All Stores/People"
            searchPlaceholder="Search stores/people..."
            className="min-w-[200px]"
          />
          <Combobox
            options={[
              { value: 'all', label: 'All Commodities' },
              ...commodities.map(commodity => ({ value: commodity, label: commodity }))
            ]}
            value={filterCommodity}
            onValueChange={(value) => setFilterCommodity(value || 'all')}
            placeholder="All Commodities"
            searchPlaceholder="Search commodities..."
            className="min-w-[200px]"
          />
        <button className="minimal-button-small p-2" onClick={() => setIsFilterOpen(true)} aria-label="Open Filters">
          <Filter className="w-4 h-4" />
        </button>
        </div>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="minimal-card p-8 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-primary">{isEditMode ? 'Edit Expense' : 'Add New Expense'}</h3>
            <button
              onClick={resetForm}
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
                  Expense Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="minimal-input"
                  placeholder="e.g., Grocery Shopping, Fuel"
                />
              </div>

              {/* Category Field */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-primary mb-3">
                  Category
                </label>
                <Combobox
                  options={[
                    { value: 'Food & Dining', label: 'Food & Dining' },
                    { value: 'Transportation', label: 'Transportation' },
                    { value: 'Housing', label: 'Housing' },
                    { value: 'Entertainment', label: 'Entertainment' },
                    { value: 'Shopping', label: 'Shopping' },
                    { value: 'Healthcare', label: 'Healthcare' },
                    { value: 'Utilities', label: 'Utilities' },
                    { value: 'Education', label: 'Education' },
                    { value: 'Other', label: 'Other' }
                  ]}
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value || '' })}
                  placeholder="Select a category"
                  searchPlaceholder="Search categories..."
                />
              </div>

              {/* Amount Field */}
              <div>
                <label htmlFor="amount" className="block text-sm font-semibold text-primary mb-3">
                  Amount (₹)
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
                    required
                    value={formData.amount}
                    onChange={handleChange}
                    className="minimal-input pl-12"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Date Field */}
              <div>
                <label htmlFor="date" className="block text-sm font-semibold text-primary mb-3">
                  Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Calendar className="w-5 h-5 text-muted" />
                  </div>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={handleChange}
                    className="minimal-input pl-12"
                  />
              </div>
            </div>

              {/* Payment Method Field */}
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-semibold text-primary mb-3">
                  Payment Method
                </label>
                <Combobox
                  options={[
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Credit Card', label: 'Credit Card' },
                    { value: 'Debit Card', label: 'Debit Card' },
                    { value: 'UPI', label: 'UPI' },
                    { value: 'Online Banking', label: 'Online Banking' },
                    { value: 'Cheque', label: 'Cheque' },
                    { value: 'Auto Debit', label: 'Auto Debit' },
                    { value: 'Other', label: 'Other' }
                  ]}
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value || '' })}
                  placeholder="Select payment method"
                  searchPlaceholder="Search payment methods..."
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
                  {isEditMode ? 'Updating Expense...' : 'Adding Expense...'}
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Update Expense' : 'Add Expense'}
                </div>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Expenses List */}
      <div className="minimal-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-primary">Your Expenses</h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted">{filteredExpenses.length} expenses</span>
            <button className="minimal-button-small p-2">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {expenses.length === 0 && !authLoading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <DollarSign className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
            <p className="text-gray-600 mb-6">Start tracking your expenses by adding your first expense record.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Expense
            </button>
          </div>
        )}
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <TrendingDown className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-muted text-lg font-medium mb-2">No expenses found</p>
            <p className="text-muted">Try adjusting your search or filters</p>
            <button
              onClick={() => setShowForm(true)}
              className="minimal-button-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Expense
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="minimal-card-inset p-4 hover-lift transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                  <div className="minimal-stat-inset p-2">
                       <Tag className="w-5 h-5 text-primary" />
                     </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-primary">{expense.title}</h4>
                        <span className="minimal-badge minimal-badge-info">{expense.category}</span>
                        {expense.financialCategory && (
                          <span className="minimal-badge bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {expense.financialCategory}
                          </span>
                        )}
                  </div>
                      <div className="flex items-center space-x-4 text-sm text-muted mb-2">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(expense.date).toLocaleDateString('en-IN')}</span>
                        </span>
                        {expense.paymentMethod && (
                          <span className="flex items-center space-x-1">
                            <CreditCard className="w-3 h-3" />
                            <span>{expense.paymentMethod}</span>
                          </span>
                        )}
                        </div>
                      {expense.description && (
                        <p className="text-sm text-muted mb-2">{expense.description}</p>
                      )}
                      {expense.notes && (
                        <p className="text-xs text-muted">Note: {expense.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                <div className="text-right">
                  {expense.debitAmount !== undefined && expense.debitAmount > 0 ? (
                    <div>
                      <p className="font-semibold text-error currency-inr">{formatCurrency(expense.debitAmount)}</p>
                      <p className="text-xs text-muted">Debit</p>
                    </div>
                  ) : (
                    <p className="font-semibold text-error currency-inr">{formatCurrency(expense.amount)}</p>
                  )}
                </div>
                  <button
                    onClick={() => handleEdit(expense)}
                    className="minimal-button-small p-2 text-primary hover:bg-primary hover:text-white transition-all"
                    title="Edit expense"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="minimal-button-small p-2 text-error hover:bg-error hover:text-white transition-all"
                      title="Delete expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile FAB for quick add */}
      <FabButton
        label="Add Expense"
        icon={<Plus className="w-5 h-5" />}
        onClick={() => setShowForm(true)}
      />

      {/* Filter Sheet (Mobile) */}
      <FilterSheet open={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filters">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <div className="flex flex-wrap gap-2">
              {[
                {k:'all',l:'All'},
                {k:'lt1k',l:'<1k'},
                {k:'1to10k',l:'1–10k'},
                {k:'10to50k',l:'10–50k'},
                {k:'50to100k',l:'50–100k'},
                {k:'gt100k',l:'>100k'},
              ].map(({k,l}) => (
                <button key={k}
                  className={`px-3 py-1.5 rounded-full text-sm border ${amountPreset===k? 'bg-primary text-primary-foreground border-primary':'border-input'}`}
                  onClick={() => setAmountPreset(k as any)}
                >{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="minimal-select w-full"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Store/Person</label>
            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="minimal-select w-full"
            >
              <option value="all">All</option>
              {storesPersons.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Commodity</label>
            <select
              value={filterCommodity}
              onChange={(e) => setFilterCommodity(e.target.value)}
              className="minimal-select w-full"
            >
              <option value="all">All</option>
              {commodities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="minimal-button-secondary px-4 py-2" onClick={() => setIsFilterOpen(false)}>Close</button>
            <button className="minimal-button-primary px-4 py-2" onClick={() => setIsFilterOpen(false)}>Apply</button>
          </div>
        </div>
      </FilterSheet>

      {/* Bottom action bar (mobile) */}
      <div className="md:hidden bottom-action-bar">
        <div className="px-3 py-2 bottom-action-grid">
          <button
            className="bottom-action-btn bg-secondary text-secondary-foreground"
            onClick={fetchExpenses}
            disabled={isFetching}
            aria-label="Refresh"
          >
            Refresh
          </button>
          <button
            className="bottom-action-btn bg-accent text-accent-foreground"
            onClick={() => setShowForm(true)}
            aria-label="Add Expense"
          >
            Add
          </button>
          <button
            className="bottom-action-btn border border-input"
            onClick={() => setIsFilterOpen(true)}
            aria-label="Filters"
          >
            Filters
          </button>
        </div>
      </div>
    </div>
  );
}
