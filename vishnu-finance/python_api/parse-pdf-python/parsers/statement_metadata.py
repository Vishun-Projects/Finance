"""
Statement Metadata Extractor

Centralized utility to extract statement metadata including:
- Opening balance
- Closing balance
- Statement period (start/end dates)
- Account information (account number, IFSC, branch)
"""

import re
import pdfplumber
import pandas as pd
from pathlib import Path
from typing import Dict, Optional, Tuple
from datetime import datetime
from decimal import Decimal


class StatementMetadataExtractor:
    """Extract metadata from bank statements"""
    
    @staticmethod
    def extract_opening_balance(pdf_path: Path, bank_code: str, transactions_df: Optional[pd.DataFrame] = None) -> Optional[float]:
        """
        Extract opening balance from statement.
        Priority: Statement header/summary > Calculate from first transaction > Account details
        
        Args:
            pdf_path: Path to PDF file
            bank_code: Bank code (MAHB, HDFC, etc.)
            transactions_df: DataFrame of parsed transactions (optional)
            
        Returns:
            Opening balance as float, or None if not found
        """
        try:
            with pdfplumber.open(str(pdf_path)) as pdf:
                # Extract text from first page
                first_page = pdf.pages[0]
                text = first_page.extract_text()
                
                if not text:
                    return None
                
                # Method 1: Extract from statement header/summary
                opening_balance = StatementMetadataExtractor._extract_from_text(text, bank_code)
                if opening_balance is not None:
                    return opening_balance
                
                # Method 2: Check if there's an explicit opening balance transaction
                if transactions_df is not None and not transactions_df.empty:
                    # Look for "OPENING BALANCE" in description
                    if 'description' in transactions_df.columns:
                        opening_rows = transactions_df[transactions_df['description'].str.contains('OPENING BALANCE', na=False, case=False)]
                        if not opening_rows.empty:
                            first_opening = opening_rows.iloc[0]
                            # Get the balance from opening balance row
                            if 'balance' in first_opening and pd.notna(first_opening['balance']):
                                return float(first_opening['balance'])
                
                # Method 2b: Calculate from first transaction if available
                if transactions_df is not None and not transactions_df.empty:
                    calculated = StatementMetadataExtractor._calculate_from_first_transaction(transactions_df)
                    if calculated is not None:
                        return calculated
                
                # Method 3: Check last page for summary (common in HDFC)
                if len(pdf.pages) > 1:
                    last_page = pdf.pages[-1]
                    last_text = last_page.extract_text()
                    if last_text:
                        opening_balance = StatementMetadataExtractor._extract_from_summary(last_text, bank_code)
                        if opening_balance is not None:
                            return opening_balance
        except Exception as e:
            print(f"Error extracting opening balance: {e}")
        
        return None
    
    @staticmethod
    def _extract_from_text(text: str, bank_code: str) -> Optional[float]:
        """Extract opening balance from statement text"""
        # Common patterns for opening balance
        patterns = [
            # Opening Balance INR 27.00 (IDIB format)
            r'opening\s+balance\s+inr\s+([0-9,]+\.?\d*)',
            # Opening Balance: INR 27.00
            r'opening\s+balance[:\s]+inr\s+([0-9,]+\.?\d*)',
            # Opening Balance: 1234.56
            r'opening\s+balance[:\s]+([0-9,]+\.?\d*)',
            # Opening Balance: Rs. 1,234.56
            r'opening\s+balance[:\s]+(?:rs\.?|inr)?\s*([0-9,]+\.?\d*)',
            # OB: 1234.56
            r'\b(?:ob|o\.?\s*b\.?)\s*[:\s]+([0-9,]+\.?\d*)',
            # Statement Summary Opening Balance
            r'statement\s+summary[^\n]*opening\s*balance[:\s]+([0-9,]+\.?\d*)',
            # ACCOUNT SUMMARY section (IDIB format)
            r'opening\s+balance\s+total\s+credits[^\n]*opening\s+balance[:\s]+([0-9,]+\.?\d*)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    balance_str = match.group(1).replace(',', '')
                    return float(balance_str)
                except (ValueError, AttributeError):
                    continue
        
        return None
    
    @staticmethod
    def _extract_from_summary(text: str, bank_code: str) -> Optional[float]:
        """Extract opening balance from statement summary (usually on last page)"""
        # HDFC pattern: "OpeningBalance DrCount CrCount Debits Credits ClosingBal 912.92 ..."
        if bank_code == 'HDFC':
            pattern = r'opening\s*balance[:\s]*([0-9,]+\.?\d*)'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(',', ''))
                except ValueError:
                    pass
        
        return StatementMetadataExtractor._extract_from_text(text, bank_code)
    
    @staticmethod
    def _calculate_from_first_transaction(transactions_df: pd.DataFrame) -> Optional[float]:
        """
        Calculate opening balance from first transaction.
        Formula: openingBalance = firstTransactionBalance - firstTransactionAmount
        For debit: opening = balance + debit
        For credit: opening = balance - credit
        """
        if transactions_df.empty:
            return None
        
        try:
            # Sort by date to get first transaction
            if 'date_iso' in transactions_df.columns:
                sorted_df = transactions_df.sort_values('date_iso').reset_index(drop=True)
            else:
                sorted_df = transactions_df.reset_index(drop=True)
            
            first_row = sorted_df.iloc[0]
            
            # Get balance and amount from first transaction
            balance = None
            amount = None
            
            if 'balance' in first_row and pd.notna(first_row['balance']):
                balance = float(first_row['balance'])
            
            # Determine if it's debit or credit
            debit = 0.0
            credit = 0.0
            
            if 'debit' in first_row and pd.notna(first_row['debit']):
                debit = float(first_row['debit'])
            if 'credit' in first_row and pd.notna(first_row['credit']):
                credit = float(first_row['credit'])
            
            if balance is not None:
                if debit > 0:
                    # For debit: opening = balance + debit
                    return balance + debit
                elif credit > 0:
                    # For credit: opening = balance - credit
                    return balance - credit
            
        except Exception as e:
            print(f"Error calculating opening balance from first transaction: {e}")
        
        return None
    
    @staticmethod
    def extract_statement_period(pdf_path: Path, bank_code: str) -> Optional[Tuple[datetime, datetime]]:
        """
        Extract statement period (start and end dates) from PDF
        
        Returns:
            Tuple of (start_date, end_date) or None
        """
        try:
            with pdfplumber.open(str(pdf_path)) as pdf:
                first_page = pdf.pages[0]
                text = first_page.extract_text()
                
                if not text:
                    return None
                
                # Pattern: "from DD/MM/YYYY to DD/MM/YYYY"
                pattern = r'from\s+(\d{2}/\d{2}/\d{4})\s+to\s+(\d{2}/\d{2}/\d{4})'
                match = re.search(pattern, text, re.IGNORECASE)
                
                if match:
                    from_date_str = match.group(1)
                    to_date_str = match.group(2)
                    
                    # Parse dates (DD/MM/YYYY format)
                    try:
                        from_date = datetime.strptime(from_date_str, '%d/%m/%Y')
                        to_date = datetime.strptime(to_date_str, '%d/%m/%Y')
                        return (from_date, to_date)
                    except ValueError:
                        pass
                
                # Alternative pattern: "Statement Period: DD/MM/YYYY - DD/MM/YYYY"
                pattern2 = r'statement\s+period[:\s]+(\d{2}/\d{2}/\d{4})\s*-\s*(\d{2}/\d{2}/\d{4})'
                match2 = re.search(pattern2, text, re.IGNORECASE)
                
                if match2:
                    from_date_str = match2.group(1)
                    to_date_str = match2.group(2)
                    
                    try:
                        from_date = datetime.strptime(from_date_str, '%d/%m/%Y')
                        to_date = datetime.strptime(to_date_str, '%d/%m/%Y')
                        return (from_date, to_date)
                    except ValueError:
                        pass
                        
        except Exception as e:
            print(f"Error extracting statement period: {e}")
        
        return None
    
    @staticmethod
    def extract_account_info(pdf_path: Path, bank_code: str) -> Dict[str, Optional[str]]:
        """
        Extract account information (account number, IFSC, branch)
        
        Returns:
            Dictionary with accountNumber, ifsc, branch, etc.
        """
        info = {
            'accountNumber': None,
            'ifsc': None,
            'branch': None,
            'accountHolderName': None
        }
        
        try:
            with pdfplumber.open(str(pdf_path)) as pdf:
                # Try first page
                first_page = pdf.pages[0]
                text = first_page.extract_text()
                
                # For Kotak statements, check first 3 pages for account info
                if bank_code == 'KKBK' and text and not re.search(r'account\s+#|account\s+no', text, re.IGNORECASE):
                    for i in range(1, min(3, len(pdf.pages))):
                        page_text = pdf.pages[i].extract_text()
                        if page_text and re.search(r'account\s+#|account\s+no', page_text, re.IGNORECASE):
                            text = page_text
                            break
                
                if not text:
                    return info
                
                # Extract account number - enhanced patterns
                acc_patterns = [
                    r'account\s+#\s*:?\s*(\d{8,20})',  # Account #: 1234567890
                    r'account\s+no[:\s]+:?\s*(\d{8,20})',  # Account No: 1234567890
                    r'account\s+number[:\s]+:?\s*(\d{8,20})',  # Account Number: 1234567890
                    r'a/c\s+no[:\s]+:?\s*(\d{8,20})',  # A/C No: 1234567890
                    r'a/c[:\s]+:?\s*(\d{8,20})',  # A/C: 1234567890
                    r'acc[:\s]+:?\s*(\d{8,20})',  # Acc: 1234567890
                    r'account\s+details[^\n]*(\d{8,20})',  # Account Details ... 1234567890
                    r'account\s+information[^\n]*(\d{8,20})',  # Account Information ... 1234567890
                    # Patterns with spaces/dashes (e.g., "1234 5678 9012")
                    r'account\s+#\s*:?\s*((?:\d{4}\s*){2,5})',  # Account #: 1234 5678 9012
                    r'account\s+no[:\s]+:?\s*((?:\d{4}\s*){2,5})',  # Account No: 1234 5678 9012
                ]
                
                for pattern in acc_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        account_num = re.sub(r'[\s-]+', '', match.group(1))  # Remove spaces and dashes
                        # Validate: account numbers are typically 8-20 digits
                        if len(account_num) >= 8 and len(account_num) <= 20:
                            info['accountNumber'] = account_num
                            break
                
                # If still not found, try extracting from tables (for some bank formats)
                if not info['accountNumber']:
                    try:
                        with pdfplumber.open(str(pdf_path)) as pdf:
                            for page in pdf.pages[:3]:  # Check first 3 pages
                                tables = page.extract_tables()
                                for table in tables:
                                    if not table:
                                        continue
                                    for row in table:
                                        if not row:
                                            continue
                                        row_text = ' '.join(str(cell) for cell in row if cell)
                                        # Look for account number patterns in table cells
                                        for pattern in [
                                            r'(\d{8,20})',  # Any 8-20 digit number
                                        ]:
                                            matches = re.findall(pattern, row_text)
                                            for match in matches:
                                                if len(match) >= 8 and len(match) <= 20:
                                                    # Additional validation: not a date, not a transaction ID
                                                    if not re.match(r'^\d{2}/\d{2}/\d{4}$', match):  # Not a date
                                                        info['accountNumber'] = match
                                                        break
                                        if info['accountNumber']:
                                            break
                                    if info['accountNumber']:
                                        break
                                if info['accountNumber']:
                                    break
                    except Exception as e:
                        print(f"Error extracting account number from tables: {e}")
                
                # Extract IFSC
                ifsc_patterns = [
                    r'ifsc[:\s]+([A-Z]{4}0[A-Z0-9]{6})',
                    r'ifsc\s+code[:\s]+([A-Z]{4}0[A-Z0-9]{6})',
                ]
                
                for pattern in ifsc_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        info['ifsc'] = match.group(1)
                        break
                
                # Extract branch name
                branch_patterns = [
                    r'branch\s+name[:\s]+([^\n]+)',
                    r'branch[:\s]+([^\n]+)',
                ]
                
                for pattern in branch_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        branch_name = match.group(1).strip()
                        # Clean up branch name (remove extra whitespace)
                        branch_name = ' '.join(branch_name.split())
                        info['branch'] = branch_name[:100]  # Limit length
                        break
                
                # Extract account holder name (optional)
                name_patterns = [
                    r'account\s+holder[:\s]+([^\n]+)',
                    r'name[:\s]+([A-Z\s]+)',
                ]
                
                for pattern in name_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        name = match.group(1).strip()
                        info['accountHolderName'] = name[:100]
                        break
                        
        except Exception as e:
            print(f"Error extracting account info: {e}")
        
        return info
    
    @staticmethod
    def extract_closing_balance(pdf_path: Path, bank_code: str, transactions_df: Optional[pd.DataFrame] = None) -> Optional[float]:
        """
        Extract closing balance from statement.
        Priority: Statement header/summary > Calculate from transactions > Last transaction balance
        
        Args:
            pdf_path: Path to PDF file
            bank_code: Bank code (IDIB, HDFC, etc.)
            transactions_df: DataFrame of parsed transactions (optional)
            
        Returns:
            Closing balance as float, or None if not found
        """
        try:
            with pdfplumber.open(str(pdf_path)) as pdf:
                # Extract text from first page
                first_page = pdf.pages[0]
                text = first_page.extract_text()
                
                if not text:
                    text = ""
                
                # Method 1: Extract from statement header/summary (ACCOUNT SUMMARY section)
                closing_balance = StatementMetadataExtractor._extract_closing_from_text(text, bank_code)
                if closing_balance is not None:
                    return closing_balance
                
                # Method 2: Check last page for summary
                if len(pdf.pages) > 1:
                    last_page = pdf.pages[-1]
                    last_text = last_page.extract_text()
                    if last_text:
                        closing_balance = StatementMetadataExtractor._extract_closing_from_text(last_text, bank_code)
                        if closing_balance is not None:
                            return closing_balance
                
                # Method 3: Calculate from transactions if available
                if transactions_df is not None and not transactions_df.empty:
                    calculated = StatementMetadataExtractor.calculate_closing_balance(
                        transactions_df, None  # Will use last transaction balance
                    )
                    if calculated is not None:
                        return calculated
        except Exception as e:
            print(f"Error extracting closing balance: {e}")
        
        return None
    
    @staticmethod
    def _extract_closing_from_text(text: str, bank_code: str) -> Optional[float]:
        """Extract closing balance from statement text"""
        # Common patterns for closing/ending balance
        patterns = [
            # Ending Balance INR 7,305.17 (IDIB format)
            r'ending\s+balance\s+inr\s+([0-9,]+\.?\d*)',
            # Closing Balance: INR 7,305.17
            r'closing\s+balance[:\s]+inr\s+([0-9,]+\.?\d*)',
            # Ending Balance: 1234.56
            r'ending\s+balance[:\s]+([0-9,]+\.?\d*)',
            # Closing Balance: 1234.56
            r'closing\s+balance[:\s]+([0-9,]+\.?\d*)',
            # Ending Balance: Rs. 1,234.56
            r'ending\s+balance[:\s]+(?:rs\.?|inr)?\s*([0-9,]+\.?\d*)',
            # CB: 1234.56
            r'\b(?:cb|c\.?\s*b\.?)\s*[:\s]+([0-9,]+\.?\d*)',
            # Statement Summary Closing Balance
            r'statement\s+summary[^\n]*closing\s*balance[:\s]+([0-9,]+\.?\d*)',
            # ACCOUNT SUMMARY section (IDIB format) - Ending Balance
            r'account\s+summary[^\n]*ending\s*balance[:\s]+inr\s+([0-9,]+\.?\d*)',
            r'account\s+summary[^\n]*ending\s*balance[:\s]+([0-9,]+\.?\d*)',
            # After "Total Debits" line, look for ending balance
            r'total\s+debits[^\n]*ending\s*balance[:\s]+inr\s+([0-9,]+\.?\d*)',
            r'total\s+debits[^\n]*ending\s*balance[:\s]+([0-9,]+\.?\d*)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    balance_str = match.group(1).replace(',', '')
                    return float(balance_str)
                except (ValueError, AttributeError):
                    continue
        
        return None
    
    @staticmethod
    def calculate_closing_balance(transactions_df: pd.DataFrame, opening_balance: Optional[float] = None) -> Optional[float]:
        """
        Calculate closing balance from transactions
        
        Formula: openingBalance + totalCredits - totalDebits = closingBalance
        If opening balance not provided, use last transaction balance
        """
        if transactions_df.empty:
            return None
        
        try:
            # Calculate from transactions
            total_debits = 0.0
            total_credits = 0.0
            
            if 'debit' in transactions_df.columns:
                total_debits = transactions_df['debit'].sum()
            if 'credit' in transactions_df.columns:
                total_credits = transactions_df['credit'].sum()
            
            if opening_balance is not None:
                closing_balance = opening_balance + total_credits - total_debits
                return closing_balance
            else:
                # Use last transaction balance
                if 'balance' in transactions_df.columns:
                    if 'date_iso' in transactions_df.columns:
                        sorted_df = transactions_df.sort_values('date_iso')
                        last_balance = sorted_df.iloc[-1]['balance']
                    else:
                        last_balance = transactions_df.iloc[-1]['balance']
                    
                    if pd.notna(last_balance):
                        return float(last_balance)
        except Exception as e:
            print(f"Error calculating closing balance: {e}")
        
        return None
    
    @staticmethod
    def extract_all_metadata(pdf_path: Path, bank_code: str, transactions_df: Optional[pd.DataFrame] = None) -> Dict:
        """
        Extract all statement metadata in one call
        
        Returns:
            Dictionary with:
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
        metadata = {
            'openingBalance': None,
            'closingBalance': None,
            'statementStartDate': None,
            'statementEndDate': None,
            'accountNumber': None,
            'ifsc': None,
            'branch': None,
            'accountHolderName': None,
            'totalDebits': 0.0,
            'totalCredits': 0.0,
            'transactionCount': 0
        }
        
        # Extract opening balance
        metadata['openingBalance'] = StatementMetadataExtractor.extract_opening_balance(
            pdf_path, bank_code, transactions_df
        )
        
        # Extract statement period
        period = StatementMetadataExtractor.extract_statement_period(pdf_path, bank_code)
        if period:
            metadata['statementStartDate'] = period[0]
            metadata['statementEndDate'] = period[1]
        
        # Extract account info
        account_info = StatementMetadataExtractor.extract_account_info(pdf_path, bank_code)
        metadata.update(account_info)
        
        # Extract closing balance from PDF (PRIORITY - use PDF value, not calculated)
        metadata['closingBalance'] = StatementMetadataExtractor.extract_closing_balance(
            pdf_path, bank_code, transactions_df
        )
        
        # Extract totals from PDF summary if available (more accurate than transaction sums)
        totals_from_pdf = StatementMetadataExtractor._extract_totals_from_pdf(pdf_path, bank_code)
        if totals_from_pdf.get('totalCredits') is not None:
            metadata['totalCredits'] = totals_from_pdf['totalCredits']
        if totals_from_pdf.get('totalDebits') is not None:
            metadata['totalDebits'] = totals_from_pdf['totalDebits']
        
        # Calculate totals from transactions (fallback if not found in PDF)
        if transactions_df is not None and not transactions_df.empty:
            metadata['transactionCount'] = len(transactions_df)
            
            # Only use transaction totals if not already extracted from PDF
            if metadata['totalDebits'] == 0.0 and 'debit' in transactions_df.columns:
                metadata['totalDebits'] = float(transactions_df['debit'].sum())
            if metadata['totalCredits'] == 0.0 and 'credit' in transactions_df.columns:
                metadata['totalCredits'] = float(transactions_df['credit'].sum())
            
            # If closing balance not found in PDF, calculate it
            if metadata['closingBalance'] is None:
                metadata['closingBalance'] = StatementMetadataExtractor.calculate_closing_balance(
                    transactions_df, metadata['openingBalance']
                )
        
        return metadata
    
    @staticmethod
    def _extract_totals_from_pdf(pdf_path: Path, bank_code: str) -> Dict[str, Optional[float]]:
        """
        Extract total credits and debits from PDF summary section
        
        Returns:
            Dictionary with totalCredits and totalDebits
        """
        totals = {
            'totalCredits': None,
            'totalDebits': None
        }
        
        try:
            with pdfplumber.open(str(pdf_path)) as pdf:
                # Check first page
                first_page = pdf.pages[0]
                text = first_page.extract_text()
                
                if not text:
                    text = ""
                
                # Extract from ACCOUNT SUMMARY section (IDIB format)
                # Pattern: "Total Credits: + INR 349,988.00" or "Total Credits + INR 349,988.00"
                credit_patterns = [
                    r'total\s+credits[:\s]+\+?\s*inr\s+([0-9,]+\.?\d*)',
                    r'total\s+credits[:\s]+\+?\s*([0-9,]+\.?\d*)',
                    r'credits[:\s]+\+?\s*inr\s+([0-9,]+\.?\d*)',
                ]
                
                for pattern in credit_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        try:
                            totals['totalCredits'] = float(match.group(1).replace(',', ''))
                            break
                        except (ValueError, AttributeError):
                            continue
                
                # Pattern: "Total Debits: - INR 342,709.83" or "Total Debits - INR 342,709.83"
                debit_patterns = [
                    r'total\s+debits[:\s]-\s*inr\s+([0-9,]+\.?\d*)',
                    r'total\s+debits[:\s]-?\s*([0-9,]+\.?\d*)',
                    r'debits[:\s]-\s*inr\s+([0-9,]+\.?\d*)',
                ]
                
                for pattern in debit_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        try:
                            totals['totalDebits'] = float(match.group(1).replace(',', ''))
                            break
                        except (ValueError, AttributeError):
                            continue
                
                # If not found on first page, check last page
                if (totals['totalCredits'] is None or totals['totalDebits'] is None) and len(pdf.pages) > 1:
                    last_page = pdf.pages[-1]
                    last_text = last_page.extract_text()
                    if last_text:
                        # Try same patterns on last page
                        for pattern in credit_patterns:
                            if totals['totalCredits'] is None:
                                match = re.search(pattern, last_text, re.IGNORECASE)
                                if match:
                                    try:
                                        totals['totalCredits'] = float(match.group(1).replace(',', ''))
                                        break
                                    except (ValueError, AttributeError):
                                        continue
                        
                        for pattern in debit_patterns:
                            if totals['totalDebits'] is None:
                                match = re.search(pattern, last_text, re.IGNORECASE)
                                if match:
                                    try:
                                        totals['totalDebits'] = float(match.group(1).replace(',', ''))
                                        break
                                    except (ValueError, AttributeError):
                                        continue
        except Exception as e:
            print(f"Error extracting totals from PDF: {e}")
        
        return totals

