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
        # Normalize text first to fix spacing issues
        description = self.normalize_text(description)
        
        metadata = {
            'transactionId': None,
            'personName': None,
            'accountNumber': None,
            'transferType': None,
            'upiId': None
        }
        
        # HDFC Bank pattern: HDFC0002504/MAMTA - INR 60.00 MUNSHEELAL VISHWAKARMA
        hdfc_match = re.search(r'([A-Z]{4}\d+)/([A-Z\s]+?)(?:\s*-\s*INR|\s+INR)', description, re.IGNORECASE)
        if hdfc_match:
            metadata['transferType'] = 'UPI'
            person_name = hdfc_match.group(2).strip()
            # Extract full name if available: MAMTA MUNSHEELAL VISHWAKARMA
            full_name_match = re.search(r'([A-Z\s]+?)(?:\s+INR|\s*-\s*INR|$)', description, re.IGNORECASE)
            if full_name_match:
                full_name = full_name_match.group(1).strip()
                if len(full_name) > len(person_name):
                    person_name = full_name
            metadata['personName'] = person_name
            # Extract UPI ID if present later in description
            upi_match = re.search(r'([a-z0-9]+@[a-z0-9.]+)', description, re.IGNORECASE)
            if upi_match:
                metadata['upiId'] = upi_match.group(1)
        
        # Extract UPI ID
        upi_match = re.search(r'UPI-([A-Z0-9@]+)', description)
        if upi_match and not metadata['upiId']:
            metadata['upiId'] = upi_match.group(1)
            metadata['transferType'] = 'UPI'
        
        # Extract IFSC code
        ifsc_match = re.search(r'([A-Z]{4}0[A-Z0-9]{6})', description)
        if ifsc_match:
            metadata['accountNumber'] = ifsc_match.group(1)
        
        # Extract transaction ID
        txn_id_match = re.search(r'(\d{13,})', description)
        if txn_id_match and not metadata['transactionId']:
            metadata['transactionId'] = txn_id_match.group(1)
        
        return metadata
