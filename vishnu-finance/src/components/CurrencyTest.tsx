'use client';

import React from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export default function CurrencyTest() {
  const { 
    selectedCurrency, 
    setSelectedCurrency, 
    formatCurrency, 
    convertCurrency, 
    exchangeRates, 
    lastUpdated 
  } = useCurrency();

  const testAmount = 1000; // Test with 1000 units

  return (
    <div className="p-4 space-y-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Currency Conversion Test</h3>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Currency:</label>
        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
            <SelectItem value="USD">US Dollar ($)</SelectItem>
            <SelectItem value="EUR">Euro (€)</SelectItem>
            <SelectItem value="GBP">British Pound (£)</SelectItem>
            <SelectItem value="JPY">Japanese Yen (¥)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">Test Amount: {testAmount} USD</p>
        <p className="text-lg font-semibold">
          Converted: {formatCurrency(convertCurrency(testAmount, 'USD', selectedCurrency))}
        </p>
      </div>

      <div className="text-xs text-gray-500">
        <p>Available currencies: {Object.keys(exchangeRates).length}</p>
        {lastUpdated && (
          <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Sample conversions from USD:</p>
        {['INR', 'EUR', 'GBP', 'JPY'].map(currency => (
          <p key={currency} className="text-sm">
            {currency}: {formatCurrency(convertCurrency(testAmount, 'USD', currency), currency)}
          </p>
        ))}
      </div>
    </div>
  );
}
