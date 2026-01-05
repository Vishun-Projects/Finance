"""
Multi-Format File Parser
========================
Supports parsing financial data from PDF file formats (bank statements).

Supports statements from major Indian banks:
- SBI (State Bank of India) - SBIN identifier
- Indian Bank - IDIB identifier
- Axis Bank (UTIB), Yes Bank (YESB), Kotak Mahindra Bank (KKBK)
- HDFC Bank, Jio Payments Bank (JIOP)

Extracts transaction data and converts to standardized format.
"""

import sys
import pandas as pd
from pathlib import Path
import os

# PDF support
try:
    import PyPDF2
    import pdfplumber
except ImportError:
    PyPDF2 = None
    pdfplumber = None


def parse_pdf_file(file_path):
    """Parse PDF files using bank-specific parsers."""
    if not pdfplumber:
        raise ImportError("pdfplumber not available for PDF parsing")
    
    # Try new bank-specific parser first
    try:
        from bank_statement_parser import parse_bank_statement
        print(f"DEBUG: Calling parse_bank_statement for {file_path}")
        df = parse_bank_statement(file_path)
        print(f"DEBUG: parse_bank_statement returned type: {type(df)}")
        
        # Ensure result is DataFrame, not tuple
        if isinstance(df, tuple):
            print(f"DEBUG: Result is tuple of length {len(df)}")
            df = df[0]
            print(f"DEBUG: Extracted first element type: {type(df)}")
            
        if isinstance(df, pd.DataFrame):
            print(f"DEBUG: Result is DataFrame, empty={df.empty}")
            if not df.empty:
                return df
        else:
            print(f"DEBUG: Result is NOT DataFrame: {type(df)}")
    except Exception as e:
        print(f"Bank-specific parser failed, trying fallback: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
    
    # Fallback to existing accurate parser
    try:
        from accurate_parser import parse_bank_statement_accurately
        df = parse_bank_statement_accurately(file_path)
        if df is not None and isinstance(df, pd.DataFrame) and not df.empty:
            return df
        return pd.DataFrame()
    except Exception as e:
        print(f"Fallback parser also failed: {e}", file=sys.stderr)
        return pd.DataFrame()


def parse_file(file_path):
    """Main function to parse supported file format (PDF only)."""
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    file_extension = file_path.suffix.lower()
    
    print(f"Parsing {file_extension.upper()} file: {file_path.name}")
    
    try:
        if file_extension == '.pdf':
            return parse_pdf_file(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_extension}. Only PDF files are supported.")
            
    except Exception as e:
        raise Exception(f"Failed to parse {file_extension.upper()} file: {str(e)}")


def main():
    """Test function for command line usage."""
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python multi_format_parser.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        df = parse_file(file_path)
        print(f"SUCCESS: Extracted {len(df)} transactions from {file_path}")
        
        # Save to CSV
        output_file = f"parsed_{Path(file_path).stem}.csv"
        df.to_csv(output_file, index=False)
        print(f"Results saved to: {output_file}")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
