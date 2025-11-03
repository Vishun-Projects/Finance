"""
Bank Type Detector
==================
Detects bank type from PDF/Excel bank statement content.
"""

import re
from pathlib import Path
from typing import Optional, List
import pdfplumber
import pandas as pd


class BankDetector:
    """Detects bank type from bank statement content."""
    
    # Bank code patterns
    BANK_PATTERNS = {
        'SBIN': {
            'codes': ['SBIN'],
            'name_patterns': [r'state\s+bank\s+of\s+india', r'sbi\s+bank'],
            'upi_patterns': [r'/SBIN/', r'SBIN/[A-Z0-9@]+'],
            'atm_patterns': [r'\+\s*SBI\s+[A-Za-z\s,]+']
        },
        'IDIB': {
            'codes': ['IDIB'],
            'name_patterns': [r'indian\s+bank'],
            'upi_patterns': [r'/IDIB/', r'IDIB/[A-Z0-9@]+'],
            'table_patterns': [r'account\s+activity', r'transaction\s+details'],
            'ifsc_patterns': [r'IDIB\d+']
        },
        'KKBK': {
            'codes': ['KKBK'],
            'name_patterns': [r'kotak\s+mahindra\s+bank', r'kotak\s+bank'],
            'upi_patterns': [r'/KKBK/', r'KKBK/[A-Z0-9@]+'],
            'table_patterns': [r'withdrawal\s*\(dr\)\s*/?\s*deposit\s*\(cr\)', r'narration', r'chq\s*/\s*ref\s*no']
        },
        'HDFC': {
            'codes': ['HDFC', 'HDFC000'],
            'name_patterns': [r'hdfc\s+bank', r'hdfc\s+mahindra'],
            'upi_patterns': [r'/HDFC/', r'HDFC/[A-Z0-9@]+', r'HDFC0[A-Z0-9]+'],
            'table_patterns': [r'withdrawal\s*amt', r'deposit\s*amt', r'closing\s*balance', r'value\s*dt', r'chq\.?\s*/\s*ref\.?\s*no']
        },
        'YESB': {
            'codes': ['YESB'],
            'name_patterns': [r'yes\s+bank'],
            'upi_patterns': [r'/YESB/', r'YESB/[A-Z0-9@]+']
        },
        'UTIB': {
            'codes': ['UTIB'],
            'name_patterns': [r'axis\s+bank'],
            'upi_patterns': [r'/UTIB/', r'UTIB/[A-Z0-9@]+']
        },
        'JIOP': {
            'codes': ['JIOP'],
            'name_patterns': [r'jio\s+payments\s+bank'],
            'upi_patterns': [r'/JIOP/', r'JIOP/[A-Z0-9@]+']
        },
        'MAHB': {
            'codes': ['MAHB', 'SBM'],
            'name_patterns': [r'state\s+bank\s+of\s+maharashtra', r'sbm\s+bank', r'mahabank'],
            'upi_patterns': [r'/MAHB/', r'MAHB/[A-Z0-9@]+'],
            'table_patterns': [r'sr\s+no\s+date\s+particulars\s+cheque/reference\s+no', r'cheque/reference\s+no\s+debit\s+credit\s+balance\s+channel'],
            'ifsc_patterns': [r'MAHB[0-9]+'],
            'email_patterns': [r'mahabank\.co\.in']
        }
    }
    
    @staticmethod
    def detect_from_pdf(pdf_path: Path) -> Optional[str]:
        """
        Detect bank type from PDF content.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Bank code (SBIN, IDIB, etc.) or None
        """
        try:
            with pdfplumber.open(str(pdf_path)) as pdf:
                # Read first 3 pages for detection
                sample_text = ""
                sample_pages = min(3, len(pdf.pages))
                
                for i in range(sample_pages):
                    page = pdf.pages[i]
                    text = page.extract_text()
                    if text:
                        sample_text += text + "\n"
                
                # Try table extraction for patterns
                table_headers = []
                for i in range(sample_pages):
                    page = pdf.pages[i]
                    tables = page.extract_tables()
                    for table in tables:
                        if table:
                            for row in table:
                                if row:
                                    row_text = ' '.join([str(cell) for cell in row if cell])
                                    sample_text += row_text + "\n"
                                    # Capture first row as potential header
                                    if len(row) > 4:
                                        table_headers.append(row)
            
            # Detect Kotak format type
            bank_code = BankDetector._analyze_text(sample_text)
            if bank_code == 'KKBK':
                # Check which Kotak format this is
                format_type = BankDetector._detect_kotak_format(sample_text, table_headers)
                if format_type == 'V2':
                    return 'KKBK_V2'
                else:
                    return 'KKBK'
            
            return bank_code
        except Exception as e:
            print(f"Error detecting bank from PDF: {e}")
            return None
    
    @staticmethod
    def _detect_kotak_format(text: str, table_headers: List) -> str:
        """
        Detect which Kotak statement format is being used.
        
        Args:
            text: Extracted text from PDF
            table_headers: List of potential table header rows
            
        Returns:
            'V1' or 'V2'
        """
        text_lower = text.lower()
        
        # Type 2 indicators: Separate DEBIT and CREDIT columns
        type2_indicators = [
            r'debit\s+credit\s+balance',
            r'\bdebit\b.*\bcredit\b',
            r'transaction\s+details\s+debit',
        ]
        
        for indicator in type2_indicators:
            if re.search(indicator, text_lower):
                return 'V2'
        
        # Check table headers for format
        for header_row in table_headers:
            if len(header_row) >= 6:
                # Convert header row to string and check
                header_text = ' '.join([str(cell).lower() for cell in header_row if cell])
                if 'debit' in header_text and 'credit' in header_text:
                    return 'V2'
        
        # Type 1 indicators: Combined withdrawal/deposit column
        type1_indicators = [
            r'withdrawal\s*\(dr\)\s*/?\s*deposit\s*\(cr\)',
        ]
        
        for indicator in type1_indicators:
            if re.search(indicator, text_lower):
                return 'V1'
        
        # Default to V1 if unclear
        return 'V1'
    
    @staticmethod
    def detect_from_excel(file_path: Path) -> Optional[str]:
        """
        Detect bank type from Excel content.
        
        Args:
            file_path: Path to Excel file
            
        Returns:
            Bank code (SBIN, IDIB, etc.) or None
        """
        try:
            # Read first few rows
            df = pd.read_excel(file_path, nrows=50)
            
            sample_text = ""
            # Convert all columns to text and combine
            for col in df.columns:
                sample_text += str(col) + " "
            
            # Sample from first few rows
            for _, row in df.head(10).iterrows():
                for val in row.values:
                    if pd.notna(val):
                        sample_text += str(val) + " "
            
            return BankDetector._analyze_text(sample_text)
        except Exception as e:
            print(f"Error detecting bank from Excel: {e}")
            return None
    
    @staticmethod
    def detect_from_file(file_path: Path) -> Optional[str]:
        """
        Detect bank type from file (PDF or Excel).
        
        Args:
            file_path: Path to file
            
        Returns:
            Bank code (SBIN, IDIB, etc.) or None
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            return None
        
        if file_path.suffix.lower() == '.pdf':
            return BankDetector.detect_from_pdf(file_path)
        elif file_path.suffix.lower() in ['.xls', '.xlsx']:
            return BankDetector.detect_from_excel(file_path)
        else:
            return None
    
    @staticmethod
    def _analyze_text(text: str) -> Optional[str]:
        """
        Analyze text content to identify bank type.
        
        Args:
            text: Text content to analyze
            
        Returns:
            Bank code or None
        """
        if not text:
            return None
        
        text_lower = text.lower()
        scores = {}
        
        # Score each bank based on patterns found
        for bank_code, patterns in BankDetector.BANK_PATTERNS.items():
            score = 0
            
            # Check for bank codes
            for code in patterns['codes']:
                if code in text or code.lower() in text_lower:
                    score += 10
            
            # Check for bank name patterns
            for pattern in patterns.get('name_patterns', []):
                if re.search(pattern, text_lower, re.IGNORECASE):
                    score += 5
            
            # Check for UPI patterns
            for pattern in patterns.get('upi_patterns', []):
                if re.search(pattern, text, re.IGNORECASE):
                    score += 15  # UPI patterns are very specific
            
            # Check for ATM patterns (SBI specific)
            for pattern in patterns.get('atm_patterns', []):
                if re.search(pattern, text, re.IGNORECASE):
                    score += 10
            
            # Check for table header patterns (bank-specific table formats)
            for pattern in patterns.get('table_patterns', []):
                if re.search(pattern, text, re.IGNORECASE):
                    score += 12  # Table patterns are very specific to bank format
            
            # Check for IFSC patterns
            for pattern in patterns.get('ifsc_patterns', []):
                if re.search(pattern, text, re.IGNORECASE):
                    score += 15  # IFSC patterns are very specific
            
            # Check for email domain patterns
            for pattern in patterns.get('email_patterns', []):
                if re.search(pattern, text, re.IGNORECASE):
                    score += 10  # Email domains are specific to banks
            
            if score > 0:
                scores[bank_code] = score
        
        # Return bank with highest score, or None if no clear match
        if scores:
            return max(scores.items(), key=lambda x: x[1])[0]
        
        return None


# Convenience function
def detect_bank_type(file_path: Path) -> Optional[str]:
    """
    Detect bank type from file path.
    
    Args:
        file_path: Path to PDF or Excel file
        
    Returns:
        Bank code or None
    """
    return BankDetector.detect_from_file(Path(file_path))

