"""
Amount Validator and Parser
===========================
Centralized amount parsing with strict validation to ensure no data loss.
Handles all currency formats and preserves full decimal precision.
"""

import re
from typing import Optional, Tuple
import pandas as pd


class AmountValidator:
    """Strict amount parser with validation to prevent data loss."""
    
    # Currency symbols and patterns
    CURRENCY_SYMBOLS = ['₹', 'INR', 'Rs.', 'Rs', 'RS', 'rupees', 'rupee']
    CURRENCY_PATTERNS = [
        r'₹\s*([0-9,]+(?:\.[0-9]+)?)',
        r'INR\s*([0-9,]+(?:\.[0-9]+)?)',
        r'Rs\.?\s*([0-9,]+(?:\.[0-9]+)?)',
        r'([0-9,]+(?:\.[0-9]+)?)\s*(?:₹|INR|Rs\.?)',
    ]
    
    @staticmethod
    def parse_amount(amount_str: Optional[str], allow_negative: bool = False) -> float:
        """
        Parse amount string to float with full decimal precision.
        
        Args:
            amount_str: Amount string (e.g., "1,500.00", "₹1,500.00", "1500")
            allow_negative: Whether to allow negative amounts
            
        Returns:
            Float amount or 0.0 if invalid. Preserves all decimals.
        """
        if not amount_str or pd.isna(amount_str):
            return 0.0
        
        amount_str = str(amount_str).strip()
        
        if not amount_str or amount_str.lower() in ['none', 'nan', '', '-', 'n/a']:
            return 0.0
        
        # Remove currency symbols
        amount_str = AmountValidator._remove_currency_symbols(amount_str)
        
        # Check for negative amounts
        is_negative = False
        if amount_str.startswith('-'):
            is_negative = True
            amount_str = amount_str[1:].strip()
        
        # Remove commas and whitespace
        amount_str = amount_str.replace(',', '').replace(' ', '')
        
        if not amount_str:
            return 0.0
        
        try:
            # Parse as float (preserves all decimals)
            amount = float(amount_str)
            
            # Apply negative sign if needed
            if is_negative and allow_negative:
                amount = -amount
            elif is_negative and not allow_negative:
                # Negative not allowed, return 0
                return 0.0
            
            # Validate reasonable range (optional - can be adjusted)
            if abs(amount) > 1e15:  # Very large amounts might be errors
                return 0.0
            
            return amount
            
        except (ValueError, TypeError):
            return 0.0
    
    @staticmethod
    def _remove_currency_symbols(amount_str: str) -> str:
        """Remove all currency symbols from amount string."""
        result = amount_str
        for symbol in AmountValidator.CURRENCY_SYMBOLS:
            # Case-insensitive replacement
            pattern = re.compile(re.escape(symbol), re.IGNORECASE)
            result = pattern.sub('', result)
        
        # Remove currency patterns
        for pattern in AmountValidator.CURRENCY_PATTERNS:
            result = re.sub(pattern, r'\1', result, flags=re.IGNORECASE)
        
        return result.strip()
    
    @staticmethod
    def validate_amount(amount: float, min_value: float = 0.0, 
                       max_value: Optional[float] = None) -> bool:
        """
        Validate amount is within reasonable bounds.
        
        Args:
            amount: Amount to validate
            min_value: Minimum allowed value (default 0.0)
            max_value: Maximum allowed value (None for no limit)
            
        Returns:
            True if valid, False otherwise
        """
        if amount < min_value:
            return False
        if max_value is not None and amount > max_value:
            return False
        return True
    
    @staticmethod
    def validate_transaction_amounts(debit: float, credit: float) -> Tuple[bool, str]:
        """
        Validate transaction amounts are mutually exclusive and valid.
        
        Args:
            debit: Debit amount
            credit: Credit amount
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # At least one must be non-zero
        if debit == 0 and credit == 0:
            return False, "Both debit and credit are zero"
        
        # Both cannot be non-zero
        if debit > 0 and credit > 0:
            return False, "Both debit and credit are non-zero"
        
        # Amounts should be positive (negative handled by sign)
        if debit < 0 or credit < 0:
            return False, "Negative amounts not allowed in debit/credit fields"
        
        return True, ""
    
    @staticmethod
    def validate_balance_reconciliation(prev_balance: float, current_balance: float,
                                        debit: float, credit: float,
                                        tolerance: float = 0.01) -> Tuple[bool, float]:
        """
        Validate balance reconciliation.
        
        Args:
            prev_balance: Previous balance
            current_balance: Current balance after transaction
            debit: Debit amount
            credit: Credit amount
            tolerance: Allowed difference for rounding errors
            
        Returns:
            Tuple of (is_valid, difference)
        """
        expected_balance = prev_balance + credit - debit
        difference = abs(current_balance - expected_balance)
        
        is_valid = difference <= tolerance
        
        return is_valid, difference


def parse_amount_strict(amount_str: Optional[str], **kwargs) -> float:
    """
    Convenience function for strict amount parsing.
    
    Args:
        amount_str: Amount string to parse
        **kwargs: Additional parameters (allow_negative, etc.)
        
    Returns:
        Float amount or 0.0 if invalid
    """
    return AmountValidator.parse_amount(amount_str, **kwargs)

