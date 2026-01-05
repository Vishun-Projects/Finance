"""
State Bank of Maharashtra (SBM/MAHB) Parser
==========================================
Parser for State Bank of Maharashtra bank statements with table extraction.
Format: Sr No | Date | Particulars | Cheque/Reference No | Debit | Credit | Balance | Channel
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


class SBMParser(BaseBankParser):
    """Parser for State Bank of Maharashtra statements."""
    
    def __init__(self):
        """Initialize SBM parser."""
        super().__init__('MAHB')
    
    def parse_pdf(self, pdf_path: Path) -> pd.DataFrame:
        """
        Parse SBM PDF statement using table extraction.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            DataFrame of transactions
        """
        transactions = []
        seen_transactions = set()
        
        try:
            with pdfplumber.open(str(pdf_path)) as pdf:
                header_found = False
                previous_date_iso = None  # Track previous date for chronological validation
                
                for page_num, page in enumerate(pdf.pages):
                    # Extract tables from page
                    tables = page.extract_tables()
                    
                    if tables:
                        # Find transaction table
                        transaction_table = None
                        start_idx = 0  # Row index to start processing from
                        
                        for table in tables:
                            if table and len(table) > 0:
                                # Check if first row contains transaction headers
                                first_row = [str(cell).strip().lower() if cell else '' for cell in table[0]]
                                first_row_text = ' '.join(first_row)
                                
                                if 'sr no' in first_row_text and 'date' in first_row_text and 'particulars' in first_row_text:
                                    # This is the header row - skip it when processing
                                    transaction_table = table
                                    header_found = True
                                    start_idx = 1
                                    break
                                elif header_found:
                                    # Header was found on a previous page, this is continuation
                                    # Check if first row looks like a transaction (numeric sr_no and date)
                                    first_cell = str(table[0][0]).strip() if table[0] and table[0][0] else ''
                                    second_cell = str(table[0][1]).strip() if table[0] and len(table[0]) > 1 and table[0][1] else ''
                                    
                                    # Check if first cell is numeric (sr_no) and second is date-like
                                    if first_cell.isdigit() and re.match(r'\d{2}/\d{2}/\d{4}', second_cell):
                                        transaction_table = table
                                        start_idx = 0  # No header row, start from first row
                                        break
                        
                        if transaction_table:
                            # Process transaction rows (skip header row if present)
                            for row_idx, row in enumerate(transaction_table[start_idx:], start=start_idx + 1):
                                if not row or len(row) < 6:
                                    continue
                                
                                transaction = self._parse_table_row(row, page_num + 1, row_idx, previous_date_iso)
                                if transaction:
                                    # Update previous date for next transaction
                                    if transaction.get('date_iso'):
                                        previous_date_iso = transaction['date_iso']
                                    
                                    # Deduplicate
                                    txn_id = self.create_transaction_id(transaction)
                                    if txn_id not in seen_transactions:
                                        seen_transactions.add(txn_id)
                                        transactions.append(transaction)
                    else:
                        # Fallback to text extraction if tables not found
                        text = page.extract_text()
                        if text:
                            rows = self._parse_text_lines(text, page_num + 1)
                            for transaction in rows:
                                if transaction:
                                    txn_id = self.create_transaction_id(transaction)
                                    if txn_id not in seen_transactions:
                                        seen_transactions.add(txn_id)
                                        transactions.append(transaction)
        
        except Exception as e:
            print(f"Error parsing SBM PDF: {e}")
            import traceback
            traceback.print_exc()
        
        return pd.DataFrame(transactions) if transactions else pd.DataFrame()
    

    
    def _parse_table_row(self, row: List, page: int, line: int, previous_date_iso: Optional[str] = None) -> Optional[Dict]:
        """Parse a table row into a transaction dictionary."""
        if not row or len(row) < 6:
            return None
        
        try:
            # Columns: Sr No | Date | Particulars | Cheque/Reference No | Debit | Credit | Balance | Channel
            sr_no = str(row[0]).strip() if row[0] else None
            date_str = str(row[1]).strip() if row[1] else None
            particulars = str(row[2]).strip() if row[2] else None
            ref_no = str(row[3]).strip() if row[3] else None
            debit_str = str(row[4]).strip() if row[4] else None
            credit_str = str(row[5]).strip() if row[5] else None
            balance_str = str(row[6]).strip() if row[6] else None
            channel = str(row[7]).strip() if len(row) > 7 and row[7] else None
            
            # Skip if no date or if it's a header row
            if not date_str or date_str.lower() in ['date', 'none', 'nan', '', 'sr no']:
                return None
            
            # Skip if sr_no is not numeric (likely a header or footer)
            try:
                int(sr_no) if sr_no else None
            except (ValueError, TypeError):
                return None
            
            # Parse date (DD/MM/YYYY format) using strict validator with chronological check
            date_iso = self.parse_date(date_str, previous_date=previous_date_iso)
            if not date_iso:
                return None
            
            # Clean particulars - handle newlines
            if particulars:
                particulars = re.sub(r'\s+', ' ', particulars).strip()
            
            # Parse amounts
            debit = self.parse_amount(debit_str) if debit_str and debit_str != '-' else 0
            credit = self.parse_amount(credit_str) if credit_str and credit_str != '-' else 0
            balance = self.parse_amount(balance_str) if balance_str else None
            
            # Skip if no transaction amount
            if debit == 0 and credit == 0:
                return None
            
            # Extract metadata from particulars
            metadata = self._extract_metadata(particulars, ref_no, channel)
            
            # Extract store and commodity
            store, commodity, clean_description = self.extract_store_and_commodity(particulars or '')
            
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
                'description': clean_description or particulars or '',
                'raw': particulars or '',
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
                'channel': channel,
                **metadata
            }
            
            return self.normalize_transaction(transaction)
        
        except Exception as e:
            print(f"Error parsing table row: {e}")
            return None
    

    
    def _parse_text_lines(self, text: str, page_num: int) -> List[Dict]:
        """Parse text lines as fallback when tables not detected."""
        transactions = []
        lines = text.split('\n')
        
        # Look for transaction lines with dates in DD/MM/YYYY format
        for line_num, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Look for date pattern DD/MM/YYYY
            date_match = re.search(r'(\d{2}/\d{2}/\d{4})', line)
            if not date_match:
                continue
            
            date = date_match.group(1)
            date_iso = self.parse_date(date)
            if not date_iso:
                continue
            
            # Extract amounts - look for debit/credit pattern
            amount_patterns = [
                r'([0-9,]+\.\d{2})\s+-\s+([0-9,]+\.\d{2})',  # Debit format
                r'-\s+([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})',  # Credit format
            ]
            
            transaction_amount = None
            balance = None
            is_credit = False
            
            for pattern in amount_patterns:
                match = re.search(pattern, line)
                if match:
                    if pattern.startswith('([0-9'):
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
            description = re.sub(r'\d{2}/\d{2}/\d{4}', '', description)
            description = re.sub(r'[0-9,]+\.[0-9]{2}', '', description)
            description = re.sub(r'[+-]', '', description)
            description = re.sub(r'\s{2,}', ' ', description).strip()
            
            metadata = self._extract_metadata(description, None, None)
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
                'page': f'Page {page_num}',
                'line': str(line_num + 1),
                'store': store,
                'commodity': commodity,
                **metadata
            }
            
            transactions.append(self.normalize_transaction(transaction))
        
        return transactions
    
    
    def _extract_metadata(self, particulars: str, ref_no: Optional[str], channel: Optional[str]) -> Dict:
        """
        Extract SBM-specific metadata from transaction details.
        
        Args:
            particulars: Transaction particulars/description
            ref_no: Cheque/Reference number
            channel: Transaction channel
            
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
        
        if not particulars:
            if ref_no:
                metadata['transactionId'] = ref_no
            return metadata
        
        # Set reference number as transaction ID if available
        if ref_no and ref_no.strip() and ref_no.strip() != '-':
            metadata['transactionId'] = ref_no.strip()
        
        # Pattern 1: UPI transactions
        # Format: UPI <ref>/<bank_code>/<merchant>/...
        upi_match = re.search(
            r'UPI\s+([A-Z0-9]+)/([A-Z0-9]+)/([^/\n]+)',
            particulars,
            re.IGNORECASE
        )
        if upi_match:
            metadata['transactionId'] = upi_match.group(1).strip()
            bank_code = upi_match.group(2).strip()
            merchant = upi_match.group(3).strip()
            metadata['transferType'] = 'UPI'
            
            # Extract UPI ID if present in merchant name
            upi_id_match = re.search(r'@([a-z0-9]+)', merchant, re.IGNORECASE)
            if upi_id_match:
                metadata['upiId'] = upi_id_match.group(1).strip()
            
            # Try to extract person name from merchant field
            if merchant and not merchant.startswith('NO REMARKS'):
                metadata['personName'] = merchant.split('/')[0].strip()
            
            return metadata
        
        # Pattern 2: NEFT/RTGS transactions
        neft_match = re.search(
            r'(NEFT|RTGS)\s+([A-Z0-9]+)',
            particulars,
            re.IGNORECASE
        )
        if neft_match:
            txn_type = neft_match.group(1).strip().upper()
            ref = neft_match.group(2).strip()
            metadata['transferType'] = txn_type
            metadata['transactionId'] = ref
            
            # Extract payee name if present
            payee_match = re.search(
                r'(?:NEFT|RTGS)[^\n]*\n([^\n]+)',
                particulars,
                re.IGNORECASE
            )
            if payee_match:
                payee = payee_match.group(1).strip()
                if payee and not payee.startswith('SBIN') and not payee.startswith('MAHB'):
                    metadata['personName'] = payee
            
            return metadata
        
        # Pattern 3: IMPS transactions
        imps_match = re.search(
            r'IMPS\s+([A-Z0-9]+)',
            particulars,
            re.IGNORECASE
        )
        if imps_match:
            metadata['transferType'] = 'IMPS'
            metadata['transactionId'] = imps_match.group(1).strip()
            return metadata
        
        # Pattern 4: ATM transactions
        atm_match = re.search(
            r'ATM\s+(?:CASH|WITHDRAWAL|DEPOSIT)',
            particulars,
            re.IGNORECASE
        )
        if atm_match:
            metadata['transferType'] = 'ATM'
            return metadata
        
        # Set channel as transfer type if not found
        if channel and not metadata['transferType']:
            metadata['transferType'] = channel
        
        return metadata

