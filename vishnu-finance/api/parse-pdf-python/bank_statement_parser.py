"""
Unified Bank Statement Parser
==============================
Main entry point for bank statement parsing with auto-detection and deduplication.
"""

import sys
import os
import pandas as pd
from pathlib import Path
from typing import Optional, List, Dict, Any

# Add parsers directory to path for local imports
parsers_dir = os.path.join(os.path.dirname(__file__), 'parsers')
if parsers_dir not in sys.path:
    sys.path.insert(0, parsers_dir)

# Try importing from parsers subdirectory first, then fallback to direct import
try:
    from parsers.bank_detector import BankDetector
    from parsers.sbi_parser import SBIParser
    from parsers.indian_bank_parser import IndianBankParser
    from parsers.kotak_bank_parser import KotakBankParser
    from parsers.kotak_bank_parser_v2 import KotakBankParserV2
    from parsers.hdfc_bank_parser import HDFCBankParser
    from parsers.sbm_parser import SBMParser
    from parsers.multi_bank_parser import MultiBankParser
    from parsers.base_parser import BaseBankParser
except ImportError:
    try:
        # Fallback to direct imports from parsers directory
        from bank_detector import BankDetector
        from sbi_parser import SBIParser
        from indian_bank_parser import IndianBankParser
        from kotak_bank_parser import KotakBankParser
        from kotak_bank_parser_v2 import KotakBankParserV2
        from hdfc_bank_parser import HDFCBankParser
        from sbm_parser import SBMParser
        from multi_bank_parser import MultiBankParser
        from base_parser import BaseBankParser
    except ImportError as e:
        # If all imports fail, set to None and handle gracefully
        print(f"Warning: Failed to import parsers: {e}", file=sys.stderr)
        BankDetector = None
        SBIParser = None
        IndianBankParser = None
        KotakBankParser = None
        KotakBankParserV2 = None
        HDFCBankParser = None
        SBMParser = None
        MultiBankParser = None
        BaseBankParser = None


def parse_bank_statement(file_path: Path, bank_code: Optional[str] = None, password: Optional[str] = None, bank_profiles: Optional[List[Dict]] = None) -> tuple[pd.DataFrame, Optional[dict]]:
    """
    Parse bank statement using the new 14-stage Pipeline Engine.
    
    Args:
        file_path: Path to PDF or Excel file
        bank_code: Optional bank code override
        password: Optional password for encrypted PDFs
        bank_profiles: Optional list of bank profiles from DB
        
    Returns:
        DataFrame with transactions and metadata
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    try:
        # Import new Pipeline Manager
        from pipeline.manager import PipelineManager
        
        manager = PipelineManager()
        # Statement ID is arbitrary for local runs, or could be filename
        statement_id = file_path.stem 
        
        # Run Pipeline
        result = manager.run_pipeline(str(file_path), statement_id=statement_id, password=password, bank_profiles=bank_profiles)
        
        if result.get("status") == "failed":
            print(f"Pipeline failed: {result.get('error')}", file=sys.stderr)
            return pd.DataFrame(), {}
            
        # Convert transactions list to DataFrame
        transactions = result.get("transactions", [])
        if not transactions:
            return pd.DataFrame(), {}
            
        df = pd.DataFrame(transactions)
        
        # Normalize columns to match expected legacy output if needed
        # Legacy columns often include: date, description, debit, credit, balance, bankCode
        # Our new pipeline outputs these keys in lowercase.
        
        # Add bank code to DF
        detected_bank = result.get("bank", "Unknown")
        df["bankCode"] = detected_bank
        
        # Rename 'amount' to specific needs if legacy app expects signed/unsigned?
        # Legacy often used debit/credit columns which we have.
        
        # Metadata extraction
        metadata = result.get("metadata", {})
        metadata["bank"] = detected_bank
        
        return df, metadata

    except Exception as e:
        print(f"Critical Error in Partition Engine: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return pd.DataFrame(), {}



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
    elif bank_code == 'KKBK':
        return KotakBankParser()
    elif bank_code == 'KKBK_V2':
        return KotakBankParserV2()
    elif bank_code == 'HDFC':
        return HDFCBankParser()
    elif bank_code == 'MAHB':
        return SBMParser()
    else:
        return MultiBankParser(bank_code)


def main():
    """Test function for command-line usage."""
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Parse bank statement')
    parser.add_argument('file_path', type=Path, help='Path to file')
    parser.add_argument('bank_code', nargs='?', default=None, help='Bank code')
    parser.add_argument('--password', help='PDF Password')
    
    args = parser.parse_args()
    
    try:
        df, metadata = parse_bank_statement(args.file_path, args.bank_code, args.password)
        
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
