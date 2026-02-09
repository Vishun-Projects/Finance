"""
Kotak Mahindra Bank (KKBK) Parser
===================================
Parser for Kotak Bank statements with combined Dr/Cr column format.
Format: Date | Narration | Chq/Ref No | Withdrawal(Dr)/Deposit(Cr) | Balance
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


class KotakBankParser(BaseBankParser):
    """Parser for Kotak Bank statements."""
    
    def __init__(self):
        """Initialize Kotak Bank parser."""
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
                                if not row or len(row) < 5:
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
            print(f"Error parsing Kotak Bank PDF: {e}")
            import traceback
            traceback.print_exc()
        
        return pd.DataFrame(transactions) if transactions else pd.DataFrame()
    
    def parse_excel(self, file_path: Path) -> pd.DataFrame:
        """
        Parse Kotak Bank Excel statement.
        
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
            
            # Kotak format: Date | Narration | Chq/Ref No | Withdrawal(Dr)/Deposit(Cr) | Balance
            for idx, row in df.iterrows():
                transaction = self._parse_excel_row(row, idx)
                if transaction:
                    txn_id = self.create_transaction_id(transaction)
                    if txn_id not in seen_transactions:
                        seen_transactions.add(txn_id)
                        transactions.append(transaction)
        
        except Exception as e:
            print(f"Error parsing Kotak Bank Excel: {e}")
            import traceback
            traceback.print_exc()
        
        return pd.DataFrame(transactions) if transactions else pd.DataFrame()
    
    def _parse_table_row(self, row: List, page: int, line: int) -> Optional[Dict]:
        """
        Parse a table row into a transaction dictionary.
        
        Kotak format:
        - Column 0: Date
        - Column 1: Narration
        - Column 2: Chq/Ref No
        - Column 3: Withdrawal(Dr)/Deposit(Cr) (amount with Dr/Cr suffix)
        - Column 4: Balance (with Cr/Dr suffix)
        """
        if not row or len(row) < 3:
            return None
        
        try:
            # Find columns by content (more flexible than fixed positions)
            date_str = None
            narration = None
            ref_no = None
            amount_with_type = None
            balance_with_type = None
            
            # Look for date in first few columns
            for i, cell in enumerate(row[:5]):
                cell_str = str(cell).strip() if cell else ''
                if not cell_str or cell_str.lower() in ['none', 'nan', '']:
                    continue
                
                # Check if this looks like a date (DD-MM-YYYY or DD/MM/YYYY)
                if re.match(r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}', cell_str) and not date_str:
                    date_str = cell_str
                    continue
                
                # Check if this looks like an amount with Dr/Cr suffix
                if re.search(r'[0-9,]+(?:\.[0-9]{2})?\s*\((?:Dr|Cr)\)', cell_str, re.IGNORECASE):
                    if not amount_with_type:
                        amount_with_type = cell_str
                    elif not balance_with_type:
                        balance_with_type = cell_str
                    continue
                
                # Check if this looks like a UPI reference number
                if re.match(r'UPI-[\d]+', cell_str, re.IGNORECASE) and not ref_no:
                    ref_no = cell_str
                    continue
                
                # If it's a long text, it's probably narration
                if len(cell_str) > 10 and not narration and 'date' not in cell_str.lower() and 'narration' not in cell_str.lower():
                    narration = cell_str
            
            # Fallback to position-based if content-based didn't work
            if not date_str and len(row) >= 1:
                date_str = str(row[0]).strip() if row[0] else None
            if not narration and len(row) >= 2:
                narration = str(row[1]).strip() if row[1] else None
            if not ref_no and len(row) >= 3:
                ref_no = str(row[2]).strip() if row[2] else None
            if not amount_with_type and len(row) >= 4:
                amount_with_type = str(row[3]).strip() if row[3] else None
            if not balance_with_type and len(row) >= 5:
                balance_with_type = str(row[4]).strip() if row[4] else None
            
            # Skip if no date
            if not date_str or date_str.lower() in ['date', 'none', 'nan', '']:
                return None
            
            # Skip header rows
            if 'date' in date_str.lower() and 'narration' in (narration or '').lower():
                return None
            
            # Parse date (Kotak uses DD-MM-YYYY format)
            date_iso = self._parse_kotak_date(date_str)
            if not date_iso:
                return None
            
            # Parse amount with Dr/Cr indicator
            # Format: 4,766.77(Dr) or 190.00(Cr)
            debit = 0.0
            credit = 0.0
            
            if amount_with_type:
                # Extract amount and type from format like "4,766.77(Dr)" or "190.00(Cr)"
                amount_match = re.search(r'([0-9,]+(?:\.[0-9]{2})?)\s*\((Dr|Cr)\)', amount_with_type, re.IGNORECASE)
                if amount_match:
                    amount_str = amount_match.group(1).replace(',', '')
                    amount_type = amount_match.group(2).upper()
                    amount_value = float(amount_str)
                    
                    if amount_type == 'DR':
                        debit = amount_value
                    elif amount_type == 'CR':
                        credit = amount_value
                else:
                    # Try to parse without suffix (fallback)
                    amount_value = self.parse_amount(amount_with_type)
                    # Check if narration or other fields indicate type
                    if narration and ('debit' in narration.lower() or 'withdrawal' in narration.lower()):
                        debit = amount_value
                    else:
                        credit = amount_value
            
            # Skip if no transaction amount
            if debit == 0 and credit == 0:
                return None
            
            # Parse balance (may also have Cr/Dr suffix)
            balance = None
            if balance_with_type:
                # Extract balance amount, ignore Cr/Dr suffix
                balance_match = re.search(r'([0-9,]+(?:\.[0-9]{2})?)\s*(?:\((?:Dr|Cr)\))?', balance_with_type, re.IGNORECASE)
                if balance_match:
                    balance_str = balance_match.group(1).replace(',', '')
                    balance = float(balance_str)
                else:
                    balance = self.parse_amount(balance_with_type)
            
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
    
    def _parse_excel_row(self, row: pd.Series, idx: int) -> Optional[Dict]:
        """Parse an Excel row into a transaction dictionary."""
        try:
            # Get values by position or column name
            if len(row) >= 5:
                date_val = row.iloc[0] if pd.notna(row.iloc[0]) else None
                narration = str(row.iloc[1]) if pd.notna(row.iloc[1]) else None
                ref_no = str(row.iloc[2]) if pd.notna(row.iloc[2]) else None
                amount_with_type = str(row.iloc[3]) if pd.notna(row.iloc[3]) else None
                balance_with_type = str(row.iloc[4]) if pd.notna(row.iloc[4]) else None
            else:
                # Try by column names
                date_val = row.get('Date') or row.get('date') or row.get('DATE')
                narration = str(row.get('Narration') or row.get('narration') or row.get('NARRATION') or '')
                ref_no = str(row.get('Chq/Ref No') or row.get('Ref No') or row.get('Reference') or '')
                
                # Look for amount column (may have different names)
                amount_with_type = None
                for col in row.index:
                    col_lower = str(col).lower()
                    if 'withdrawal' in col_lower or 'deposit' in col_lower or 'dr' in col_lower or 'cr' in col_lower:
                        amount_with_type = str(row[col])
                        break
                
                balance_with_type = None
                for col in row.index:
                    col_lower = str(col).lower()
                    if 'balance' in col_lower or 'bal' in col_lower:
                        balance_with_type = str(row[col])
                        break
            
            if not date_val:
                return None
            
            date_iso = self._parse_kotak_date(date_val)
            if not date_iso:
                return None
            
            # Parse amount with Dr/Cr indicator
            debit = 0.0
            credit = 0.0
            
            if amount_with_type:
                amount_match = re.search(r'([0-9,]+(?:\.[0-9]{2})?)\s*\((Dr|Cr)\)', str(amount_with_type), re.IGNORECASE)
                if amount_match:
                    amount_str = amount_match.group(1).replace(',', '')
                    amount_type = amount_match.group(2).upper()
                    amount_value = float(amount_str)
                    
                    if amount_type == 'DR':
                        debit = amount_value
                    elif amount_type == 'CR':
                        credit = amount_value
                else:
                    # Fallback: try to parse as regular amount
                    amount_value = self.parse_amount(amount_with_type)
                    if narration and ('debit' in str(narration).lower() or 'withdrawal' in str(narration).lower()):
                        debit = amount_value
                    else:
                        credit = amount_value
            
            if debit == 0 and credit == 0:
                return None
            
            # Parse balance
            balance = None
            if balance_with_type:
                balance_match = re.search(r'([0-9,]+(?:\.[0-9]{2})?)\s*(?:\((?:Dr|Cr)\))?', str(balance_with_type), re.IGNORECASE)
                if balance_match:
                    balance_str = balance_match.group(1).replace(',', '')
                    balance = float(balance_str)
                else:
                    balance = self.parse_amount(balance_with_type)
            
            metadata = self._extract_metadata(narration if narration else '')
            store, commodity, clean_desc = self.extract_store_and_commodity(narration if narration else '')
            
            transaction = {
                'date': str(date_val),
                'date_iso': date_iso,
                'description': clean_desc or narration,
                'raw': narration,
                'amount': debit if debit > 0 else credit,
                'type': 'expense' if debit > 0 else 'income',
                'debit': debit,
                'credit': credit,
                'balance': balance,
                'page': 'Excel',
                'line': str(idx + 1),
                'store': store,
                'commodity': commodity,
                'reference': ref_no,
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
            # Format: Date Narration Ref No Amount(Dr/Cr) Balance(Cr/Dr)
            date_match = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', line)
            if not date_match:
                continue
            
            date_str = date_match.group(1)
            date_iso = self._parse_kotak_date(date_str)
            if not date_iso:
                continue
            
            # Extract amount with Dr/Cr suffix
            amount_match = re.search(r'([0-9,]+(?:\.[0-9]{2})?)\s*\((Dr|Cr)\)', line, re.IGNORECASE)
            if not amount_match:
                continue
            
            amount_str = amount_match.group(1).replace(',', '')
            amount_type = amount_match.group(2).upper()
            amount_value = float(amount_str)
            
            debit = amount_value if amount_type == 'DR' else 0.0
            credit = amount_value if amount_type == 'CR' else 0.0
            
            # Extract balance
            balance_match = re.search(r'([0-9,]+(?:\.[0-9]{2})?)\s*\((?:Dr|Cr)\)', line, re.IGNORECASE)
            balance = None
            if balance_match:
                balance_str = balance_match.group(1).replace(',', '')
                balance = float(balance_str)
            
            # Extract description (remove date, amounts, and ref numbers)
            description = line
            description = re.sub(r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}', '', description)  # Remove date
            description = re.sub(r'([0-9,]+(?:\.[0-9]{2})?)\s*\((?:Dr|Cr)\)', '', description)  # Remove amounts
            description = re.sub(r'UPI-\d+', '', description)  # Remove UPI ref numbers
            description = re.sub(r'\s+', ' ', description).strip()
            
            metadata = self._extract_metadata(description)
            store, commodity, clean_desc = self.extract_store_and_commodity(description)
            
            transaction = {
                'date': date_str,
                'date_iso': date_iso,
                'description': clean_desc or description,
                'raw': description,
                'amount': amount_value,
                'type': 'income' if amount_type == 'CR' else 'expense',
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
        
        # Pattern 1: UPI transactions - UPI/[Entity]/[TxnID]/[Name]/UPI
        # Example: UPI/CAPITALFLOAT/518288963974/Request from Am
        upi_match = re.search(
            r'UPI/([^/]+)/([0-9]+)/([^/]+)',
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
        
        # Pattern 3: Generic UPI pattern with KKBK
        generic_upi = re.search(
            r'UPI/([A-Z]+)/([A-Z0-9]+)/([^/]+?)/(KKBK)/([^/\s]+)',
            details,
            re.IGNORECASE
        )
        if generic_upi:
            metadata['transferType'] = f"UPI/{generic_upi.group(1)}"
            metadata['transactionId'] = generic_upi.group(2).strip()
            metadata['personName'] = generic_upi.group(3).strip()
            metadata['upiId'] = generic_upi.group(5).strip()
            return metadata
        
        # Pattern 4: NEFT/RTGS patterns
        neft_match = re.search(
            r'(NEFT|RTGS)[/\s]+([A-Z0-9]+)[/\s]+([^/]+)',
            details,
            re.IGNORECASE
        )
        if neft_match:
            metadata['transferType'] = neft_match.group(1).upper()
            metadata['transactionId'] = neft_match.group(2).strip()
            metadata['personName'] = neft_match.group(3).strip()
            return metadata
        
        return metadata
    
    def _parse_kotak_date(self, date_str: str) -> Optional[str]:
        """
        Parse Kotak Bank date format (DD-MM-YYYY or DD/MM/YYYY).
        
        Args:
            date_str: Date string in DD-MM-YYYY format
            
        Returns:
            ISO formatted date string (YYYY-MM-DD) or None
        """
        if not date_str or pd.isna(date_str):
            return None
        
        try:
            # Try DD-MM-YYYY or DD/MM/YYYY format first (dayfirst=True)
            parsed = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
            if pd.isna(parsed):
                # Fallback to regular parsing
                parsed = pd.to_datetime(date_str, errors='coerce')
            if pd.isna(parsed):
                return None
            return parsed.strftime('%Y-%m-%d')
        except:
            return None

