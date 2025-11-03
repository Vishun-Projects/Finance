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
                
                # Extract account number
                acc_patterns = [
                    r'account\s+#\s*(\d+)',
                    r'account\s+no[:\s]+(\d+)',
                    r'account\s+number[:\s]+(\d+)',
                    r'a/c\s+no[:\s]+(\d+)',
                ]
                
                for pattern in acc_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        info['accountNumber'] = match.group(1)
                        break
                
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
        
        # Calculate totals from transactions
        if transactions_df is not None and not transactions_df.empty:
            metadata['transactionCount'] = len(transactions_df)
            
            if 'debit' in transactions_df.columns:
                metadata['totalDebits'] = float(transactions_df['debit'].sum())
            if 'credit' in transactions_df.columns:
                metadata['totalCredits'] = float(transactions_df['credit'].sum())
            
            # Calculate closing balance
            metadata['closingBalance'] = StatementMetadataExtractor.calculate_closing_balance(
                transactions_df, metadata['openingBalance']
            )
        
        return metadata

