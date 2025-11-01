'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface CurrencyRates {
  [key: string]: number;
}

interface CurrencyContextType {
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  exchangeRates: CurrencyRates;
  isLoading: boolean;
  error: string | null;
  formatCurrency: (amount: number, currency?: string) => string;
  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string) => number;
  getCurrencySymbol: (currency: string) => string;
  lastUpdated: Date | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_SYMBOLS: { [key: string]: string } = {
  'INR': '₹',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'CAD': 'C$',
  'AUD': 'A$',
  'CHF': 'CHF',
  'CNY': '¥',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
  'PLN': 'zł',
  'CZK': 'Kč',
  'HUF': 'Ft',
  'RUB': '₽',
  'BRL': 'R$',
  'MXN': '$',
  'KRW': '₩',
  'SGD': 'S$',
  'HKD': 'HK$',
  'NZD': 'NZ$',
  'ZAR': 'R',
  'TRY': '₺',
  'AED': 'د.إ',
  'SAR': '﷼',
  'QAR': '﷼',
  'KWD': 'د.ك',
  'BHD': 'د.ب',
  'OMR': '﷼',
  'JOD': 'د.ا',
  'LBP': 'ل.ل',
  'EGP': '£',
  'MAD': 'د.م.',
  'TND': 'د.ت',
  'DZD': 'د.ج',
  'LYD': 'ل.د',
  'SDG': 'ج.س.',
  'ETB': 'Br',
  'KES': 'KSh',
  'UGX': 'USh',
  'TZS': 'TSh',
  'MWK': 'MK',
  'ZMW': 'ZK',
  'BWP': 'P',
  'SZL': 'L',
  'LSL': 'L',
  'NAD': 'N$',
  'MUR': '₨',
  'SCR': '₨',
  'MVR': 'ރ',
  'LKR': '₨',
  'BDT': '৳',
  'NPR': '₨',
  'PKR': '₨',
  'AFN': '؋',
  'IRR': '﷼',
  'IQD': 'ع.د',
  'SYP': '£',
  'YER': '﷼',
  'ILS': '₪',
  'PEN': 'S/',
  'CLP': '$',
  'COP': '$',
  'ARS': '$',
  'UYU': '$U',
  'PYG': '₲',
  'BOB': 'Bs',
  'VES': 'Bs.S',
  'VEF': 'Bs',
  'GYD': 'G$',
  'SRD': '$',
  'TTD': 'TT$',
  'BBD': 'Bds$',
  'JMD': 'J$',
  'XCD': '$',
  'AWG': 'ƒ',
  'BZD': 'BZ$',
  'GTQ': 'Q',
  'HNL': 'L',
  'NIO': 'C$',
  'CRC': '₡',
  'PAB': 'B/.',
  'DOP': 'RD$',
  'HTG': 'G',
  'CUP': '$',
  'BMD': '$',
  'KYD': '$',
  'BSD': '$'
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [exchangeRates, setExchangeRates] = useState<CurrencyRates>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { user } = useAuth();

  // Load user's preferred currency from localStorage or default to INR
  useEffect(() => {
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency && CURRENCY_SYMBOLS[savedCurrency]) {
      setSelectedCurrency(savedCurrency);
    }
  }, []);

  // Save currency preference to localStorage
  useEffect(() => {
    localStorage.setItem('selectedCurrency', selectedCurrency);
  }, [selectedCurrency]);

  // Fetch exchange rates every 60 seconds
  // Fetch exchange rates once on mount
useEffect(() => {
  const fetchExchangeRates = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/currency-rates');
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }

      const data = await response.json();
      setExchangeRates(data.rates);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch exchange rates');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch immediately (only once)
  fetchExchangeRates();
}, []);


  const formatCurrency = useCallback((amount: number, currency?: string): string => {
    const targetCurrency = currency || selectedCurrency;
    const symbol = getCurrencySymbol(targetCurrency);
    
    // For INR, use Indian locale formatting
    if (targetCurrency === 'INR') {
      return `${symbol}${amount.toLocaleString('en-IN', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
      })}`;
    }
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: targetCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback formatting if Intl.NumberFormat fails
      return `${symbol}${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
      })}`;
    }
  }, [selectedCurrency]);

  const convertCurrency = useCallback((amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    
    // If we don't have exchange rates, return original amount
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
      return amount;
    }
    
    // Convert to USD first, then to target currency
    const usdAmount = amount / exchangeRates[fromCurrency];
    return usdAmount * exchangeRates[toCurrency];
  }, [exchangeRates]);

  const getCurrencySymbol = useCallback((currency: string): string => {
    return CURRENCY_SYMBOLS[currency] || currency;
  }, []);

  const handleSetSelectedCurrency = useCallback((currency: string) => {
    setSelectedCurrency(currency);
    
    // Save to user preferences if user is logged in
    if (user?.id) {
      fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currency: currency
        })
      }).catch(console.error);
    }
  }, [user?.id]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    selectedCurrency,
    setSelectedCurrency: handleSetSelectedCurrency,
    exchangeRates,
    isLoading,
    error,
    formatCurrency,
    convertCurrency,
    getCurrencySymbol,
    lastUpdated
  }), [selectedCurrency, handleSetSelectedCurrency, exchangeRates, isLoading, error, formatCurrency, convertCurrency, getCurrencySymbol, lastUpdated]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
