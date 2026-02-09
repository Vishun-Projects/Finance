'use client';

import React, { useState, useEffect } from 'react';
import { Save, Store, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  }, [
    formData.description,
    formData.upiId,
    formData.store,
    formData.personName,
    formData.financialCategory,
    formData.creditAmount,
    formData.debitAmount,
    formData.categoryId,
    categories,
  ]);

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6" onClick={onClose}>
      <div
        className="bg-background rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-background/50 backdrop-blur-xl shrink-0">
          <h3 className="text-lg font-bold font-display tracking-tight">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          <form id="transaction-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Financial Category Type */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">Type</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'OTHER'] as TransactionCategory[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleFinancialCategoryChange(type)}
                    className={cn(
                      "px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                      formData.financialCategory === type
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Description *</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                placeholder="What is this transaction for?"
              />
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                  {formData.financialCategory === 'INCOME' || formData.financialCategory === 'TRANSFER' ? 'Credit Amount *' : 'Debit Amount *'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.financialCategory === 'INCOME' || formData.financialCategory === 'TRANSFER' ? (formData.creditAmount || '') : (formData.debitAmount || '')}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (formData.financialCategory === 'INCOME' || formData.financialCategory === 'TRANSFER') {
                        setFormData(prev => ({ ...prev, creditAmount: val, debitAmount: 0 }));
                      } else {
                        setFormData(prev => ({ ...prev, debitAmount: val, creditAmount: 0 }));
                      }
                    }}
                    className="w-full pl-8 pr-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.transactionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, transactionDate: e.target.value }))}
                  className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                />
              </div>
            </div>

            {/* Category */}
            {categoryOptions.length > 0 && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Category</label>
                <Combobox
                  options={categoryOptions}
                  value={formData.categoryId || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value || '' }))}
                  placeholder="Select category"
                  allowClear
                  className="w-full"
                />
              </div>
            )}

            {/* Entity Type Toggle */}
            <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Entity Details</label>

              <div className="flex bg-muted p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setEntityType('STORE');
                    setFormData(prev => ({ ...prev, personName: '' }));
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2",
                    entityType === 'STORE'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Store className="w-3.5 h-3.5" />
                  Store / Merchant
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntityType('PERSON');
                    setFormData(prev => ({ ...prev, store: '' }));
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2",
                    entityType === 'PERSON'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  Person / Peer
                </button>
              </div>

              {/* Store/Person Name */}
              <input
                type="text"
                value={entityType === 'STORE' ? formData.store : formData.personName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  [entityType === 'STORE' ? 'store' : 'personName']: e.target.value,
                }))}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                placeholder={entityType === 'STORE' ? 'Enter store/merchant name' : 'Enter person/peer name'}
              />
            </div>

            {/* UPI ID */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">UPI ID (Optional)</label>
              <input
                type="text"
                value={formData.upiId}
                onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
                className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm font-mono text-xs"
                placeholder="user@upi"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm resize-none"
                placeholder="Add any additional details..."
              />
            </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 border-t border-border bg-background/50 backdrop-blur-xl shrink-0 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="transaction-form"
            disabled={isSaving}
            className="flex-[2] h-11 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : transaction ? 'Update Transaction' : 'Save Transaction'}
          </Button>
        </div>
      </div>
    </div>
  );
}
