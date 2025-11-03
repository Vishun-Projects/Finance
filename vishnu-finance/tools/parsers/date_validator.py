"""
Date Validator and Parser
=========================
Centralized date parsing with strict validation to prevent day/month swaps.
Supports bank-specific date formats with automatic detection.
"""

import re
from typing import Optional, Tuple
import pandas as pd
from datetime import datetime


class DateValidator:
    """Strict date parser with validation to prevent day/month swaps."""
    
    # Bank-specific date formats
    BANK_FORMATS = {
        'MAHB': {'format': 'DD/MM/YYYY', 'pattern': r'^(\d{2})/(\d{2})/(\d{4})$'},
        'SBM': {'format': 'DD/MM/YYYY', 'pattern': r'^(\d{2})/(\d{2})/(\d{4})$'},
        'HDFC': {'format': 'DD/MM/YY', 'pattern': r'^(\d{2})/(\d{2})/(\d{2})$'},
        'SBIN': {'format': 'MIXED', 'pattern': None},  # Needs detection
        'KKBK': {'format': 'DD-MM-YYYY', 'pattern': r'^(\d{2})[-/](\d{2})[-/](\d{4})$'},
        'IDIB': {'format': 'DD MMM YYYY', 'pattern': r'^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$'},
    }
    
    @staticmethod
    def parse_date(date_str: str, bank_code: Optional[str] = None, 
                   statement_start_date: Optional[str] = None,
                   statement_end_date: Optional[str] = None,
                   previous_date: Optional[str] = None) -> Optional[str]:
        """
        Parse date string to ISO format (YYYY-MM-DD) with strict validation.
        
        Args:
            date_str: Date string to parse
            bank_code: Bank code (MAHB, HDFC, etc.) for format-specific parsing
            statement_start_date: Statement start date in ISO format (for validation)
            statement_end_date: Statement end date in ISO format (for validation)
            previous_date: Previous transaction date in ISO format (for chronological validation)
            
        Returns:
            ISO formatted date string (YYYY-MM-DD) or None if invalid
        """
        if not date_str or pd.isna(date_str):
            return None
        
        date_str = str(date_str).strip()
        if not date_str or date_str.lower() in ['none', 'nan', '']:
            return None
        
        # Try bank-specific parsing first
        if bank_code:
            parsed = DateValidator._parse_bank_specific(date_str, bank_code)
            if parsed:
                # Validate against statement period if provided
                if DateValidator._validate_date_range(parsed, statement_start_date, statement_end_date):
                    # Validate chronological order if previous date provided
                    if previous_date is None or DateValidator._validate_chronological(previous_date, parsed):
                        return parsed
        
        # Try generic parsing with auto-detection
        parsed = DateValidator._parse_generic(date_str, bank_code)
        if parsed:
            if DateValidator._validate_date_range(parsed, statement_start_date, statement_end_date):
                if previous_date is None or DateValidator._validate_chronological(previous_date, parsed):
                    return parsed
        
        return None
    
    @staticmethod
    def _parse_bank_specific(date_str: str, bank_code: str) -> Optional[str]:
        """Parse date using bank-specific format."""
        bank_code = bank_code.upper()
        bank_info = DateValidator.BANK_FORMATS.get(bank_code)
        
        if not bank_info:
            return None
        
        format_type = bank_info['format']
        pattern = bank_info['pattern']
        
        if format_type == 'DD/MM/YYYY':
            # For SBM/MAHB, be STRICT - always DD/MM/YYYY, never swap
            return DateValidator._parse_dd_mm_yyyy(date_str, strict_dd_mm=True)
        elif format_type == 'DD/MM/YY':
            return DateValidator._parse_dd_mm_yy(date_str)
        elif format_type == 'DD-MM-YYYY':
            # Strict DD/MM/YYYY for these banks too
            return DateValidator._parse_dd_mm_yyyy(date_str.replace('-', '/'), strict_dd_mm=True)
        elif format_type == 'DD MMM YYYY':
            # For IDIB: "28 Apr 2024"
            return DateValidator._parse_dd_mmm_yyyy(date_str)
        elif format_type == 'MIXED':
            # Try common formats
            for fmt in ['DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY']:
                parsed = DateValidator._parse_with_format(date_str, fmt)
                if parsed:
                    return parsed
        
        return None
    
    @staticmethod
    def _parse_dd_mm_yyyy(date_str: str, strict_dd_mm: bool = True) -> Optional[str]:
        """
        Parse DD/MM/YYYY format strictly.
        
        Args:
            date_str: Date string in DD/MM/YYYY format
            strict_dd_mm: If True, always interpret as DD/MM/YYYY even if ambiguous.
                         If False, may try swapping when ambiguous.
        """
        match = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', date_str)
        if match:
            day_str, month_str, year_str = match.groups()
            day = int(day_str)
            month = int(month_str)
            year = int(year_str)
            
            # For DD/MM/YYYY format, first part is day, second is month
            # Validate ranges
            if 1 <= month <= 12 and 1 <= day <= 31:
                try:
                    # Try DD/MM/YYYY interpretation first (strict)
                    test_date = datetime(year, month, day)  # year, month, day
                    return f"{year}-{month_str}-{day_str}"
                except ValueError:
                    # Invalid date in DD/MM format (e.g., 31/02/2025)
                    # Only try swapping if not strict AND if day <= 12 (could be month)
                    if not strict_dd_mm and 1 <= day <= 12 and 1 <= month <= 31:
                        try:
                            # Try as MM/DD/YYYY
                            test_date = datetime(year, day, month)
                            return f"{year}-{day_str}-{month_str}"
                        except ValueError:
                            return None
                    return None
            else:
                # If month > 12, definitely swapped or invalid
                # Try swapping: maybe it's MM/DD and day is actually month
                if 1 <= day <= 12 and month > 12:
                    # Try as MM/DD/YYYY (swapped)
                    try:
                        test_date = datetime(year, day, month)
                        return f"{year}-{day_str}-{month_str}"
                    except ValueError:
                        return None
        
        return None
    
    @staticmethod
    def _parse_dd_mm_yy(date_str: str) -> Optional[str]:
        """Parse DD/MM/YY format (2-digit year) strictly."""
        match = re.match(r'^(\d{2})/(\d{2})/(\d{2})$', date_str)
        if match:
            day_str, month_str, year_str = match.groups()
            day = int(day_str)
            month = int(month_str)
            year = int(year_str)
            
            # Convert 2-digit year to 4-digit (assume 2000s)
            year_full = 2000 + year if year < 100 else year
            
            # Validate ranges
            if 1 <= month <= 12 and 1 <= day <= 31:
                try:
                    test_date = datetime(year_full, month, day)
                    return f"{year_full}-{month_str}-{day_str}"
                except ValueError:
                    # Try swapping if day <= 12
                    if 1 <= day <= 12 and 1 <= month <= 31:
                        try:
                            test_date = datetime(year_full, day, month)
                            return f"{year_full}-{day_str}-{month_str}"
                        except ValueError:
                            return None
                    return None
        
        return None
    
    @staticmethod
    def _parse_dd_mmm_yyyy(date_str: str) -> Optional[str]:
        """Parse DD MMM YYYY format (e.g., '28 Apr 2024')."""
        # Parse using pandas with dayfirst for DD MMM YYYY format
        parsed = pd.to_datetime(date_str, format='%d %b %Y', errors='coerce')
        if pd.notna(parsed):
            return parsed.strftime('%Y-%m-%d')
        
        # Also try without commas: "28 Apr, 2024" format  
        parsed = pd.to_datetime(date_str, format='%d %b, %Y', errors='coerce')
        if pd.notna(parsed):
            return parsed.strftime('%Y-%m-%d')
        
        # Fallback to flexible parsing
        parsed = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
        if pd.notna(parsed):
            return parsed.strftime('%Y-%m-%d')
        
        return None
    
    @staticmethod
    def _parse_generic(date_str: str, bank_code: Optional[str] = None) -> Optional[str]:
        """Parse date using generic methods with validation."""
        # For banks that use DD MMM YYYY (IDIB)
        if bank_code in ['IDIB']:
            parsed = pd.to_datetime(date_str, format='%d %b %Y', errors='coerce')
            if pd.notna(parsed):
                return parsed.strftime('%Y-%m-%d')
            # Try with comma
            parsed = pd.to_datetime(date_str, format='%d %b, %Y', errors='coerce')
            if pd.notna(parsed):
                return parsed.strftime('%Y-%m-%d')
            # Fallback
            parsed = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
            if pd.notna(parsed):
                return parsed.strftime('%Y-%m-%d')
        
        # For banks that use DD/MM/YYYY, ALWAYS use explicit format - never auto-detect
        if bank_code in ['MAHB', 'SBM']:
            # STRICT: Always interpret as DD/MM/YYYY
            parsed = pd.to_datetime(date_str, format='%d/%m/%Y', errors='coerce')
            if pd.notna(parsed):
                return parsed.strftime('%Y-%m-%d')
            # If explicit format failed, try manual parsing (strict)
            return DateValidator._parse_dd_mm_yyyy(date_str, strict_dd_mm=True)
        
        # For other banks, try dayfirst=True (common for DD/MM formats)
        parsed = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
        if pd.notna(parsed):
            # Verify it's reasonable (check if month > 12 in original)
            original_parts = re.match(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', date_str)
            if original_parts:
                part1, part2, part3 = original_parts.groups()
                # If first part > 12, definitely DD/MM format
                if int(part1) > 12:
                    return parsed.strftime('%Y-%m-%d')
                # If second part > 12, definitely MM/DD format
                elif int(part2) > 12:
                    parsed_mmddyy = pd.to_datetime(date_str, dayfirst=False, errors='coerce')
                    if pd.notna(parsed_mmddyy):
                        return parsed_mmddyy.strftime('%Y-%m-%d')
                # If both <= 12, use dayfirst=True result (assumes DD/MM)
                return parsed.strftime('%Y-%m-%d')
        
        return None
    
    @staticmethod
    def _parse_with_format(date_str: str, format_type: str) -> Optional[str]:
        """Parse with specific format."""
        if format_type == 'DD/MM/YYYY':
            return DateValidator._parse_dd_mm_yyyy(date_str)
        elif format_type == 'MM/DD/YYYY':
            # Try MM/DD/YYYY format
            match = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', date_str)
            if match:
                month_str, day_str, year_str = match.groups()
                month = int(month_str)
                day = int(day_str)
                year = int(year_str)
                if 1 <= month <= 12 and 1 <= day <= 31:
                    try:
                        test_date = datetime(year, month, day)
                        return f"{year}-{month_str}-{day_str}"
                    except ValueError:
                        return None
        return None
    
    @staticmethod
    def _validate_date_range(date_iso: str, start_date: Optional[str], 
                             end_date: Optional[str]) -> bool:
        """Validate date is within statement period."""
        if not start_date and not end_date:
            return True  # No range provided, assume valid
        
        try:
            date_val = pd.to_datetime(date_iso)
            if start_date:
                start_val = pd.to_datetime(start_date)
                if date_val < start_val:
                    return False
            if end_date:
                end_val = pd.to_datetime(end_date)
                if date_val > end_val:
                    return False
            return True
        except:
            return True  # If parsing fails, assume valid
    
    @staticmethod
    def _validate_chronological(previous_date_iso: str, current_date_iso: str, 
                                max_days_backward: int = 7) -> bool:
        """
        Validate chronological order of transactions.
        
        Allows some flexibility (e.g., max 7 days backward) to handle
        cases where transactions might be out of order due to processing delays.
        """
        try:
            prev_date = pd.to_datetime(previous_date_iso)
            curr_date = pd.to_datetime(current_date_iso)
            
            # Allow transactions up to max_days_backward days before previous
            days_diff = (curr_date - prev_date).days
            
            if days_diff < -max_days_backward:
                # Too far backward - likely date parsing error
                return False
            
            return True
        except:
            return True  # If parsing fails, assume valid


def parse_date_strict(date_str: str, bank_code: Optional[str] = None, **kwargs) -> Optional[str]:
    """
    Convenience function for strict date parsing.
    
    Args:
        date_str: Date string to parse
        bank_code: Bank code for format-specific parsing
        **kwargs: Additional validation parameters (statement_start_date, statement_end_date, previous_date)
        
    Returns:
        ISO formatted date string or None
    """
    return DateValidator.parse_date(date_str, bank_code=bank_code, **kwargs)

