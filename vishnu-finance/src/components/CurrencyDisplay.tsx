'use client';

import React from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface CurrencyDisplayProps {
  amount: number;
  originalCurrency?: string;
  showConversion?: boolean;
  className?: string;
}

export default function CurrencyDisplay({ 
  amount, 
  originalCurrency, 
  showConversion = false, 
  className = '' 
}: CurrencyDisplayProps) {
  const { 
    selectedCurrency, 
    formatCurrency, 
    convertCurrency, 
    exchangeRates, 
    isLoading, 
    lastUpdated 
  } = useCurrency();

  const convertedAmount = originalCurrency && originalCurrency !== selectedCurrency 
    ? convertCurrency(amount, originalCurrency, selectedCurrency)
    : amount;

  const isConverted = originalCurrency && originalCurrency !== selectedCurrency;
  const hasRates = Object.keys(exchangeRates).length > 0;

  return (
    <div className={`currency-display ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="font-semibold">
          {formatCurrency(convertedAmount, selectedCurrency)}
        </span>
        
        {isLoading && (
          <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
        )}
        
        {isConverted && showConversion && (
          <span className="text-sm text-gray-500">
            (from {formatCurrency(amount, originalCurrency)})
          </span>
        )}
      </div>
      
      {showConversion && isConverted && hasRates && (
        <div className="text-xs text-gray-400 mt-1">
          Exchange rate: 1 {originalCurrency} = {exchangeRates[selectedCurrency] / exchangeRates[originalCurrency]} {selectedCurrency}
        </div>
      )}
      
      {lastUpdated && (
        <div className="text-xs text-gray-400 mt-1">
          Rates updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

// Component to show exchange rate status
export function ExchangeRateStatus() {
  const { exchangeRates, isLoading, lastUpdated, error } = useCurrency();
  
  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-500">
        <TrendingDown className="w-4 h-4" />
        <span className="text-sm">Exchange rates unavailable</span>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-blue-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Updating rates...</span>
      </div>
    );
  }
  
  if (Object.keys(exchangeRates).length > 0) {
    return (
      <div className="flex items-center space-x-2 text-green-500">
        <TrendingUp className="w-4 h-4" />
        <span className="text-sm">
          {Object.keys(exchangeRates).length} currencies available
        </span>
        {lastUpdated && (
          <span className="text-xs text-gray-400">
            (updated {lastUpdated.toLocaleTimeString()})
          </span>
        )}
      </div>
    );
  }
  
  return null;
}
