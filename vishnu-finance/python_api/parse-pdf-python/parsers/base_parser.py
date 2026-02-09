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

# Try relative imports first, then absolute
try:
    from .date_validator import DateValidator, parse_date_strict
    from .amount_validator import AmountValidator, parse_amount_strict
    from .statement_metadata import StatementMetadataExtractor
    try:
        from .ai_parser import AIParser
    except ImportError:
        AIParser = None
except ImportError:
    try:
        from date_validator import DateValidator, parse_date_strict
        from amount_validator import AmountValidator, parse_amount_strict
        from statement_metadata import StatementMetadataExtractor
        try:
            from ai_parser import AIParser
        except ImportError:
            AIParser = None
    except ImportError:
        # Last resort: try importing from parent parsers directory
        import sys
        import os
        parent_dir = os.path.dirname(os.path.dirname(__file__))
        parsers_dir = os.path.join(parent_dir, 'parsers')
        if parsers_dir not in sys.path:
            sys.path.insert(0, parsers_dir)
        try:
            from date_validator import DateValidator, parse_date_strict
            from amount_validator import AmountValidator, parse_amount_strict
            from statement_metadata import StatementMetadataExtractor
            try:
                from ai_parser import AIParser
            except ImportError:
                AIParser = None
        except ImportError:
            DateValidator = None
            AmountValidator = None
            StatementMetadataExtractor = None
            AIParser = None


class BaseBankParser(ABC):
    """Abstract base class for bank-specific parsers."""
    
    def __init__(self, bank_code: str):
        """Initialize parser with bank code."""
        self.bank_code = bank_code
    
    def normalize_text(self, text: str) -> str:
        """
        Normalize text to fix spacing issues in UPI IDs, person names, and store names.
        
        Args:
            text: Raw text with potential spacing issues
            
        Returns:
            Normalized text with spacing issues fixed
        """
        if not text:
            return text
        
        # Fix spacing in UPI IDs: /mamtavishw akarma0948@okhdfcbank -> /mamtavishwakarma0948@okhdfcbank
        # Pattern: word boundary, alphanumeric, space, alphanumeric, @
        text = re.sub(r'([a-z0-9])\s+([a-z0-9]+@[a-z0-9.]+)', r'\1\2', text, flags=re.IGNORECASE)
        
        # Fix spacing in UPI IDs that are part of paths: /mamtavishw akarma0948@okhdfcbank
        text = re.sub(r'(/[a-z0-9]+)\s+([a-z0-9]+@[a-z0-9.]+)', r'\1\2', text, flags=re.IGNORECASE)
        
        # Fix spacing in person names within UPI IDs: manishavish wakarma2463@okaxis -> manishavishwakarma2463@okaxis
        # Pattern: letters, space, letters+digits, @
        text = re.sub(r'([a-z]+)\s+([a-z]+\d+@[a-z0-9.]+)', r'\1\2', text, flags=re.IGNORECASE)
        
        # Fix spacing in UPI IDs with person names: /manishavish wakarma2463@okaxis
        text = re.sub(r'(/[a-z]+)\s+([a-z]+\d+@[a-z0-9.]+)', r'\1\2', text, flags=re.IGNORECASE)
        
        # Fix spacing in person names that are clearly part of UPI transactions
        # Pattern: /NAME PART1 PART2@ -> /NAMEPART1PART2@ (but preserve actual name parts)
        # Only fix if it's clearly a UPI ID pattern
        text = re.sub(r'([A-Z][A-Z\s]+)\s+([A-Z][A-Z\s]*@[a-z0-9.]+)', 
                     lambda m: m.group(1).replace(' ', '') + ' ' + m.group(2) if '@' in m.group(2) else m.group(0),
                     text)
        
        # Fix spacing in store names that are part of transaction codes
        # Pattern: CODE/STORE NAME / -> CODE/STORENAME /
        # But be careful not to break actual multi-word store names
        # Only fix if it's followed by technical terms like /UPI, /BRANCH, etc.
        text = re.sub(r'([A-Z0-9]+)/([A-Z][A-Z\s]+?)\s+/(UPI|BRANCH|ATM|XXXXX)', 
                     lambda m: m.group(1) + '/' + m.group(2).replace(' ', '') + ' /' + m.group(3),
                     text, flags=re.IGNORECASE)
        
        # Fix spacing in account numbers and transaction IDs
        # Pattern: space between digits that should be together
        text = re.sub(r'(\d)\s+(\d{4,})', r'\1\2', text)  # Fix broken account numbers
        
        # Normalize multiple spaces to single space
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    @abstractmethod
    def parse_pdf(self, pdf_path) -> pd.DataFrame:
        """Parse PDF file and return DataFrame of transactions."""
        pass
    
    @abstractmethod
    def parse_excel(self, file_path) -> pd.DataFrame:
        """Parse Excel file and return DataFrame of transactions."""
        pass
    
    def parse_with_ai_fallback(
        self,
        description: str,
        raw_text: str = '',
        previous_date: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Parse transaction description using AI as fallback when standard parsing fails.
        
        Args:
            description: Transaction description
            raw_text: Raw transaction text
            previous_date: Previous transaction date for context
            
        Returns:
            Dictionary with parsed fields or None if AI parsing fails
        """
        if not AIParser:
            return None
        
        try:
            result = AIParser.parse_transaction_with_ai(
                description,
                raw_text,
                self.bank_code,
                previous_date
            )
            
            if result:
                # Convert AI result to transaction dict format
                transaction = {
                    'store': result.get('store'),
                    'personName': result.get('personName'),
                    'upiId': result.get('upiId'),
                    'commodity': result.get('commodity'),
                    'transferType': result.get('transferType'),
                    'transactionId': result.get('transactionId'),
                    'branch': result.get('branch'),
                    'description': result.get('cleanDescription') or description,
                    'parsingMethod': result.get('parsingMethod', 'ai_fallback'),
                    'parsingConfidence': result.get('parsingConfidence', 0.7),
                }
                
                # If AI extracted date, use it
                if result.get('date'):
                    transaction['date_iso'] = result.get('date')
                
                return transaction
        except Exception as e:
            print(f"⚠️ AI parsing fallback error: {e}")
        
        return None
    
    def extract_store_and_commodity(self, description: str) -> Tuple[Optional[str], Optional[str], str]:
        """
        Extract store name and commodity from transaction description.
        Enhanced with AI fallback for complex descriptions.
        
        Args:
            description: Raw transaction description
            
        Returns:
            Tuple of (store_name, commodity, clean_description)
        """
        # Normalize text first to fix spacing issues
        description = self.normalize_text(description)
        
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
        # Also handle: /mamtavishwakarma0948@okhdfcbank ANCH : ATM SERVICE BRANCH
        # And: HDFC0002504/MAMTA - INR 60.00 MUNSHEELAL VISHWAKARMA
        
        # Extract store name (text after first slash, before next slash or UPI/code)
        # Improved pattern to handle UPI IDs and person names
        store_patterns = [
            # Standard pattern: CODE/Store Name /...
            r'^[A-Z0-9]+/([^/]+?)(?:\s*/\s*(?:[A-Z0-9@]+|UPI|BRANCH|ATM\s+SERVICE)|$)',
            # UPI pattern: /upiid@bank /...
            r'^/([a-z0-9]+@[a-z0-9.]+)(?:\s+[A-Z\s:]+|$)',
            # Bank code pattern: HDFC0002504/NAME - AMOUNT NAME
            r'^[A-Z]{4}\d+/([A-Z\s]+?)(?:\s*-\s*INR|$)',
        ]
        
        for pattern in store_patterns:
            store_match = re.search(pattern, description, re.IGNORECASE)
            if store_match:
                store = store_match.group(1).strip()
                store = re.sub(r'\s+', ' ', store).strip()
                
                # Clean store name - remove any remaining technical terms
                store = re.sub(r'\s*(?:Date|Transaction|Details|Debits|Credits|Balance)\s*.*$', '', store, flags=re.IGNORECASE).strip()
                
                # Remove common suffixes that aren't part of store name
                store = re.sub(r'\s*(?:ANCH|ATM|SERVICE|BRANCH).*$', '', store, flags=re.IGNORECASE).strip()
                
                # If store is empty or just whitespace after cleaning, discard it
                if store and len(store) >= 2:
                    break
                else:
                    store = None
        
        # If no store found, try to extract person name from UPI transactions
        if not store:
            # Pattern: /name@upi / or name@upi in description
            upi_name_match = re.search(r'/([a-z0-9]+@[a-z0-9.]+)', description, re.IGNORECASE)
            if upi_name_match:
                # Extract name part before @
                upi_id = upi_name_match.group(1)
                name_part = upi_id.split('@')[0]
                # If it looks like a name (has letters), use it as store
                if re.search(r'[a-z]', name_part, re.IGNORECASE):
                    store = name_part
        
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
                # If date parsing failed, set flag
                if not transaction['date_iso']:
                    transaction['hasInvalidDate'] = True
        
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
        
        # Check for zero amount and set flag
        debit = transaction.get('debit', 0)
        credit = transaction.get('credit', 0)
        if debit == 0 and credit == 0:
            transaction['hasZeroAmount'] = True
        
        # Normalize description text first
        if 'description' in transaction and transaction['description']:
            transaction['description'] = self.normalize_text(transaction['description'])
        
        # Extract store and commodity if not already done
        if 'description' in transaction and transaction['description']:
            if 'store' not in transaction or not transaction['store']:
                store, commodity, clean_desc = self.extract_store_and_commodity(transaction['description'])
                transaction['store'] = store
                transaction['commodity'] = commodity
                transaction['description'] = clean_desc
        
        # Normalize other text fields
        for field in ['store', 'personName', 'upiId', 'branch']:
            if field in transaction and transaction[field] and isinstance(transaction[field], str):
                transaction[field] = self.normalize_text(transaction[field])
        
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
        
        # Check for zero amount again after normalization
        if transaction['debit'] == 0 and transaction['credit'] == 0:
            transaction['hasZeroAmount'] = True
        
        # Preserve data quality flags if they exist
        # (isPartialData, hasInvalidDate, hasZeroAmount, parsingMethod, parsingConfidence)
        # These flags are set by parsers and should be preserved
        
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

