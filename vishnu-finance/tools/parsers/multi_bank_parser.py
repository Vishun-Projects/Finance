"""
Multi-Bank Generic Parser
=========================
Generic parser for banks without specific parsers (KKBK, HDFC, YESB, UTIB, JIOP, etc.)
"""

import re
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional
import pdfplumber

try:
    from .base_parser import BaseBankParser
except ImportError:
    from base_parser import BaseBankParser


class MultiBankParser(BaseBankParser):
    """Generic parser for multiple banks."""
    
    # Bank code mapping
    BANK_CODES = {
        'KKBK': ['KKBK', 'KOTAK'],
        'HDFC': ['HDFC'],
        'YESB': ['YESB', 'YES BANK'],
        'UTIB': ['UTIB', 'AXIS'],
        'JIOP': ['JIOP', 'JIO PAYMENTS']
    }
    
    def __init__(self, bank_code: str):
        """
        Initialize multi-bank parser.
        
        Args:
            bank_code: Bank code (KKBK, HDFC, YESB, etc.)
        """
        super().__init__(bank_code)
    
    def parse_pdf(self, pdf_path: Path) -> pd.DataFrame:
        """
        Parse bank PDF statement using table extraction.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            DataFrame of transactions
        """
        transactions = []
        seen_transactions = set()
        
        try:
            with pdfplumber.open(str(pdf_path)) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    tables = page.extract_tables()
                    
                    if tables:
                        for table in tables:
                            if len(table) < 2:
                                continue
                            
                            for row_idx, row in enumerate(table):
                                if not row or len(row) < 3:
                                    continue
                                
                                transaction = self._parse_table_row(row, page_num + 1, row_idx)
                                if transaction:
                                    txn_id = self.create_transaction_id(transaction)
                                    if txn_id not in seen_transactions:
                                        seen_transactions.add(txn_id)
                                        transactions.append(transaction)
                    else:
                        text = page.extract_text()
                        if text:
                            rows = self._parse_text_lines(text)
                            for transaction in rows:
                                if transaction:
                                    txn_id = self.create_transaction_id(transaction)
                                    if txn_id not in seen_transactions:
                                        seen_transactions.add(txn_id)
                                        transactions.append(transaction)
        
        except Exception as e:
            print(f"Error parsing PDF: {e}")
            import traceback
            traceback.print_exc()
        
        return pd.DataFrame(transactions) if transactions else pd.DataFrame()
    
    def parse_excel(self, file_path: Path) -> pd.DataFrame:
        """
        Parse bank Excel statement.
        
        Args:
            file_path: Path to Excel file
            
        Returns:
            DataFrame of transactions
        """
        transactions = []
        seen_transactions = set()
        
        try:
            df = pd.read_excel(file_path)
            
            # Generic format detection
            for idx, row in df.iterrows():
                transaction = self._parse_excel_row(row, idx)
                if transaction:
                    txn_id = self.create_transaction_id(transaction)
                    if txn_id not in seen_transactions:
                        seen_transactions.add(txn_id)
                        transactions.append(transaction)
        
        except Exception as e:
            print(f"Error parsing Excel: {e}")
            import traceback
            traceback.print_exc()
        
        return pd.DataFrame(transactions) if transactions else pd.DataFrame()
    
    def _parse_table_row(self, row: List, page: int, line: int) -> Optional[Dict]:
        """Parse a table row into a transaction dictionary."""
        if not row or len(row) < 3:
            return None
        
        try:
            # Flexible column detection
            # Try common patterns: Date, Details, Amount columns
            
            date_str = None
            details = None
            debit_str = None
            credit_str = None
            balance_str = None
            
            # Try to identify columns by content
            for col_idx, cell in enumerate(row[:6]):  # Check first 6 columns
                cell_str = str(cell).strip() if cell else ''
                
                # Check for date
                if not date_str:
                    if re.match(r'\d{1,2}[-/\s][a-zA-Z]{3,10}[-/\s]\d{4}', cell_str) or \
                       re.match(r'\d{1,2}\s+[A-Za-z]{3}\s+\d{4}', cell_str):
                        date_str = cell_str
                        continue
                
                # Check for amount (numeric with decimal)
                if re.match(r'[0-9,]+\.\d{2}', cell_str):
                    if not debit_str:
                        debit_str = cell_str
                        continue
                    elif not credit_str:
                        credit_str = cell_str
                        continue
                    elif not balance_str:
                        balance_str = cell_str
                        continue
            
            # Details is usually the longest text column
            if not details and len(row) > 1:
                potential_details = [str(cell) for cell in row if cell and str(cell).strip()]
                for pd in potential_details:
                    if len(pd) > 20:  # Likely description
                        details = pd
                        break
            
            if not date_str or not details:
                return None
            
            date_iso = self.parse_date(date_str)
            if not date_iso:
                return None
            
            debit = self.parse_amount(debit_str) if debit_str else 0
            credit = self.parse_amount(credit_str) if credit_str else 0
            balance = self.parse_amount(balance_str) if balance_str else None
            
            if debit == 0 and credit == 0:
                return None
            
            metadata = self._extract_metadata(details)
            store, commodity, clean_description = self.extract_store_and_commodity(details)
            
            if debit > 0:
                transaction_type = 'expense'
                amount = debit
            else:
                transaction_type = 'income'
                amount = credit
            
            transaction = {
                'date': date_str,
                'date_iso': date_iso,
                'description': clean_description or details,
                'raw': details,
                'amount': amount,
                'type': transaction_type,
                'debit': debit,
                'credit': credit,
                'balance': balance,
                'page': f'Page {page}',
                'line': str(line),
                'store': store,
                'commodity': commodity,
                **metadata
            }
            
            return self.normalize_transaction(transaction)
        
        except Exception as e:
            print(f"Error parsing table row: {e}")
            return None
    
    def _parse_excel_row(self, row: pd.Series, idx: int) -> Optional[Dict]:
        """Parse an Excel row into a transaction dictionary."""
        try:
            # Try to find date column
            date_val = None
            for col_name in row.index:
                if 'date' in str(col_name).lower():
                    date_val = row[col_name]
                    break
            
            if not date_val and len(row) > 0:
                date_val = row.iloc[0]
            
            if not date_val:
                return None
            
            date_iso = self.parse_date(date_val)
            if not date_iso:
                return None
            
            # Try to find description
            details = None
            for col_name in row.index:
                col_lower = str(col_name).lower()
                if any(keyword in col_lower for keyword in ['detail', 'desc', 'particular', 'narration']):
                    details = str(row[col_name])
                    break
            
            if not details and len(row) > 1:
                details = str(row.iloc[1])
            
            # Try to find debit/credit
            debit_val = None
            credit_val = None
            balance_val = None
            
            for col_name in row.index:
                col_lower = str(col_name).lower()
                if 'debit' in col_lower or 'dr' in col_lower:
                    debit_val = row[col_name]
                elif 'credit' in col_lower or 'cr' in col_lower:
                    credit_val = row[col_name]
                elif 'bal' in col_lower:
                    balance_val = row[col_name]
            
            # If not found by name, try to parse amounts
            if not debit_val or not credit_val:
                for idx, val in enumerate(row[2:], start=2):
                    val_str = str(val).strip().replace(',', '')
                    if re.match(r'\d+\.\d{2}', val_str):
                        if not debit_val:
                            debit_val = val
                        elif not credit_val:
                            credit_val = val
                        else:
                            balance_val = val
                            break
            
            debit = self.parse_amount(debit_val) if debit_val else 0
            credit = self.parse_amount(credit_val) if credit_val else 0
            balance = self.parse_amount(balance_val) if balance_val else None
            
            if debit == 0 and credit == 0:
                return None
            
            metadata = self._extract_metadata(details) if details else {}
            store, commodity, clean_desc = self.extract_store_and_commodity(details) if details else (None, None, None)
            
            transaction = {
                'date': str(date_val),
                'date_iso': date_iso,
                'description': clean_desc or details,
                'raw': details,
                'amount': debit if debit > 0 else credit,
                'type': 'expense' if debit > 0 else 'income',
                'debit': debit,
                'credit': credit,
                'balance': balance,
                'page': 'Excel',
                'line': str(idx + 1),
                'store': store,
                'commodity': commodity,
                **metadata
            }
            
            return self.normalize_transaction(transaction)
        
        except Exception as e:
            print(f"Error parsing Excel row: {e}")
            return None
    
    def _parse_text_lines(self, text: str) -> List[Dict]:
        """Parse text lines as fallback when tables not detected."""
        transactions = []
        lines = text.split('\n')
        
        for line_num, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Look for date patterns
            date_match = re.search(r'(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})', line)
            if not date_match:
                continue
            
            date = date_match.group(1)
            date_iso = self.parse_date(date)
            if not date_iso:
                continue
            
            # Extract amounts
            amount_patterns = [
                r'INR\s*([0-9,]+(?:\.[0-9]{2})?)\s*-\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)',
                r'-\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)',
            ]
            
            transaction_amount = None
            balance = None
            is_credit = False
            
            for pattern in amount_patterns:
                match = re.search(pattern, line)
                if match:
                    if pattern.startswith('INR'):
                        transaction_amount = float(match.group(1).replace(',', ''))
                        balance = float(match.group(2).replace(',', ''))
                        is_credit = False
                    else:
                        transaction_amount = float(match.group(1).replace(',', ''))
                        balance = float(match.group(2).replace(',', ''))
                        is_credit = True
                    break
            
            if transaction_amount is None:
                continue
            
            description = line
            description = re.sub(r'\d{1,2}\s+[A-Za-z]{3}\s+\d{4}', '', description)
            description = re.sub(r'INR\s*[0-9,]+(?:\.[0-9]{2})?', '', description)
            description = re.sub(r'[+-]', '', description)
            description = re.sub(r'\s{2,}', ' ', description).strip()
            
            metadata = self._extract_metadata(description)
            store, commodity, clean_desc = self.extract_store_and_commodity(description)
            
            transaction = {
                'date': date,
                'date_iso': date_iso,
                'description': clean_desc or description,
                'raw': description,
                'amount': transaction_amount,
                'type': 'income' if is_credit else 'expense',
                'debit': 0 if is_credit else transaction_amount,
                'credit': transaction_amount if is_credit else 0,
                'balance': balance,
                'page': 'Text',
                'line': str(line_num + 1),
                'store': store,
                'commodity': commodity,
                **metadata
            }
            
            transactions.append(self.normalize_transaction(transaction))
        
        return transactions
    
    def _extract_metadata(self, details: str) -> Dict:
        """
        Extract metadata from transaction details.
        
        Args:
            details: Transaction description text
            
        Returns:
            Dictionary with extracted metadata
        """
        metadata = {
            'transactionId': None,
            'personName': None,
            'accountNumber': None,
            'transferType': None,
            'upiId': None
        }
        
        if not details:
            return metadata
        
        # Try to detect bank code in description
        for bank_code, patterns in self.BANK_CODES.items():
            for pattern in patterns:
                if pattern in details:
                    metadata['bankCode'] = bank_code
                    break
        
        # Generic UPI pattern detection
        upi_patterns = [
            r'UPI/([A-Z]+)/([A-Z0-9]+)/([^/]+?)/([A-Z]+)/([^/\s]+)',
            r'/[A-Z]{4}\d+/[^/]+/([^/]+?)@[^/\s]+',
        ]
        
        for pattern in upi_patterns:
            match = re.search(pattern, details, re.IGNORECASE)
            if match:
                if len(match.groups()) >= 2:
                    metadata['transferType'] = f"UPI/{match.group(1)}" if match.group(1) else "UPI"
                if len(match.groups()) >= 3:
                    metadata['transactionId'] = match.group(2).strip()
                if len(match.groups()) >= 4:
                    metadata['personName'] = match.group(3).strip()
                if len(match.groups()) >= 6:
                    metadata['upiId'] = match.group(5).strip()
                return metadata
        
        return metadata

