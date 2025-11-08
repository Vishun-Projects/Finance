'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Store, User } from 'lucide-react';
import { Transaction, TransactionCategory } from '@/types';
import { Combobox, ComboboxOption } from './ui/combobox';
import { Button } from './ui/button';
import { detectEntityType, suggestCategory } from '@/lib/entity-detection';

interface TransactionFormModalProps {
  open: boolean;
  transaction?: Transaction | null;
  onClose: () => void;
  onSave: (data: TransactionFormData) => Promise<void>;
  categories?: { id: string; name: string; type: 'INCOME' | 'EXPENSE'; color?: string }[];
  defaultType?: TransactionCategory;
  initialData?: Partial<TransactionFormData>; // For presets
}

export interface TransactionFormData {
  description: string;
  transactionDate: string;
  creditAmount: number;
  debitAmount: number;
  financialCategory: TransactionCategory;
  categoryId?: string;
  notes?: string;
  store?: string;
  personName?: string;
  upiId?: string;
  receiptUrl?: string;
}

export default function TransactionFormModal({
  open,
  transaction,
  onClose,
  onSave,
  categories = [],
  defaultType = 'EXPENSE',
  initialData,
}: TransactionFormModalProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
    creditAmount: 0,
    debitAmount: 0,
    financialCategory: defaultType,
    categoryId: '',
    notes: '',
    store: '',
    personName: '',
    upiId: '',
    receiptUrl: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [entityType, setEntityType] = useState<'STORE' | 'PERSON'>('STORE');

  // Initialize form data
  useEffect(() => {
    if (transaction && open) {
      setFormData({
        description: transaction.description || '',
        transactionDate: new Date(transaction.transactionDate).toISOString().split('T')[0],
        creditAmount: transaction.creditAmount || 0,
        debitAmount: transaction.debitAmount || 0,
        financialCategory: transaction.financialCategory || defaultType,
        categoryId: transaction.categoryId || '',
        notes: transaction.notes || '',
        store: transaction.store || '',
        personName: transaction.personName || '',
        upiId: transaction.upiId || '',
        receiptUrl: transaction.receiptUrl || '',
      });
      setEntityType(transaction.store ? 'STORE' : 'PERSON');
    } else if (open && !transaction) {
      // Reset to defaults or use initialData from preset
      setFormData({
        description: initialData?.description || '',
        transactionDate: initialData?.transactionDate || new Date().toISOString().split('T')[0],
        creditAmount: initialData?.creditAmount || 0,
        debitAmount: initialData?.debitAmount || 0,
        financialCategory: initialData?.financialCategory || defaultType,
        categoryId: initialData?.categoryId || '',
        notes: initialData?.notes || '',
        store: initialData?.store || '',
        personName: initialData?.personName || '',
        upiId: initialData?.upiId || '',
        receiptUrl: initialData?.receiptUrl || '',
      });
      setEntityType(initialData?.store ? 'STORE' : 'PERSON');
    }
  }, [transaction, open, defaultType, initialData]);

  // Auto-detect entity type and suggest category
  useEffect(() => {
    if (formData.description || formData.upiId || formData.store || formData.personName) {
      const detectedType = detectEntityType({
        name: formData.description,
        upiId: formData.upiId,
        store: formData.store,
        personName: formData.personName,
        amount: formData.creditAmount || formData.debitAmount,
        description: formData.description,
      });

      setEntityType(detectedType);

      // Suggest category
      const suggested = suggestCategory(formData.financialCategory, {
        description: formData.description,
        store: formData.store,
        upiId: formData.upiId,
        amount: formData.creditAmount || formData.debitAmount,
      });

      if (suggested && !formData.categoryId) {
        const matchingCategory = categories.find(
          c => c.name === suggested && c.type === (formData.financialCategory === 'INCOME' ? 'INCOME' : 'EXPENSE')
        );
        if (matchingCategory) {
          setFormData(prev => ({ ...prev, categoryId: matchingCategory.id }));
        }
      }
    }
  }, [formData.description, formData.upiId, formData.store, formData.personName, formData.financialCategory, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || (!formData.creditAmount && !formData.debitAmount)) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinancialCategoryChange = (category: TransactionCategory) => {
    setFormData(prev => {
      // Clear category if it doesn't match new type
      const currentCategory = categories.find(c => c.id === prev.categoryId);
      if (currentCategory && currentCategory.type !== (category === 'INCOME' ? 'INCOME' : 'EXPENSE')) {
        return { ...prev, financialCategory: category, categoryId: '' };
      }
      return { ...prev, financialCategory: category };
    });
  };

  // Filter categories by type
  const filteredCategories = categories.filter(
    c => c.type === (formData.financialCategory === 'INCOME' ? 'INCOME' : 'EXPENSE')
  );

  const categoryOptions: ComboboxOption[] = filteredCategories.map(c => ({
    value: c.id,
    label: c.name,
  }));

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Financial Category Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Type *</label>
            <div className="grid grid-cols-5 gap-2">
              {(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'OTHER'] as TransactionCategory[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleFinancialCategoryChange(type)}
                  className={`
                    px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${formData.financialCategory === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter transaction description"
            />
          </div>

          {/* Amount */}
          <div className="grid grid-cols-2 gap-4">
            {formData.financialCategory === 'INCOME' || formData.financialCategory === 'TRANSFER' ? (
              <div>
                <label className="block text-sm font-medium mb-1">Credit Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.creditAmount || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    creditAmount: parseFloat(e.target.value) || 0,
                    debitAmount: 0 
                  }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Debit Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.debitAmount || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    debitAmount: parseFloat(e.target.value) || 0,
                    creditAmount: 0 
                  }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.transactionDate}
                onChange={(e) => setFormData(prev => ({ ...prev, transactionDate: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Category */}
          {categoryOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Combobox
                options={categoryOptions}
                value={formData.categoryId || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value || '' }))}
                placeholder="Select category"
                allowClear
              />
            </div>
          )}

          {/* Entity Type Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">Entity Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEntityType('STORE');
                  setFormData(prev => ({ ...prev, personName: '' }));
                }}
                className={`
                  flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2
                  ${entityType === 'STORE'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }
                `}
              >
                <Store className="w-4 h-4" />
                Store
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntityType('PERSON');
                  setFormData(prev => ({ ...prev, store: '' }));
                }}
                className={`
                  flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2
                  ${entityType === 'PERSON'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }
                `}
              >
                <User className="w-4 h-4" />
                Person
              </button>
            </div>
          </div>

          {/* Store/Person Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {entityType === 'STORE' ? 'Store Name' : 'Person Name'}
            </label>
            <input
              type="text"
              value={entityType === 'STORE' ? formData.store : formData.personName}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                [entityType === 'STORE' ? 'store' : 'personName']: e.target.value,
              }))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={entityType === 'STORE' ? 'Enter store name' : 'Enter person name'}
            />
          </div>

          {/* UPI ID */}
          <div>
            <label className="block text-sm font-medium mb-1">UPI ID</label>
            <input
              type="text"
              value={formData.upiId}
              onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter UPI ID (optional)"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Additional notes (optional)"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : transaction ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
