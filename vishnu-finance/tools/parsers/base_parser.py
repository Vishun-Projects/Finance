"""
Base Parser for Bank Statements
================================
Abstract base class defining the interface for all bank-specific parsers.
"""

from abc import ABC, abstractmethod
import re
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime

try:
    from .date_validator import DateValidator, parse_date_strict
    from .amount_validator import AmountValidator, parse_amount_strict
    from .statement_metadata import StatementMetadataExtractor
except ImportError:
    from date_validator import DateValidator, parse_date_strict
    from amount_validator import AmountValidator, parse_amount_strict
    from statement_metadata import StatementMetadataExtractor


class BaseBankParser(ABC):
    """Abstract base class for bank-specific parsers."""
    
    def __init__(self, bank_code: str):
        """Initialize parser with bank code."""
        self.bank_code = bank_code
    
    @abstractmethod
    def parse_pdf(self, pdf_path) -> pd.DataFrame:
        """Parse PDF file and return DataFrame of transactions."""
        pass
    
    @abstractmethod
    def parse_excel(self, file_path) -> pd.DataFrame:
        """Parse Excel file and return DataFrame of transactions."""
        pass
    
    def extract_store_and_commodity(self, description: str) -> Tuple[Optional[str], Optional[str], str]:
        """
        Extract store name and commodity from transaction description.
        
        Args:
            description: Raw transaction description
            
        Returns:
            Tuple of (store_name, commodity, clean_description)
        """
        store = None
        commodity = None
        clean_description = description
        
        # Filter out obvious table headers and metadata that shouldn't be stores
        invalid_patterns = [
            r'Date\s+Transaction\s+Details',
            r'Debits\s+Credits\s+Balance',
            r'Transaction\s+Details\s+Debits',
        ]
        
        for invalid_pattern in invalid_patterns:
            if re.search(invalid_pattern, description, re.IGNORECASE):
                # This is a table header, not a real transaction
                return None, None, description
        
        # Pattern to match: TRANSACTION_CODE/Store Name /other_info /commodity
        # Example: YESB0PTMUPI/Sangam Stationery Stores /XXXXX /pens
        
        # Extract store name (text after first slash, before next slash or UPI/code)
        store_match = re.search(r'^[A-Z0-9]+/([^/]+?)(?:\s*/\s*(?:[A-Z0-9@]+|UPI|BRANCH)|$)', description)
        if store_match:
            store = store_match.group(1).strip()
            store = re.sub(r'\s+', ' ', store).strip()
            
            # Clean store name - remove any remaining technical terms
            store = re.sub(r'\s*(?:Date|Transaction|Details|Debits|Credits|Balance)\s*.*$', '', store, flags=re.IGNORECASE).strip()
            
            # If store is empty or just whitespace after cleaning, discard it
            if not store or len(store) < 2:
                store = None
        
        # Extract commodity - look for meaningful words at the end
        commodity_patterns = [
            r'/\s*XXXXX\s*/\s*[^/]+\s*/\s*UPI\s*/\s*[0-9]+\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)',
            r'/\s*XXXXX\s*/\s*[^/]+\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*(?:BRANCH|@))',
            r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*(?:BRANCH|ATM\s+SERVICE|paytmqr))',
            r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*$)',  # Last meaningful word before end
        ]
        
        for pattern in commodity_patterns:
            commodity_match = re.search(pattern, description)
            if commodity_match:
                candidate = commodity_match.group(1).strip()
                # Skip technical codes and meaningless words
                skip_words = ['XXXXX', 'UPI', 'BRANCH', 'ATM', 'SERVICE', 'paytmqr', 
                             'Date', 'Transaction', 'Details', 'Debits', 'Credits', 'Balance',
                             'USING', 'VIA', 'TXN', 'REF', 'TID']
                if candidate and len(candidate) > 1 and candidate.upper() not in skip_words:
                    commodity = candidate.title()  # Capitalize properly
                    break
        
        # Clean up description
        clean_description = description
        
        # Remove store name part
        if store:
            clean_description = re.sub(r'^[A-Z0-9]+/[^/]+', '', clean_description)
        
        # Remove commodity
        if commodity:
            clean_description = re.sub(r'/\s*' + re.escape(commodity) + r'(?:\s|$)', '', clean_description, flags=re.IGNORECASE)
        
        # Remove UPI IDs, codes, and other technical info
        clean_description = re.sub(r'/\s*[A-Z0-9@]+', '', clean_description)
        clean_description = re.sub(r'/\s*UPI\b', '', clean_description)
        clean_description = re.sub(r'/\s*BRANCH.*', '', clean_description, flags=re.IGNORECASE)
        clean_description = re.sub(r'/\s*ATM\s+SERVICE.*', '', clean_description, flags=re.IGNORECASE)
        clean_description = re.sub(r'/\s*paytmqr.*', '', clean_description, flags=re.IGNORECASE)
        clean_description = re.sub(r'/\s*XXXXX', '', clean_description)
        clean_description = re.sub(r'\s+', ' ', clean_description).strip()
        
        return store, commodity, clean_description
    
    def parse_date(self, date_str: str, statement_start_date: Optional[str] = None,
                   statement_end_date: Optional[str] = None,
                   previous_date: Optional[str] = None) -> Optional[str]:
        """
        Parse date string to ISO format (YYYY-MM-DD) using strict validation.
        
        Args:
            date_str: Date string in various formats
            statement_start_date: Statement start date in ISO format (for validation)
            statement_end_date: Statement end date in ISO format (for validation)
            previous_date: Previous transaction date in ISO format (for chronological validation)
            
        Returns:
            ISO formatted date string or None
        """
        return DateValidator.parse_date(
            date_str,
            bank_code=self.bank_code,
            statement_start_date=statement_start_date,
            statement_end_date=statement_end_date,
            previous_date=previous_date
        )
    
    def parse_amount(self, amount_str: str, allow_negative: bool = False) -> float:
        """
        Parse amount string to float with strict validation.
        
        Args:
            amount_str: Amount string
            allow_negative: Whether to allow negative amounts
            
        Returns:
            Float amount or 0.0 if invalid. Preserves all decimals.
        """
        return AmountValidator.parse_amount(amount_str, allow_negative=allow_negative)
    
    def normalize_transaction(self, transaction: Dict) -> Dict:
        """
        Normalize transaction to standard format.
        
        Args:
            transaction: Raw transaction dictionary
            
        Returns:
            Normalized transaction dictionary
        """
        # Ensure date_iso is set
        if 'date_iso' not in transaction or not transaction['date_iso']:
            if 'date' in transaction:
                transaction['date_iso'] = self.parse_date(transaction['date'])
        
        # Ensure numeric fields - use strict amount parsing
        for field in ['amount', 'debit', 'credit', 'balance']:
            if field in transaction and transaction[field] is not None:
                if isinstance(transaction[field], str):
                    transaction[field] = self.parse_amount(transaction[field])
                elif isinstance(transaction[field], (int, float)):
                    transaction[field] = float(transaction[field])
                else:
                    # Try to convert to string and parse
                    transaction[field] = self.parse_amount(str(transaction[field]))
        
        # Extract store and commodity if not already done
        if 'description' in transaction and transaction['description']:
            if 'store' not in transaction or not transaction['store']:
                store, commodity, clean_desc = self.extract_store_and_commodity(transaction['description'])
                transaction['store'] = store
                transaction['commodity'] = commodity
                transaction['description'] = clean_desc
        
        # Set bank code
        transaction['bankCode'] = self.bank_code
        
        # Ensure credit and debit amounts are explicitly set (one should be 0)
        debit = transaction.get('debit', 0)
        credit = transaction.get('credit', 0)
        
        # If only amount is provided, infer credit/debit
        if debit == 0 and credit == 0 and 'amount' in transaction:
            amount = transaction.get('amount', 0)
            # For backward compatibility, if type was set, use it
            # Otherwise, amount > 0 could be either, default to expense
            if transaction.get('type') == 'income':
                credit = abs(amount)
                debit = 0.0
            else:
                debit = abs(amount)
                credit = 0.0
        
        # Ensure both fields exist and are non-negative
        transaction['debit'] = abs(float(debit)) if debit > 0 else 0.0
        transaction['credit'] = abs(float(credit)) if credit > 0 else 0.0
        
        # Remove legacy 'type' field if present (we use credit/debit now)
        if 'type' in transaction:
            del transaction['type']
        
        return transaction
    
    def create_transaction_id(self, transaction: Dict) -> str:
        """
        Create unique transaction ID for deduplication.
        
        Args:
            transaction: Transaction dictionary
            
        Returns:
            Unique transaction ID
        """
        import hashlib
        
        # Use date, description, debit, credit for hash
        key = f"{transaction.get('date_iso', '')}_{transaction.get('description', '')}_{transaction.get('debit', 0)}_{transaction.get('credit', 0)}"
        return hashlib.md5(key.encode()).hexdigest()
    
    def extract_statement_metadata(self, pdf_path, transactions_df: Optional[pd.DataFrame] = None) -> Dict:
        """
        Extract statement metadata including opening balance, period, account info.
        
        Args:
            pdf_path: Path to PDF file
            transactions_df: DataFrame of parsed transactions (optional)
            
        Returns:
            Dictionary with metadata:
            - openingBalance
            - closingBalance
            - statementStartDate
            - statementEndDate
            - accountNumber
            - ifsc
            - branch
            - accountHolderName
            - totalDebits
            - totalCredits
            - transactionCount
        """
        return StatementMetadataExtractor.extract_all_metadata(
            pdf_path, self.bank_code, transactions_df
        )

