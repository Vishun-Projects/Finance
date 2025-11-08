'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, ShoppingCart, ArrowLeftRight, DollarSign, TrendingUp, Receipt } from 'lucide-react';
import FilterSheet from './filter-sheet';
import { TransactionFormData } from '../transaction-form-modal';
import { getWhileTap, prefersReducedMotion, TIMING } from '@/lib/motion-utils';
import { hapticLight, hapticMedium } from '@/lib/haptics';
import { trackPresetSelected, trackSheetActionSelected } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './button';

interface TransactionPreset {
  id: string;
  label: string;
  icon: React.ElementType;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  defaults: Partial<TransactionFormData>;
}

const PRESETS: TransactionPreset[] = [
  {
    id: 'salary',
    label: 'Salary',
    icon: TrendingUp,
    type: 'INCOME',
    defaults: {
      financialCategory: 'INCOME',
      description: 'Monthly Salary',
      creditAmount: 0,
      debitAmount: 0,
    },
  },
  {
    id: 'groceries',
    label: 'Groceries',
    icon: ShoppingCart,
    type: 'EXPENSE',
    defaults: {
      financialCategory: 'EXPENSE',
      description: 'Groceries',
      debitAmount: 0,
      creditAmount: 0,
    },
  },
  {
    id: 'transfer',
    label: 'Transfer',
    icon: ArrowLeftRight,
    type: 'TRANSFER',
    defaults: {
      financialCategory: 'TRANSFER',
      description: 'Money Transfer',
      creditAmount: 0,
      debitAmount: 0,
    },
  },
  {
    id: 'other',
    label: 'Other',
    icon: Receipt,
    type: 'EXPENSE',
    defaults: {
      financialCategory: 'EXPENSE',
      description: '',
      debitAmount: 0,
      creditAmount: 0,
    },
  },
];

interface TransactionAddSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectPreset: (preset: TransactionPreset) => void;
  onOpenFullForm: () => void;
}

export default function TransactionAddSheet({
  open,
  onClose,
  onSelectPreset,
  onOpenFullForm,
}: TransactionAddSheetProps) {
  const { user } = useAuth();
  const reducedMotion = prefersReducedMotion();

  const handlePresetClick = (preset: TransactionPreset) => {
    hapticLight();
    trackPresetSelected(preset.id, user?.id);
    trackSheetActionSelected('preset', preset.id, user?.id);
    onSelectPreset(preset);
    onClose();
  };

  const handleFullFormClick = () => {
    hapticMedium();
    trackSheetActionSelected('full_form', undefined, user?.id);
    onOpenFullForm();
    onClose();
  };

  return (
    <FilterSheet open={open} onClose={onClose} title="Add Transaction">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick Add</h4>
          <div className="grid grid-cols-2 gap-3">
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <motion.button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={`
                    flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2
                    bg-card hover:bg-muted/50 transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                  `}
                  whileTap={reducedMotion ? {} : getWhileTap()}
                  aria-label={`Add ${preset.label} transaction`}
                >
                  <Icon className="w-6 h-6 text-primary" />
                  <span className="text-sm font-medium">{preset.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={handleFullFormClick}
            className="w-full"
            variant="outline"
            size="lg"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Full Form
          </Button>
        </div>
      </div>
    </FilterSheet>
  );
}

export type { TransactionPreset };

