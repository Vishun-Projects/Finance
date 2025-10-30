'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Calendar,
  DollarSign,
  Tag,
  SortAsc,
  SortDesc,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { PsychologyUI } from '../lib/psychology-ui';

export interface FilterOption {
  id: string;
  label: string;
  value: any;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  options?: Array<{ label: string; value: any }>;
}

export interface SortOption {
  id: string;
  label: string;
  field: string;
  direction: 'asc' | 'desc';
}

export interface EnhancedFiltersProps {
  filters: FilterOption[];
  sortOptions: SortOption[];
  onFiltersChange: (filters: Record<string, any>) => void;
  onSortChange: (sort: SortOption) => void;
  onSearch: (query: string) => void;
  onExport?: () => void;
  onRefresh?: () => void;
  showViewToggle?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  className?: string;
}

export default function EnhancedFilters({
  filters,
  sortOptions,
  onFiltersChange,
  onSortChange,
  onSearch,
  onExport,
  onRefresh,
  showViewToggle = false,
  viewMode = 'grid',
  onViewModeChange,
  className = ''
}: EnhancedFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [activeSort, setActiveSort] = useState<SortOption>(sortOptions[0]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCount, setFilterCount] = useState(0);

  // Update filter count when filters change
  useEffect(() => {
    const count = Object.values(activeFilters).filter(value => 
      value !== '' && value !== null && value !== undefined && value !== 'all'
    ).length;
    setFilterCount(count);
  }, [activeFilters]);

  const handleFilterChange = (filterId: string, value: any) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSortChange = (sort: SortOption) => {
    setActiveSort(sort);
    onSortChange(sort);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const clearAllFilters = () => {
    const clearedFilters: Record<string, any> = {};
    filters.forEach(filter => {
      clearedFilters[filter.id] = filter.type === 'boolean' ? false : '';
    });
    setActiveFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const renderFilterInput = (filter: FilterOption) => {
    const value = activeFilters[filter.id] || '';

    switch (filter.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={`Search ${filter.label.toLowerCase()}...`}
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All {filter.label}</option>
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            placeholder={`Enter ${filter.label.toLowerCase()}...`}
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleFilterChange(filter.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{filter.label}</span>
          </label>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search and Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={activeSort.id}
            onChange={(e) => {
              const sort = sortOptions.find(s => s.id === e.target.value);
              if (sort) handleSortChange(sort);
            }}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {sortOptions.map((sort) => (
              <option key={sort.id} value={sort.id}>
                {sort.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
            showAdvancedFilters || filterCount > 0
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {filterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {showViewToggle && onViewModeChange && (
            <button
              onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
            >
              {viewMode === 'grid' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
            {filterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <div key={filter.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {filter.label}
                </label>
                {renderFilterInput(filter)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {filterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([filterId, value]) => {
            if (!value || value === '' || value === 'all') return null;
            
            const filter = filters.find(f => f.id === filterId);
            if (!filter) return null;

            let displayValue = value;
            if (filter.type === 'select' && filter.options) {
              const option = filter.options.find(o => o.value === value);
              displayValue = option?.label || value;
            }
            if (filter.type === 'boolean') {
              displayValue = value ? 'Yes' : 'No';
            }

            return (
              <span
                key={filterId}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                <span>{filter.label}: {displayValue}</span>
                <button
                  onClick={() => handleFilterChange(filterId, filter.type === 'boolean' ? false : '')}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Predefined filter configurations for common use cases
export const ExpenseFilters: FilterOption[] = [
  {
    id: 'category',
    label: 'Category',
    value: '',
    type: 'select',
    options: [
      { label: 'Food & Dining', value: 'food' },
      { label: 'Transportation', value: 'transport' },
      { label: 'Entertainment', value: 'entertainment' },
      { label: 'Utilities', value: 'utilities' },
      { label: 'Shopping', value: 'shopping' },
      { label: 'Healthcare', value: 'healthcare' },
      { label: 'Education', value: 'education' },
      { label: 'Travel', value: 'travel' },
      { label: 'Other', value: 'other' }
    ]
  },
  {
    id: 'amount',
    label: 'Amount Range',
    value: '',
    type: 'number'
  },
  {
    id: 'dateFrom',
    label: 'From Date',
    value: '',
    type: 'date'
  },
  {
    id: 'dateTo',
    label: 'To Date',
    value: '',
    type: 'date'
  },
  {
    id: 'paymentMethod',
    label: 'Payment Method',
    value: '',
    type: 'select',
    options: [
      { label: 'Cash', value: 'cash' },
      { label: 'Credit Card', value: 'credit' },
      { label: 'Debit Card', value: 'debit' },
      { label: 'UPI', value: 'upi' },
      { label: 'Net Banking', value: 'netbanking' },
      { label: 'Other', value: 'other' }
    ]
  },
  {
    id: 'recurring',
    label: 'Recurring',
    value: false,
    type: 'boolean'
  }
];

export const IncomeFilters: FilterOption[] = [
  {
    id: 'category',
    label: 'Category',
    value: '',
    type: 'select',
    options: [
      { label: 'Salary', value: 'salary' },
      { label: 'Freelance', value: 'freelance' },
      { label: 'Investment', value: 'investment' },
      { label: 'Business', value: 'business' },
      { label: 'Rental', value: 'rental' },
      { label: 'Other', value: 'other' }
    ]
  },
  {
    id: 'amount',
    label: 'Amount Range',
    value: '',
    type: 'number'
  },
  {
    id: 'dateFrom',
    label: 'From Date',
    value: '',
    type: 'date'
  },
  {
    id: 'dateTo',
    label: 'To Date',
    value: '',
    type: 'date'
  },
  {
    id: 'frequency',
    label: 'Frequency',
    value: '',
    type: 'select',
    options: [
      { label: 'One-time', value: 'one_time' },
      { label: 'Daily', value: 'daily' },
      { label: 'Weekly', value: 'weekly' },
      { label: 'Monthly', value: 'monthly' },
      { label: 'Yearly', value: 'yearly' }
    ]
  }
];

export const GoalFilters: FilterOption[] = [
  {
    id: 'priority',
    label: 'Priority',
    value: '',
    type: 'select',
    options: [
      { label: 'High', value: 'high' },
      { label: 'Medium', value: 'medium' },
      { label: 'Low', value: 'low' }
    ]
  },
  {
    id: 'status',
    label: 'Status',
    value: '',
    type: 'select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Completed', value: 'completed' },
      { label: 'Paused', value: 'paused' }
    ]
  },
  {
    id: 'targetAmount',
    label: 'Target Amount',
    value: '',
    type: 'number'
  },
  {
    id: 'deadline',
    label: 'Deadline',
    value: '',
    type: 'date'
  }
];

// Common sort options
export const CommonSortOptions: SortOption[] = [
  { id: 'date_desc', label: 'Date (Newest First)', field: 'date', direction: 'desc' },
  { id: 'date_asc', label: 'Date (Oldest First)', field: 'date', direction: 'asc' },
  { id: 'amount_desc', label: 'Amount (Highest First)', field: 'amount', direction: 'desc' },
  { id: 'amount_asc', label: 'Amount (Lowest First)', field: 'amount', direction: 'asc' },
  { id: 'category_asc', label: 'Category (A-Z)', field: 'category', direction: 'asc' },
  { id: 'category_desc', label: 'Category (Z-A)', field: 'category', direction: 'desc' }
];
