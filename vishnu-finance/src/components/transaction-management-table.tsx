'use client';

import { useState, useEffect } from 'react';
import { Trash2, Filter, X, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui/button';
import DeleteConfirmationDialog from './delete-confirmation-dialog';

interface Transaction {
  id: string;
  type?: 'expense' | 'income' | 'credit' | 'debit'; // Legacy support
  date?: string;
  transactionDate?: string | Date;
  description: string;
  amount?: number; // Legacy field
  creditAmount?: number;
  debitAmount?: number;
  financialCategory?: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER';
  category?: string;
  bankCode?: string;
  store?: string;
  rawData?: string;
  isDeleted: boolean;
  deletedAt?: string;
}

export default function TransactionManagementTable() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [restoringIds, setRestoringIds] = useState<string[]>([]);
  const [showDeleted, setShowDeleted] = useState(true);
  const [pageSize, setPageSize] = useState<string>('200'); // '100'|'200'|'500'|'1000'|'all'
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    bankCode: '',
    transactionType: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, filters, pageSize]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        includeDeleted: 'true',
        limit: pageSize,
      });

      if (filters.bankCode) params.append('bankCode', filters.bankCode);
      if (filters.transactionType) params.append('type', filters.transactionType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/transactions/manage?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      setSelectedIds(new Set()); // Clear selection when data changes
    } catch (err) {
      console.error('Error fetching transactions:', err);
      error('Error', 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      error('Error', 'Please select transactions to delete');
      return;
    }
    setDeletingIds(Array.from(selectedIds));
    setShowConfirmDialog(true);
  };

  const handleDeleteFiltered = () => {
    setDeletingIds([]);
    setShowConfirmDialog(true);
  };

  const handleRestoreSelected = () => {
    const deletedSelected = Array.from(selectedIds).filter(id => {
      const transaction = transactions.find(t => t.id === id);
      return transaction?.isDeleted;
    });
    
    if (deletedSelected.length === 0) {
      error('Error', 'Please select deleted transactions to restore');
      return;
    }
    setRestoringIds(deletedSelected);
    setShowRestoreDialog(true);
  };

  const handleRestoreFiltered = () => {
    setRestoringIds([]);
    setShowRestoreDialog(true);
  };

  const confirmRestore = async () => {
    try {
      setRestoring(true);
      
      const body: any = {};
      
      if (restoringIds.length > 0) {
        body.transactionIds = restoringIds;
      } else {
        body.filters = {};
        if (filters.bankCode) body.filters.bankCode = filters.bankCode;
        if (filters.transactionType) body.filters.transactionType = filters.transactionType;
      }

      const response = await fetch('/api/transactions/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to restore transactions');
      }

      const data = await response.json();
      success('Success', `Successfully restored ${data.restoredCount} transaction(s)`);
      setShowRestoreDialog(false);
      setSelectedIds(new Set());
      fetchTransactions();
    } catch (err) {
      console.error('Error restoring transactions:', err);
      error('Error', 'Failed to restore transactions');
    } finally {
      setRestoring(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      
      const body: any = {};
      
      if (deletingIds.length > 0) {
        body.transactionIds = deletingIds;
      } else {
        body.filters = {};
        if (filters.bankCode) body.filters.bankCode = filters.bankCode;
        if (filters.transactionType) body.filters.transactionType = filters.transactionType;
      }

      const response = await fetch('/api/transactions/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to delete transactions');
      }

      const data = await response.json();
      success('Success', `Successfully deleted ${data.deletedCount} transaction(s)`);
      setShowConfirmDialog(false);
      setSelectedIds(new Set());
      fetchTransactions();
    } catch (err) {
      console.error('Error deleting transactions:', err);
      error('Error', 'Failed to delete transactions');
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      bankCode: '',
      transactionType: '',
      startDate: '',
      endDate: '',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (input: string | Date) => {
    const d = typeof input === 'string' ? new Date(input) : input;
    return d.toLocaleDateString('en-IN');
  };

  const getStatusBadge = (isDeleted: boolean) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
        isDeleted 
          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      }`}>
        {isDeleted ? 'Deleted' : 'Active'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredCount = transactions.filter(t => !t.isDeleted).length;
  const deletedCount = transactions.filter(t => t.isDeleted).length;
  const selectedDeletedCount = Array.from(selectedIds).filter(id => {
    const transaction = transactions.find(t => t.id === id);
    return transaction?.isDeleted;
  }).length;

  // Filter transactions based on showDeleted toggle
  const displayedTransactions = showDeleted 
    ? transactions 
    : transactions.filter(t => !t.isDeleted);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {displayedTransactions.length} transactions ({filteredCount} active, {deletedCount} deleted)
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleted(!showDeleted)}
          >
            {showDeleted ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide Deleted
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Show Deleted
              </>
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <label className="text-sm text-muted-foreground">Page size</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="border rounded-md px-2 py-1 text-sm"
              title="Number of transactions to load"
           >
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
              <option value="all">All</option>
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0 || deleting || restoring}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected ({selectedIds.size})
          </Button>

          {selectedDeletedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestoreSelected}
              disabled={restoring || deleting}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore Selected ({selectedDeletedCount})
            </Button>
          )}

          {deletedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestoreFiltered}
              disabled={restoring || deleting}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore All Filtered Deleted
            </Button>
          )}

          {transactions.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteFiltered}
              disabled={deleting || restoring}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All Filtered
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bank</label>
              <select
                value={filters.bankCode}
                onChange={(e) => setFilters({ ...filters, bankCode: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">All Banks</option>
                <option value="HDFC">HDFC</option>
                <option value="SBIN">SBI</option>
                <option value="IDIB">Indian Bank</option>
                <option value="KKBK">Kotak</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={filters.transactionType}
                onChange={(e) => setFilters({ ...filters, transactionType: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">All Types</option>
                <option value="expense">Debits</option>
                <option value="income">Credits</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table (md and up) */}
      <div className="border rounded-lg overflow-hidden hidden md:block">
        <div className="table-responsive">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === displayedTransactions.length && displayedTransactions.length > 0 && displayedTransactions.every(t => selectedIds.has(t.id))}
                    onChange={() => {
                      if (selectedIds.size === displayedTransactions.length && displayedTransactions.every(t => selectedIds.has(t.id))) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(displayedTransactions.map(t => t.id)));
                      }
                    }}
                    className="w-4 h-4"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Credit</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Debit</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Bank</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No transactions found
                  </td>
                </tr>
              ) : (
                displayedTransactions.map((transaction) => {
                  const date = transaction.transactionDate || transaction.date;
                  const isCredit = (transaction.creditAmount ?? 0) > 0;
                  const isDebit = (transaction.debitAmount ?? 0) > 0;
                  const creditAmount = transaction.creditAmount ?? 0;
                  const debitAmount = transaction.debitAmount ?? 0;
                  const amount = transaction.amount ?? (isCredit ? creditAmount : debitAmount);
                  const transactionType = transaction.type || (isCredit ? 'credit' : 'debit');
                  
                  return (
                    <tr
                      key={transaction.id}
                      className={`border-t hover:bg-muted/50 ${
                        transaction.isDeleted ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(transaction.id)}
                          onChange={() => handleSelectOne(transaction.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">{date ? formatDate(date as any) : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          isCredit
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {isCredit ? 'CREDIT' : 'DEBIT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-md truncate" title={transaction.description}>
                        {transaction.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">
                        {creditAmount > 0 ? formatCurrency(creditAmount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
                        {debitAmount > 0 ? formatCurrency(debitAmount) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {transaction.financialCategory || 'EXPENSE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{transaction.bankCode || '-'}</td>
                      <td className="px-4 py-3">{getStatusBadge(transaction.isDeleted)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List (below md) */}
      <div className="md:hidden">
        {displayedTransactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground">No transactions found</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800 border rounded-lg overflow-hidden">
            {displayedTransactions.map((t) => {
              const date = t.transactionDate || t.date;
              const isCredit = (t.creditAmount ?? 0) > 0;
              const isDebit = (t.debitAmount ?? 0) > 0;
              const creditAmount = t.creditAmount ?? 0;
              const debitAmount = t.debitAmount ?? 0;
              return (
                <div key={t.id} className={`p-4 ${t.isDeleted ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">{date ? formatDate(date as any) : '-'}</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1" title={t.description}>{t.description}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isCredit ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                          {isCredit ? 'CREDIT' : 'DEBIT'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {t.financialCategory || 'EXPENSE'}
                        </span>
                        {t.bankCode && (
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{t.bankCode}</span>
                        )}
                        {t.isDeleted && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">Deleted</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {isCredit && (
                        <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(creditAmount)}</div>
                      )}
                      {isDebit && (
                        <div className="text-sm font-semibold text-red-600 dark:text-red-400">{formatCurrency(debitAmount)}</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="btn-touch"
                      onClick={() => {
                        setDeletingIds([t.id]);
                        setShowConfirmDialog(true);
                      }}
                    >
                      Delete
                    </Button>
                    {t.isDeleted && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="btn-touch"
                        onClick={() => {
                          setRestoringIds([t.id]);
                          setShowRestoreDialog(true);
                        }}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmDelete}
        deleting={deleting}
        count={deletingIds.length > 0 ? deletingIds.length : transactions.length}
        filters={deletingIds.length === 0 ? filters : undefined}
      />

      {/* Restore Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showRestoreDialog}
        onClose={() => setShowRestoreDialog(false)}
        onConfirm={confirmRestore}
        deleting={restoring}
        count={restoringIds.length > 0 ? restoringIds.length : deletedCount}
        filters={restoringIds.length === 0 ? filters : undefined}
        actionType={'restore' as const}
      />
    </div>
  );
}

