"""
Kotak Mahindra Bank (KKBK) Parser V2
=====================================
Parser for Kotak Bank statements with separate DEBIT/CREDIT columns format.
Format: Date | Transaction Details | Cheque/Reference# | Debit | Credit | Balance
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


class KotakBankParserV2(BaseBankParser):
    """Parser for Kotak Bank Type 2 statements (separate Debit/Credit columns)."""
    
    def __init__(self):
        """Initialize Kotak Bank Type 2 parser."""
        super().__init__('KKBK')
    
    def parse_pdf(self, pdf_path: Path) -> pd.DataFrame:
        """
        Parse Kotak Bank PDF statement using table extraction.
        
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
                            
                            # Look for transaction rows
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
            print(f"Error parsing Kotak Bank V2 PDF: {e}")
            import traceback
            traceback.print_exc()
        
        return pd.DataFrame(transactions) if transactions else pd.DataFrame()
    

    
    def _parse_table_row(self, row: List, page: int, line: int) -> Optional[Dict]:
        """
        Parse a table row into a transaction dictionary.
        
        Kotak Type 2 format:
        - Column 0: DATE
        - Column 1: TRANSACTION DETAILS
        - Column 2: CHEQUE/REFERENCE#
        - Column 3: DEBIT
        - Column 4: CREDIT
        - Column 5: BALANCE
        """
        if not row or len(row) < 3:
            return None
        
        try:
            # Find columns by content or position
            date_str = None
            narration = None
            ref_no = None
            debit_str = None
            credit_str = None
            balance_str = None
            
            # Look for date in first column
            if row[0] and str(row[0]).strip():
                cell_str = str(row[0]).strip()
                # Check if this looks like a date (DD MMM, YYYY format for Kotak Type 2)
                if re.match(r'\d{1,2}\s+[A-Za-z]{3,},\s*\d{4}', cell_str):
                    date_str = cell_str
            
            # Use position-based parsing if we have enough columns
            if len(row) >= 6:
                if not date_str:
                    date_str = str(row[0]).strip() if row[0] else None
                narration = str(row[1]).strip() if row[1] else None
                ref_no = str(row[2]).strip() if row[2] else None
                debit_str = str(row[3]).strip() if row[3] else None
                credit_str = str(row[4]).strip() if row[4] else None
                balance_str = str(row[5]).strip() if row[5] else None
            elif len(row) >= 5:
                # Some rows might have missing columns
                if not date_str:
                    date_str = str(row[0]).strip() if row[0] else None
                narration = str(row[1]).strip() if row[1] else None
                ref_no = str(row[2]).strip() if row[2] else None
                debit_str = str(row[3]).strip() if row[3] else None
                credit_str = str(row[4]).strip() if row[4] else None
            
            # Skip if no date
            if not date_str or date_str.lower() in ['date', 'none', 'nan', '', 'closing']:
                return None
            
            # Skip header rows
            if date_str.lower() == 'date' and 'transaction' in (narration or '').lower():
                return None
            
            # Parse date (Kotak Type 2 uses "DD MMM, YYYY" format, e.g., "01 Sep, 2025")
            date_iso = self._parse_kotak_date_v2(date_str)
            if not date_iso:
                return None
            
            # Parse debit and credit amounts
            debit = 0.0
            credit = 0.0
            
            # Debit amount (may have - prefix or empty)
            if debit_str and debit_str.lower() not in ['debit', 'none', 'nan', '']:
                debit = abs(self.parse_amount(debit_str, allow_negative=True))
            
            # Credit amount (may have + prefix or empty)
            if credit_str and credit_str.lower() not in ['credit', 'none', 'nan', '']:
                credit = abs(self.parse_amount(credit_str))
            
            # Skip if no transaction amount
            if debit == 0 and credit == 0:
                return None
            
            # Parse balance
            balance = None
            if balance_str and balance_str.lower() not in ['balance', 'none', 'nan', '']:
                balance = self.parse_amount(balance_str)
            
            # Extract metadata from narration
            metadata = self._extract_metadata(narration or '')
            
            # Extract store and commodity
            store, commodity, clean_description = self.extract_store_and_commodity(narration or '')
            
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
                'description': clean_description or narration,
                'raw': narration,
                'amount': amount,
                'type': transaction_type,
                'debit': debit,
                'credit': credit,
                'balance': balance,
                'page': f'Page {page}',
                'line': str(line),
                'store': store,
                'commodity': commodity,
                'reference': ref_no,
                **metadata
            }
            
            return self.normalize_transaction(transaction)
        
        except Exception as e:
            print(f"Error parsing table row: {e}")
            return None
    

    
    def _parse_text_lines(self, text: str) -> List[Dict]:
        """Parse text lines as fallback when tables not detected."""
        transactions = []
        lines = text.split('\n')
        
        for line_num, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Look for transaction lines with dates (DD MMM, YYYY format)
            date_match = re.search(r'(\d{1,2}\s+[A-Za-z]{3,},\s*\d{4})', line)
            if not date_match:
                continue
            
            date_str = date_match.group(1)
            date_iso = self._parse_kotak_date_v2(date_str)
            if not date_iso:
                continue
            
            # Extract debit and credit amounts
            debit_match = re.search(r'-([0-9,]+\.?\d{0,2})', line)
            credit_match = re.search(r'\+([0-9,]+\.?\d{0,2})', line)
            
            debit = 0.0
            credit = 0.0
            
            if debit_match:
                debit = float(debit_match.group(1).replace(',', ''))
            elif credit_match:
                credit = float(credit_match.group(1).replace(',', ''))
            else:
                continue
            
            # Extract balance
            balance_match = re.search(r'\b([0-9,]+\.?\d{2})\s*(?:C|D)?$', line)
            balance = None
            if balance_match:
                balance = float(balance_match.group(1).replace(',', ''))
            
            # Extract description (remove date, amounts, and ref numbers)
            description = line
            description = re.sub(r'\d{1,2}\s+[A-Za-z]{3,},\s*\d{4}', '', description)  # Remove date
            description = re.sub(r'[-+]([0-9,]+\.?\d{0,2})', '', description)  # Remove amounts
            description = re.sub(r'UPI-\d+', '', description)  # Remove UPI ref numbers
            description = re.sub(r'\s+', ' ', description).strip()
            
            metadata = self._extract_metadata(description)
            store, commodity, clean_desc = self.extract_store_and_commodity(description)
            
            transaction = {
                'date': date_str,
                'date_iso': date_iso,
                'description': clean_desc or description,
                'raw': description,
                'amount': debit if debit > 0 else credit,
                'type': 'expense' if debit > 0 else 'income',
                'debit': debit,
                'credit': credit,
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
        Extract Kotak Bank-specific metadata from transaction details.
        
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
        
        # Pattern 1: UPI transactions - UPI/[Entity]/[TxnID]/[Name]/...
        upi_match = re.search(
            r'UPI/([^/]+)/([0-9]+)/([^/\n]+)',
            details,
            re.IGNORECASE
        )
        if upi_match:
            metadata['transferType'] = 'UPI'
            metadata['personName'] = upi_match.group(3).strip()
            metadata['transactionId'] = upi_match.group(2).strip()
            metadata['upiId'] = upi_match.group(1).strip()
            return metadata
        
        # Pattern 2: UPI with reference number in format UPI-XXXXXXXX
        upi_ref_match = re.search(
            r'UPI-([0-9]+)',
            details,
            re.IGNORECASE
        )
        if upi_ref_match:
            metadata['transferType'] = 'UPI'
            metadata['transactionId'] = upi_ref_match.group(1).strip()
        
        # Pattern 3: MB (Mobile Banking) transactions
        mb_match = re.search(
            r'MB[:\s]+([^/\n]+)',
            details,
            re.IGNORECASE
        )
        if mb_match:
            metadata['transferType'] = 'MB'
            metadata['personName'] = mb_match.group(1).strip()
        
        # Pattern 4: NEFT/RTGS/IMPS patterns
        transfer_match = re.search(
            r'(NEFT|RTGS|IMPS)[^\d]*(\d+)',
            details,
            re.IGNORECASE
        )
        if transfer_match:
            metadata['transferType'] = transfer_match.group(1).upper()
            metadata['transactionId'] = transfer_match.group(2).strip()
        
        return metadata
    
    def _parse_kotak_date_v2(self, date_str: str) -> Optional[str]:
        """
        Parse Kotak Bank V2 date format (DD MMM, YYYY).
        
        Args:
            date_str: Date string in DD MMM, YYYY format (e.g., "01 Sep, 2025")
            
        Returns:
            ISO formatted date string (YYYY-MM-DD) or None
        """
        if not date_str or pd.isna(date_str):
            return None
        
        try:
            # Kotak Type 2 format: "DD MMM, YYYY" (e.g., "01 Sep, 2025")
            parsed = pd.to_datetime(date_str, format='%d %b, %Y', errors='coerce')
            if pd.isna(parsed):
                # Try alternative parsing without comma
                parsed = pd.to_datetime(date_str, format='%d %b %Y', errors='coerce')
            if pd.isna(parsed):
                # Fallback to flexible parsing
                parsed = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
            if pd.isna(parsed):
                return None
            return parsed.strftime('%Y-%m-%d')
        except:
            return None

