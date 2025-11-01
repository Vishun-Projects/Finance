"""
Unified Bank Statement Parser
==============================
Main entry point for bank statement parsing with auto-detection and deduplication.
"""

import sys
import os
import pandas as pd
from pathlib import Path
from typing import Optional

# Add parsers directory to path
parsers_dir = os.path.join(os.path.dirname(__file__), 'parsers')
if parsers_dir not in sys.path:
    sys.path.insert(0, parsers_dir)

from bank_detector import BankDetector
from sbi_parser import SBIParser
from indian_bank_parser import IndianBankParser
from multi_bank_parser import MultiBankParser
from base_parser import BaseBankParser


def parse_bank_statement(file_path: Path, bank_code: Optional[str] = None) -> pd.DataFrame:
    """
    Parse bank statement with auto-detection.
    
    Args:
        file_path: Path to PDF or Excel file
        bank_code: Optional bank code override (SBIN, IDIB, KKBK, etc.)
        
    Returns:
        DataFrame with transactions and metadata
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Auto-detect bank if not provided
    if not bank_code:
        bank_code = BankDetector.detect_from_file(file_path)
    
    if not bank_code:
        # Fallback: try to extract from filename or use generic parser
        filename = file_path.stem.lower()
        if 'sbi' in filename or 'sbin' in filename:
            bank_code = 'SBIN'
        elif 'indian' in filename or 'idib' in filename:
            bank_code = 'IDIB'
        elif 'kotak' in filename or 'kkbk' in filename:
            bank_code = 'KKBK'
        elif 'hdfc' in filename:
            bank_code = 'HDFC'
        elif 'yes' in filename:
            bank_code = 'YESB'
        elif 'axis' in filename or 'utib' in filename:
            bank_code = 'UTIB'
        elif 'jio' in filename:
            bank_code = 'JIOP'
    
    # Select appropriate parser
    parser: BaseBankParser
    if bank_code == 'SBIN':
        parser = SBIParser()
    elif bank_code == 'IDIB':
        parser = IndianBankParser()
    else:
        # Use generic multi-bank parser
        parser = MultiBankParser(bank_code or 'UNKNOWN')
    
    # Parse based on file type
    if file_path.suffix.lower() == '.pdf':
        df = parser.parse_pdf(file_path)
    elif file_path.suffix.lower() in ['.xls', '.xlsx']:
        df = parser.parse_excel(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_path.suffix}")
    
    # Additional deduplication at DataFrame level
    if not df.empty:
        df = deduplicate_transactions(df)
    
    return df


def deduplicate_transactions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove duplicate transactions from DataFrame.
    
    Args:
        df: DataFrame with transactions
        
    Returns:
        DataFrame without duplicates
    """
    if df.empty:
        return df
    
    # Sort by date
    if 'date_iso' in df.columns:
        df = df.sort_values('date_iso')
    
    # Create hash for deduplication
    def create_hash(row):
        """Create hash from key fields."""
        import hashlib
        key_parts = [
            str(row.get('date_iso', '')),
            str(row.get('description', ''))[:100],  # Limit description length
            str(row.get('debit', 0)),
            str(row.get('credit', 0))
        ]
        key = '|'.join(key_parts)
        return hashlib.md5(key.encode()).hexdigest()
    
    # Add hash column
    df['_hash'] = df.apply(create_hash, axis=1)
    
    # Remove duplicates based on hash
    df = df.drop_duplicates(subset=['_hash'], keep='first')
    
    # Remove hash column
    df = df.drop(columns=['_hash'])
    
    return df


def get_parser_for_bank(bank_code: str) -> BaseBankParser:
    """
    Get appropriate parser for bank code.
    
    Args:
        bank_code: Bank code
        
    Returns:
        Parser instance
    """
    if bank_code == 'SBIN':
        return SBIParser()
    elif bank_code == 'IDIB':
        return IndianBankParser()
    else:
        return MultiBankParser(bank_code)


def main():
    """Test function for command-line usage."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python bank_statement_parser.py <file_path> [bank_code]")
        sys.exit(1)
    
    file_path = Path(sys.argv[1])
    bank_code = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        df = parse_bank_statement(file_path, bank_code)
        
        if df.empty:
            print("No transactions found")
        else:
            print(f"\n[SUCCESS] Successfully extracted {len(df)} transactions")
            bank_detected = df['bankCode'].iloc[0] if 'bankCode' in df.columns and not df['bankCode'].isna().all() else 'Unknown'
            print(f"\nBank detected: {bank_detected}")
            print(f"Date range: {df['date_iso'].min()} to {df['date_iso'].max()}")
            print(f"Total debits: {df['debit'].sum():.2f}")
            print(f"Total credits: {df['credit'].sum():.2f}")
            
            # Save to CSV
            output_file = f"parsed_{file_path.stem}.csv"
            df.to_csv(output_file, index=False)
            print(f"\nResults saved to: {output_file}")
            
            # Show sample
            print("\n=== Sample Transactions ===")
            for i, row in df.head(10).iterrows():
                txn_type = 'Credit' if row.get('credit', 0) > 0 else 'Debit'
                amount = row.get('credit', 0) if row.get('credit', 0) > 0 else row.get('debit', 0)
                desc = row.get('description', '')[:50]
                print(f"{row.get('date_iso', 'N/A')} | {txn_type:>6} | {amount:>10.2f} | {desc}")
    
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
