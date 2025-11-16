"""
SBI (State Bank of India) Parser
==================================
Parser for SBI bank statements with table extraction and pattern recognition.
"""

import re
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pdfplumber

try:
    from .base_parser import BaseBankParser
except ImportError:
    from base_parser import BaseBankParser


class SBIParser(BaseBankParser):
    """Parser for SBI bank statements."""
    
    def __init__(self):
        """Initialize SBI parser."""
        super().__init__('SBIN')
    
    def parse_pdf(self, pdf_path: Path) -> pd.DataFrame:
        """
        Parse SBI PDF statement using table extraction.
        
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
                    # Try table extraction first
                    tables = page.extract_tables()
                    
                    if tables:
                        # Process each table
                        for table in tables:
                            if len(table) < 2:  # Need at least header + 1 data row
                                continue
                            
                            # Look for transaction rows (date in first column)
                            for row_idx, row in enumerate(table):
                                if not row or len(row) < 6:
                                    continue
                                
                                transaction = self._parse_table_row(row, page_num + 1, row_idx)
                                if transaction:
                                    # Deduplicate
                                    txn_id = self.create_transaction_id(transaction)
                                    if txn_id not in seen_transactions:
                                        seen_transactions.add(txn_id)
                                        transactions.append(transaction)
                    else:
                        # Fallback to text extraction if tables not found
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
            print(f"Error parsing SBI PDF: {e}")
            import traceback
            traceback.print_exc()
        
        return pd.DataFrame(transactions) if transactions else pd.DataFrame()
    
    def parse_excel(self, file_path: Path) -> pd.DataFrame:
        """
        Parse SBI Excel statement.
        
        Args:
            file_path: Path to Excel file
            
        Returns:
            DataFrame of transactions
        """
        transactions = []
        seen_transactions = set()
        
        try:
            # Read Excel file
            df = pd.read_excel(file_path)
            
            # SBI format: Date | Details | Ref No./Cheque No | Debit | Credit | Balance
            for idx, row in df.iterrows():
                transaction = self._parse_excel_row(row, idx)
                if transaction:
                    txn_id = self.create_transaction_id(transaction)
                    if txn_id not in seen_transactions:
                        seen_transactions.add(txn_id)
                        transactions.append(transaction)
        
        except Exception as e:
            print(f"Error parsing SBI Excel: {e}")
            import traceback
            traceback.print_exc()
        
        return pd.DataFrame(transactions) if transactions else pd.DataFrame()
    
    def _parse_table_row(self, row: List, page: int, line: int) -> Optional[Dict]:
        """Parse a table row into a transaction dictionary."""
        if not row or len(row) < 6:
            return None
        
        try:
            # Columns: Date | Details | Ref No. | Debit | Credit | Balance
            date_str = str(row[0]).strip() if row[0] else None
            details = str(row[1]).strip() if row[1] else None
            ref_no = str(row[2]).strip() if row[2] else None
            debit_str = str(row[3]).strip() if row[3] else None
            credit_str = str(row[4]).strip() if row[4] else None
            balance_str = str(row[5]).strip() if row[5] else None
            
            # Skip if no date
            if not date_str or date_str.lower() in ['date', 'none', 'nan', '']:
                return None
            
            # Parse date
            date_iso = self.parse_date(date_str)
            if not date_iso:
                return None
            
            # Parse amounts
            debit = self.parse_amount(debit_str)
            credit = self.parse_amount(credit_str)
            balance = self.parse_amount(balance_str) if balance_str else None
            
            # Skip if no transaction amount
            if debit == 0 and credit == 0:
                return None
            
            # Parse details for additional fields
            metadata = self._extract_metadata(details)
            
            # Extract store and commodity
            store, commodity, clean_description = self.extract_store_and_commodity(details)
            
            # Determine transaction type
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
            # Get values by position or column name
            if len(row) >= 6:
                date_val = row.iloc[0] if pd.notna(row.iloc[0]) else None
                details = str(row.iloc[1]) if pd.notna(row.iloc[1]) else None
                ref_no = str(row.iloc[2]) if pd.notna(row.iloc[2]) else None
                debit_val = row.iloc[3] if pd.notna(row.iloc[3]) else None
                credit_val = row.iloc[4] if pd.notna(row.iloc[4]) else None
                balance_val = row.iloc[5] if pd.notna(row.iloc[5]) else None
            else:
                # Try by column names
                date_val = row.get('Date') or row.get('date')
                details = str(row.get('Details') or row.get('details', ''))
                debit_val = row.get('Debit') or row.get('debit')
                credit_val = row.get('Credit') or row.get('credit')
                balance_val = row.get('Balance') or row.get('balance')
                ref_no = None
            
            if not date_val:
                return None
            
            date_iso = self.parse_date(date_val)
            if not date_iso:
                return None
            
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
            
            # Look for transaction lines with dates
            date_match = re.search(r'(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})', line)
            if not date_match:
                continue
            
            date = date_match.group(1)
            date_iso = self.parse_date(date)
            if not date_iso:
                continue
            
            # Extract amounts
            amount_patterns = [
                r'INR\s*([0-9,]+(?:\.[0-9]{2})?)\s*-\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)',  # Debit
                r'-\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)',  # Credit
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
            
            # Extract description
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
        Extract SBI-specific metadata from transaction details.
        
        Args:
            details: Transaction description text
            
        Returns:
            Dictionary with extracted metadata
        """
        # Normalize text first to fix spacing issues
        if details:
            details = self.normalize_text(details)
        
        metadata = {
            'transactionId': None,
            'personName': None,
            'accountNumber': None,
            'transferType': None,
            'upiId': None
        }
        
        if not details:
            return metadata
        
        # Pattern 1: UPI Credit - TRANSFER FROM [Account] - UPI/CR/[TxnID]/[Name]/SBIN/[UPI Handle]/UPI
        upi_credit_match = re.search(
            r'TRANSFER FROM\s+([\w\s]+?)\s*-\s*UPI/CR/([A-Z0-9]+)/([^/]+?)/SBIN/([^/]+?)/UPI',
            details,
            re.IGNORECASE
        )
        if upi_credit_match:
            metadata['accountNumber'] = upi_credit_match.group(1).strip()
            metadata['transactionId'] = upi_credit_match.group(2).strip()
            metadata['personName'] = upi_credit_match.group(3).strip()
            metadata['upiId'] = upi_credit_match.group(4).strip()
            metadata['transferType'] = 'UPI/CR'
            return metadata
        
        # Pattern 2: UPI Debit - TRANSFER TO [Account]. UPI/DR/[TxnID]/[Name]/SBIN/[UPI Handle]/Payme
        upi_debit_match = re.search(
            r'TRANSFER TO\s+([\w\s]+?)\s*\.\s*UPI/DR/([A-Z0-9]+)/([^/]+?)/SBIN/([^/]+?)/Payme',
            details,
            re.IGNORECASE
        )
        if upi_debit_match:
            metadata['accountNumber'] = upi_debit_match.group(1).strip()
            metadata['transactionId'] = upi_debit_match.group(2).strip()
            metadata['personName'] = upi_debit_match.group(3).strip()
            metadata['upiId'] = upi_debit_match.group(4).strip()
            metadata['transferType'] = 'UPI/DR'
            return metadata
        
        # Pattern 3: ATM Withdrawal - - ATM CASH [ID] +SBI [Branch], [City]
        atm_match = re.search(
            r'ATM CASH\s+([A-Z0-9]+)\s+\+?\s*SBI\s+([^,]+),\s*([^,]+)',
            details,
            re.IGNORECASE
        )
        if atm_match:
            metadata['transactionId'] = atm_match.group(1).strip()
            metadata['branch'] = atm_match.group(2).strip()
            metadata['transferType'] = 'ATM'
            return metadata
        
        # Pattern 4: Generic UPI pattern with SBIN
        generic_upi = re.search(
            r'UPI/([A-Z]+)/([A-Z0-9]+)/([^/]+?)/(SBIN|SBI)/([^/\s]+)',
            details,
            re.IGNORECASE
        )
        if generic_upi:
            metadata['transferType'] = f"UPI/{generic_upi.group(1)}"
            metadata['transactionId'] = generic_upi.group(2).strip()
            metadata['personName'] = generic_upi.group(3).strip()
            metadata['upiId'] = generic_upi.group(5).strip()
            return metadata
        
        return metadata

