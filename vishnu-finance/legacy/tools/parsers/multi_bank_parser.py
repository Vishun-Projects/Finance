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
        """
        Parse a table row into a transaction dictionary.
        LENIENT: Accepts partial data and uses AI fallback when needed.
        """
        # LENIENT: Try parsing even with minimal columns (2 instead of 3+)
        if not row or len(row) < 1:
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
            for col_idx, cell in enumerate(row[:8]):  # Check first 8 columns
                cell_str = str(cell).strip() if cell else ''
                
                # Skip empty cells and obvious headers
                if not cell_str or cell_str.lower() in ['date', 'transaction', 'details', 'debit', 'credit', 'balance', 'particulars']:
                    continue
                
                # Check for date (various formats)
                if not date_str:
                    # DD MMM, YYYY (Kotak Type 2)
                    if re.match(r'\d{1,2}\s+[A-Za-z]{3,},\s*\d{4}', cell_str):
                        date_str = cell_str
                        continue
                    # DD-MM-YYYY or DD/MM/YYYY
                    if re.match(r'\d{1,2}[-/\s]\d{1,2}[-/\s]\d{4}', cell_str):
                        date_str = cell_str
                        continue
                    # DD MMM YYYY (without comma)
                    if re.match(r'\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}', cell_str):
                        date_str = cell_str
                        continue
                
                # Check for amount (numeric with decimal)
                amount_match = re.match(r'[+-]?[0-9,]+\.\d{0,2}', cell_str)
                if amount_match:
                    # Determine if it's debit (negative) or credit (positive)
                    if cell_str.startswith('-'):
                        debit_str = cell_str
                    elif cell_str.startswith('+') or cell_str.replace(',', '').replace('.', '').isdigit():
                        if not debit_str and cell_str.replace(',', '').replace('.', '').isdigit():
                            # Could be either, check context
                            credit_str = cell_str
                    continue
                
                # Check for negative amounts without - prefix
                if re.match(r'[0-9,]+\.\d{0,2}', cell_str) and not any([debit_str, credit_str, balance_str]):
                    # First numeric could be debit or credit - check column position
                    if col_idx >= 3:  # Usually debit/credit columns come after date and description
                        credit_str = cell_str
                    continue
            
            # Details is usually the longest text column
            if not details and len(row) > 1:
                potential_details = [str(cell) for cell in row[1:] if cell and str(cell).strip()]
                for pd in potential_details:
                    # Likely description if it's text and not a date or amount
                    if len(pd) > 5 and not re.match(r'([-+]?[0-9,]+\.?\d*|\d{1,2}[-/\s][a-zA-Z]{3,10}[-/\s]\d{4})', pd):
                        details = pd
                        break
            
            # LENIENT PARSING: Try to extract whatever data is available
            # If date parsing fails, try AI or use previous date
            date_iso = self.parse_date(date_str) if date_str else None
            
            # If date parsing failed, try AI to extract date from description
            if not date_iso and details:
                ai_result = self.parse_with_ai_fallback(details, ' '.join([str(c) for c in row if c]))
                if ai_result and ai_result.get('date_iso'):
                    date_iso = ai_result.get('date_iso')
            
            # If still no date, try to infer from context (will be flagged as hasInvalidDate)
            if not date_iso:
                # Try AI parsing for the entire row
                raw_text = ' '.join([str(c) for c in row if c])
                ai_result = self.parse_with_ai_fallback(details or raw_text, raw_text)
                if ai_result and ai_result.get('date_iso'):
                    date_iso = ai_result.get('date_iso')
                else:
                    # Last resort: use a default date (will be flagged)
                    date_iso = None  # Will be handled by import route
            
            # If no details but we have amounts, still create transaction
            if not details:
                details = ' '.join([str(cell) for cell in row[1:4] if cell and str(cell).strip()])
                if not details:
                    details = f"Transaction {line}"
            
            # Parse amounts with lenient handling
            debit = self.parse_amount(debit_str) if debit_str else 0
            credit = self.parse_amount(credit_str) if credit_str else 0
            balance = self.parse_amount(balance_str) if balance_str else None
            
            # LENIENT: Don't filter zero amounts - store with flag
            # if debit == 0 and credit == 0:
            #     return None
            
            # Try standard metadata extraction
            metadata = self._extract_metadata(details)
            store, commodity, clean_description = self.extract_store_and_commodity(details)
            
            # If standard parsing returned minimal data, try AI enhancement
            if (not store and not metadata.get('personName') and not metadata.get('upiId')) or \
               (not commodity and len(clean_description) < 10):
                ai_result = self.parse_with_ai_fallback(details, ' '.join([str(c) for c in row if c]))
                if ai_result:
                    # Enhance with AI results
                    if ai_result.get('store') and not store:
                        store = ai_result.get('store')
                    if ai_result.get('personName') and not metadata.get('personName'):
                        metadata['personName'] = ai_result.get('personName')
                    if ai_result.get('upiId') and not metadata.get('upiId'):
                        metadata['upiId'] = ai_result.get('upiId')
                    if ai_result.get('commodity') and not commodity:
                        commodity = ai_result.get('commodity')
                    if ai_result.get('cleanDescription') and len(ai_result.get('cleanDescription', '')) > len(clean_description):
                        clean_description = ai_result.get('cleanDescription')
                    # Store parsing method
                    metadata['parsingMethod'] = ai_result.get('parsingMethod', 'ai_fallback')
                    metadata['parsingConfidence'] = ai_result.get('parsingConfidence', 0.7)
            
            if debit > 0:
                transaction_type = 'expense'
                amount = debit
            else:
                transaction_type = 'income'
                amount = credit
            
            transaction = {
                'date': date_str or '',
                'date_iso': date_iso,
                'description': clean_description or details or '',
                'raw': details or '',
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
            
            # Normalize transaction
            normalized = self.normalize_transaction(transaction)
            
            # Set data quality flags
            if not date_iso or not normalized.get('date_iso'):
                normalized['hasInvalidDate'] = True
            if debit == 0 and credit == 0:
                normalized['hasZeroAmount'] = True
            if not store and not metadata.get('personName') and not metadata.get('upiId'):
                normalized['isPartialData'] = True
            
            return normalized
        
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
        
        # Normalize text first to fix spacing issues
        details = self.normalize_text(details)
        
        # Try to detect bank code in description
        for bank_code, patterns in self.BANK_CODES.items():
            for pattern in patterns:
                if pattern in details:
                    metadata['bankCode'] = bank_code
                    break
        
        # YES Bank UPI pattern: /mamtavishwakarma0948@okhdfcbank ANCH : ATM SERVICE BRANCH
        # Also handle: manishavishwakarma2463@okaxis
        yes_bank_upi_match = re.search(r'/([a-z0-9]+@[a-z0-9.]+)', details, re.IGNORECASE)
        if yes_bank_upi_match:
            metadata['transferType'] = 'UPI'
            upi_id = yes_bank_upi_match.group(1)
            metadata['upiId'] = upi_id
            # Extract person name from UPI ID (part before @)
            name_part = upi_id.split('@')[0]
            # Remove trailing numbers to get name (e.g., "manishavishwakarma2463" -> "manishavishwakarma")
            name_part = re.sub(r'\d+$', '', name_part)
            if re.search(r'[a-z]', name_part, re.IGNORECASE) and len(name_part) >= 3:
                # Capitalize properly: "manishavishwakarma" -> "Manishavishwakarma"
                metadata['personName'] = name_part.title()
        
        # HDFC Bank pattern: HDFC0002504/MAMTA - INR 60.00 MUNSHEELAL VISHWAKARMA
        hdfc_match = re.search(r'([A-Z]{4}\d+)/([A-Z\s]+?)(?:\s*-\s*INR|\s+INR)', details, re.IGNORECASE)
        if hdfc_match:
            metadata['transferType'] = 'UPI'
            person_name = hdfc_match.group(2).strip()
            # Extract full name if available: MAMTA MUNSHEELAL VISHWAKARMA
            full_name_match = re.search(r'([A-Z\s]+?)(?:\s+INR|\s*-\s*INR|$)', details, re.IGNORECASE)
            if full_name_match:
                full_name = full_name_match.group(1).strip()
                if len(full_name) > len(person_name):
                    person_name = full_name
            metadata['personName'] = person_name
            # Extract UPI ID if present later in description
            upi_match = re.search(r'([a-z0-9]+@[a-z0-9.]+)', details, re.IGNORECASE)
            if upi_match:
                metadata['upiId'] = upi_match.group(1)
        
        # Generic UPI pattern detection
        upi_patterns = [
            # Pattern: UPI/CODE/TXNID/NAME/UPI/UPIID
            r'UPI/([A-Z]+)/([A-Z0-9]+)/([^/]+?)/([A-Z]+)/([^/\s]+)',
            # Pattern: /BANKCODE/NAME/UPIID
            r'/[A-Z]{4}\d+/([^/]+?)/([^/\s]+@[a-z0-9.]+)',
            # Pattern: YESB0PTMUPI/NAME /XXXXX /UPIID
            r'YESB[A-Z0-9]+/([^/]+?)/XXXXX/([^/\s]+@[a-z0-9.]+)',
        ]
        
        for pattern in upi_patterns:
            match = re.search(pattern, details, re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) >= 2:
                    if not metadata['transferType']:
                        metadata['transferType'] = f"UPI/{groups[0]}" if groups[0] and groups[0].isalpha() else "UPI"
                if len(groups) >= 2 and not metadata['transactionId']:
                    # Second group might be transaction ID or person name
                    if groups[1] and re.match(r'^[A-Z0-9]+$', groups[1]):
                        metadata['transactionId'] = groups[1].strip()
                    elif groups[1] and not metadata['personName']:
                        metadata['personName'] = groups[1].strip()
                if len(groups) >= 3 and not metadata['personName']:
                    metadata['personName'] = groups[2].strip() if groups[2] else None
                if len(groups) >= 4:
                    # Last group is usually UPI ID
                    upi_candidate = groups[-1] if groups[-1] else None
                    if upi_candidate and '@' in upi_candidate:
                        metadata['upiId'] = upi_candidate.strip()
                # If we found something useful, return
                if metadata['transferType'] or metadata['personName'] or metadata['upiId']:
                    return metadata
        
        # Extract transaction ID from various patterns
        if not metadata['transactionId']:
            # Pattern: UPI/numbers or /numbers/
            txn_id_match = re.search(r'(?:UPI|/)(\d{10,})', details)
            if txn_id_match:
                metadata['transactionId'] = txn_id_match.group(1)
        
        return metadata

