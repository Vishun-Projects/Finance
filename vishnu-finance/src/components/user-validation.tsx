'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

interface ValidationRule {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  condition: (user: any) => boolean;
  action?: () => void;
  actionText?: string;
}

const validationRules: ValidationRule[] = [
  {
    id: 'first-income',
    message: 'Add your first income source to get started',
    type: 'info',
    condition: (user) => user?.incomeCount === 0,
    actionText: 'Add Income'
  },
  {
    id: 'first-expense',
    message: 'Track your first expense to see spending patterns',
    type: 'info',
    condition: (user) => user?.expenseCount === 0,
    actionText: 'Add Expense'
  },
  {
    id: 'set-goals',
    message: 'Set financial goals to stay motivated',
    type: 'info',
    condition: (user) => user?.goalCount === 0,
    actionText: 'Set Goals'
  },
  {
    id: 'emergency-fund',
    message: 'Consider building an emergency fund for financial security',
    type: 'warning',
    condition: (user) => user?.savingsRate < 10,
    actionText: 'Learn More'
  }
];

export default function UserValidation() {
  const { user } = useAuth();
  const [validations, setValidations] = useState<ValidationRule[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (user) {
      const activeValidations = validationRules.filter(rule => rule.condition(user));
      setValidations(activeValidations);
    }
  }, [user]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (!isVisible || validations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {validations.map((validation) => (
        <div
          key={validation.id}
          className={`p-4 rounded-lg border ${getBackgroundColor(validation.type)}`}
        >
          <div className="flex items-start space-x-3">
            {getIcon(validation.type)}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {validation.message}
              </p>
              {validation.action && validation.actionText && (
                <button
                  onClick={validation.action}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {validation.actionText} →
                </button>
              )}
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
