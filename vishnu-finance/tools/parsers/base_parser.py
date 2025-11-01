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
    
    def parse_date(self, date_str: str) -> Optional[str]:
        """
        Parse date string to ISO format (YYYY-MM-DD).
        
        Args:
            date_str: Date string in various formats
            
        Returns:
            ISO formatted date string or None
        """
        if not date_str or pd.isna(date_str):
            return None
        
        try:
            # Try parsing with pandas (handles multiple formats)
            parsed = pd.to_datetime(date_str, errors='coerce')
            if pd.isna(parsed):
                return None
            return parsed.strftime('%Y-%m-%d')
        except:
            return None
    
    def parse_amount(self, amount_str: str) -> float:
        """
        Parse amount string to float.
        
        Args:
            amount_str: Amount string
            
        Returns:
            Float amount or 0.0 if invalid
        """
        if pd.isna(amount_str) or not amount_str:
            return 0.0
        
        try:
            # Remove commas and currency symbols
            amount_str = str(amount_str).replace(',', '').replace('INR', '').replace('₹', '').replace('-', '').strip()
            if amount_str == '':
                return 0.0
            return float(amount_str)
        except:
            return 0.0
    
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
        
        # Ensure numeric fields
        for field in ['amount', 'debit', 'credit', 'balance']:
            if field in transaction and transaction[field] is not None:
                if isinstance(transaction[field], str):
                    transaction[field] = self.parse_amount(transaction[field])
                else:
                    transaction[field] = float(transaction[field])
        
        # Extract store and commodity if not already done
        if 'description' in transaction and transaction['description']:
            if 'store' not in transaction or not transaction['store']:
                store, commodity, clean_desc = self.extract_store_and_commodity(transaction['description'])
                transaction['store'] = store
                transaction['commodity'] = commodity
                transaction['description'] = clean_desc
        
        # Set bank code
        transaction['bankCode'] = self.bank_code
        
        # Determine transaction type
        if transaction.get('debit', 0) > 0:
            transaction['type'] = 'expense'
        elif transaction.get('credit', 0) > 0:
            transaction['type'] = 'income'
        
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

