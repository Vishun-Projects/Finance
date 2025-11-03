"""
HDFC Bank Parser
================
Parser for HDFC Bank statements using text extraction.
Format: Date | Narration | Chq/Ref | ValueDt | WithdrawalAmt | DepositAmt | ClosingBalance

Key characteristics:
- Only ONE of WithdrawalAmt or DepositAmt is populated per transaction
- Multi-line narrations span multiple lines in text extraction
- Determine debit/credit by comparing balance changes
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


class HDFCBankParser(BaseBankParser):
    """Parser for HDFC Bank statements."""
    
    def __init__(self):
        """Initialize HDFC Bank parser."""
        super().__init__('HDFC')
    
    def parse_pdf(self, pdf_path: Path) -> pd.DataFrame:
        """
        Parse HDFC Bank PDF statement using text extraction.
        
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
            print(f"Error parsing HDFC PDF: {e}")
            import traceback
            traceback.print_exc()
        
        return pd.DataFrame(transactions) if transactions else pd.DataFrame()
    
    def parse_excel(self, file_path: Path) -> pd.DataFrame:
        """
        Parse HDFC Excel statement.
        
        Args:
            file_path: Path to Excel file
            
        Returns:
            DataFrame of transactions
        """
        transactions = []
        seen_transactions = set()
        
        try:
            df = pd.read_excel(file_path)
            
            # HDFC format: Date | Narration | Chq/Ref | ValueDt | WithdrawalAmt | DepositAmt | ClosingBalance
            for idx, row in df.iterrows():
                transaction = self._parse_excel_row(row, 1, idx)
                if transaction:
                    txn_id = self.create_transaction_id(transaction)
                    if txn_id not in seen_transactions:
                        seen_transactions.add(txn_id)
                        transactions.append(transaction)
        
        except Exception as e:
            print(f"Error parsing HDFC Excel: {e}")
            import traceback
            traceback.print_exc()
        
        return pd.DataFrame(transactions) if transactions else pd.DataFrame()
    
    def _parse_text_lines(self, text: str, page_num: int) -> List[Dict]:
        """
        Parse HDFC Bank text format.
        
        HDFC format: Each transaction starts with a date (DD/MM/YY)
        - First line: Date Narration Chq/Ref No ValueDt Amount Balance
        - Following lines: Continuation of narration (indented)
        - Determine debit/credit by balance changes
        """
        transactions = []
        lines = text.split('\n')
        
        i = 0
        prev_balance = None
        
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue
            
            # Look for date at the start of line (DD/MM/YY format)
            date_match = re.match(r'(\d{2}/\d{2}/\d{2})', line)
            if not date_match:
                i += 1
                continue
            
            date_str = date_match.group(1)
            date_iso = self._parse_hdfc_date(date_str)
            if not date_iso:
                i += 1
                continue
            
            # Try to match transaction line pattern
            # Format: Date Narration Ref ValueDt Amount Balance
            txn_match = re.search(r'^(\d{2}/\d{2}/\d{2})\s+(.+?)\s+(\d{13,})\s+(\d{2}/\d{2}/\d{2})\s+([0-9,]+\.[0-9]{2})\s+([0-9,]+\.[0-9]{2})$', line)
            
            if txn_match:
                # This is a transaction line
                date_str, narration, ref, value_dt, amount_str, balance_str = txn_match.groups()
                
                # Parse amounts
                amount = self.parse_amount(amount_str)
                balance = self.parse_amount(balance_str)
                
                # Determine if it's withdrawal or deposit by comparing with previous balance
                withdrawal = 0
                deposit = 0
                
                if prev_balance is not None:
                    if balance < prev_balance:
                        # Balance decreased, it's a withdrawal
                        withdrawal = amount
                    elif balance > prev_balance:
                        # Balance increased, it's a deposit
                        deposit = amount
                    else:
                        # Balance unchanged (unusual), try to infer from amount size
                        # Large amounts are typically deposits, small are withdrawals
                        if amount > balance * 0.5:
                            deposit = amount
                        else:
                            withdrawal = amount
                else:
                    # First transaction on page, can't compare
                    # Infer from amount size or skip
                    if amount > 1000:  # Large amount likely deposit
                        deposit = amount
                    else:
                        withdrawal = amount
                
                # Skip if no valid transaction
                if withdrawal == 0 and deposit == 0:
                    i += 1
                    continue
                
                # Collect continuation lines for narration
                narration_lines = [narration]
                i += 1
                while i < len(lines):
                    next_line = lines[i].strip()
                    # Stop if next line is empty or starts with date or page marker
                    if not next_line or re.match(r'\d{2}/\d{2}/\d{2}', next_line) or next_line.startswith('PageNo.'):
                        break
                    # Skip lines that are clearly page headers/footers
                    if any(x in next_line for x in ['HDFCBANKLIMITED', 'Statementofaccount', 'AccountBranch', 'A/COpenDate']):
                        i += 1
                        continue
                    # Add to narration
                    narration_lines.append(next_line)
                    i += 1
                
                # Merge narration
                full_narration = ' '.join(narration_lines).strip()
                
                # Determine transaction type and amount
                if withdrawal > 0:
                    transaction_type = 'expense'
                    amount = withdrawal
                else:
                    transaction_type = 'income'
                    amount = deposit
                
                # Extract metadata
                metadata = self._extract_metadata(full_narration)
                store, commodity, clean_description = self.extract_store_and_commodity(full_narration)
                
                transaction = {
                    'date': date_str,
                    'date_iso': date_iso,
                    'description': clean_description or full_narration,
                    'raw': full_narration,
                    'amount': amount,
                    'type': transaction_type,
                    'debit': withdrawal,
                    'credit': deposit,
                    'balance': balance,
                    'page': f'Page {page_num}',
                    'line': str(i),
                    'store': store,
                    'commodity': commodity,
                    'reference': ref,
                    **metadata
                }
                
                # Normalize transaction
                transaction = self.normalize_transaction(transaction)
                transactions.append(transaction)
                
                # Update previous balance
                prev_balance = balance
            else:
                # Not a valid transaction line, skip
                i += 1
                continue
        
        return transactions
    
    def _parse_excel_row(self, row: pd.Series, page_num: int, row_idx: int) -> Optional[Dict]:
        """
        Parse a single Excel row.
        
        Args:
            row: DataFrame row
            page_num: Page number
            row_idx: Row index
            
        Returns:
            Transaction dictionary or None
        """
        try:
            # HDFC format: Date | Narration | Chq/Ref | ValueDt | WithdrawalAmt | DepositAmt | ClosingBalance
            date_str = str(row.iloc[0] if len(row) > 0 else '').strip()
            if not date_str or date_str == 'nan':
                return None
            
            date_iso = self._parse_hdfc_date(date_str)
            if not date_iso:
                return None
            
            narration = str(row.iloc[1] if len(row) > 1 else '').strip()
            ref_no = str(row.iloc[2] if len(row) > 2 else '').strip()
            
            # Withdrawal or deposit
            withdrawal_str = str(row.iloc[4] if len(row) > 4 else '').strip()
            deposit_str = str(row.iloc[5] if len(row) > 5 else '').strip()
            balance_str = str(row.iloc[6] if len(row) > 6 else '').strip()
            
            withdrawal = self.parse_amount(withdrawal_str) if withdrawal_str and withdrawal_str != 'nan' else 0
            deposit = self.parse_amount(deposit_str) if deposit_str and deposit_str != 'nan' else 0
            balance = self.parse_amount(balance_str) if balance_str and balance_str != 'nan' else 0
            
            # Skip if no valid transaction
            if withdrawal == 0 and deposit == 0:
                return None
            
            # Determine transaction type
            if withdrawal > 0:
                transaction_type = 'expense'
                amount = withdrawal
            else:
                transaction_type = 'income'
                amount = deposit
            
            # Extract metadata
            metadata = self._extract_metadata(narration)
            store, commodity, clean_description = self.extract_store_and_commodity(narration)
            
            transaction = {
                'date': date_str,
                'date_iso': date_iso,
                'description': clean_description or narration,
                'raw': narration,
                'amount': amount,
                'type': transaction_type,
                'debit': withdrawal,
                'credit': deposit,
                'balance': balance,
                'page': f'Page {page_num}',
                'line': str(row_idx + 1),
                'store': store,
                'commodity': commodity,
                'reference': ref_no,
                **metadata
            }
            
            return self.normalize_transaction(transaction)
        
        except Exception as e:
            print(f"Error parsing Excel row {row_idx}: {e}")
            return None
    
    def _parse_hdfc_date(self, date_str: str) -> Optional[str]:
        """
        Parse HDFC date format (DD/MM/YY) to ISO format.
        
        Args:
            date_str: Date string in DD/MM/YY format
            
        Returns:
            ISO formatted date string or None
        """
        if not date_str:
            return None
        
        try:
            # HDFC uses DD/MM/YY format
            match = re.match(r'(\d{2})/(\d{2})/(\d{2})', date_str.strip())
            if match:
                day, month, year = match.groups()
                # Convert YY to YYYY (assuming 2000s)
                year_full = f"20{year}"
                return f"{year_full}-{month}-{day}"
        except:
            pass
        
        # Fallback to base parser
        return self.parse_date(date_str)
    
    def _extract_metadata(self, description: str) -> Dict:
        """
        Extract metadata from transaction description.
        
        Args:
            description: Transaction description
            
        Returns:
            Dictionary of metadata
        """
        metadata = {}
        
        # Extract UPI ID
        upi_match = re.search(r'UPI-([A-Z0-9@]+)', description)
        if upi_match:
            metadata['upi_id'] = upi_match.group(1)
        
        # Extract IFSC code
        ifsc_match = re.search(r'([A-Z]{4}0[A-Z0-9]{6})', description)
        if ifsc_match:
            metadata['ifsc'] = ifsc_match.group(1)
        
        # Extract transaction ID
        txn_id_match = re.search(r'(\d{13,})', description)
        if txn_id_match:
            metadata['transaction_id'] = txn_id_match.group(1)
        
        return metadata
