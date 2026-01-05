"""
Unified Bank Statement Parser (Legacy)
=======================================
This file is kept for backward compatibility.
New code should use services/parser_service.py instead.
"""

import sys
import os
from pathlib import Path
from typing import Optional
import pandas as pd

# Import from new service structure
try:
    from services.parser_service import ParserService, parse_bank_statement as _parse_bank_statement_new, parse_bank_statement_with_metadata as _parse_bank_statement_with_metadata_new
except ImportError:
    try:
        # Try relative import
        sys.path.insert(0, os.path.dirname(__file__))
        from services.parser_service import ParserService, parse_bank_statement as _parse_bank_statement_new, parse_bank_statement_with_metadata as _parse_bank_statement_with_metadata_new
    except ImportError:
        # Fallback: define here (will be replaced by service)
        _parse_bank_statement_new = None
        _parse_bank_statement_with_metadata_new = None


def parse_bank_statement(file_path: Path, bank_code: Optional[str] = None) -> pd.DataFrame:
    """
    Parse bank statement with auto-detection.
    
    Args:
        file_path: Path to PDF or Excel file
        bank_code: Optional bank code override (SBIN, IDIB, KKBK, etc.)
        
    Returns:
        DataFrame with transactions (metadata not included)
    """
    print(f"DEBUG: parse_bank_statement called for {file_path}")
    # Import helper for safe extraction
    try:
        from utils.type_helpers import safe_get_dataframe
    except ImportError:
        # Fallback if utils not found (e.g. running directly)
        sys.path.insert(0, os.path.dirname(__file__))
        from utils.type_helpers import safe_get_dataframe

    if _parse_bank_statement_new:
        print("DEBUG: Using new parser service")
        result = _parse_bank_statement_new(file_path, bank_code)
        print(f"DEBUG: New parser service returned type: {type(result)}")
        return safe_get_dataframe(result)
    
    print("DEBUG: Using legacy parser implementation")
    # Fallback to old implementation if service not available
    result = _legacy_parse_bank_statement(file_path, bank_code)
    print(f"DEBUG: Legacy parser returned type: {type(result)}")
    return safe_get_dataframe(result)


def parse_bank_statement_with_metadata(file_path: Path, bank_code: Optional[str] = None) -> tuple[pd.DataFrame, Optional[dict]]:
    """
    Parse bank statement with metadata extraction.
    
    Args:
        file_path: Path to PDF or Excel file
        bank_code: Optional bank code override
        
    Returns:
        Tuple of (DataFrame with transactions, metadata dictionary)
    """
    if _parse_bank_statement_with_metadata_new:
        return _parse_bank_statement_with_metadata_new(file_path, bank_code)
    # Fallback to old implementation if service not available
    return _legacy_parse_bank_statement_with_metadata(file_path, bank_code)


def _legacy_parse_bank_statement(file_path: Path, bank_code: Optional[str] = None) -> pd.DataFrame:
    """Legacy implementation - kept for fallback."""
    # Import helper for safe extraction
    try:
        from utils.type_helpers import safe_get_dataframe
    except ImportError:
        sys.path.insert(0, os.path.dirname(__file__))
        from utils.type_helpers import safe_get_dataframe
        
    result = _legacy_parse_bank_statement_with_metadata(file_path, bank_code)
    return safe_get_dataframe(result)


def _legacy_parse_bank_statement_with_metadata(file_path: Path, bank_code: Optional[str] = None) -> tuple[pd.DataFrame, Optional[dict]]:
    """Legacy implementation - kept for fallback."""
    # Import legacy dependencies
    import sys
    import os
    import pandas as pd
    
    parsers_dir = os.path.join(os.path.dirname(__file__), 'parsers')
    if parsers_dir not in sys.path:
        sys.path.insert(0, parsers_dir)
    
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
    
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Auto-detect bank if not provided
    if not bank_code and BankDetector:
        try:
            bank_code = BankDetector.detect_from_file(file_path)
        except Exception as e:
            print(f"Bank detection failed: {e}", file=sys.stderr)
    
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
        elif 'maharashtra' in filename or 'sbm' in filename or 'mahabank' in filename or 'mahb' in filename:
            bank_code = 'MAHB'
    
    # Select appropriate parser
    parser: BaseBankParser = None
    if bank_code == 'SBIN' and SBIParser:
        parser = SBIParser()
    elif bank_code == 'IDIB' and IndianBankParser:
        parser = IndianBankParser()
    elif bank_code == 'KKBK' and KotakBankParser:
        parser = KotakBankParser()
    elif bank_code == 'KKBK_V2' and KotakBankParserV2:
        parser = KotakBankParserV2()
    elif bank_code == 'HDFC' and HDFCBankParser:
        parser = HDFCBankParser()
    elif bank_code == 'MAHB' and SBMParser:
        parser = SBMParser()
    elif MultiBankParser:
        # Use generic multi-bank parser
        parser = MultiBankParser(bank_code or 'UNKNOWN')
    
    if not parser:
        raise ImportError("No parser available - all parser imports failed")
    
    # Parse based on file type
    # Parse based on file type
    if file_path.suffix.lower() == '.pdf':
        result = parser.parse_pdf(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_path.suffix}. Only PDF files are supported.")
    
    # Handle case where parser returns tuple (df, metadata) instead of just df
    if isinstance(result, tuple) and len(result) >= 1:
        df = result[0]
    elif isinstance(result, pd.DataFrame):
        df = result
    else:
        # If result is not a DataFrame or tuple, create empty DataFrame
        df = pd.DataFrame()
    
    # Ensure df is a DataFrame
    if not isinstance(df, pd.DataFrame):
        print(f"Warning: df is not a DataFrame (type: {type(df)}), creating empty DataFrame", file=sys.stderr)
        df = pd.DataFrame()
    
    # Additional deduplication at DataFrame level
    if isinstance(df, pd.DataFrame) and not df.empty:
        df = deduplicate_transactions(df)
    
    # Extract statement metadata (MANDATORY - always attempt extraction)
    metadata = None
    try:
        if file_path.suffix.lower() == '.pdf':
            # Try to extract metadata from parser first
            try:
                metadata = parser.extract_statement_metadata(file_path, df if isinstance(df, pd.DataFrame) and not df.empty else None)
            except Exception as parser_meta_err:
                print(f"Parser metadata extraction failed: {parser_meta_err}", file=sys.stderr)
                metadata = None
            
            # If parser didn't return metadata, try direct extraction
            if not metadata or (isinstance(metadata, dict) and not any(metadata.values())):
                try:
                    from parsers.statement_metadata import StatementMetadataExtractor
                    metadata = StatementMetadataExtractor.extract_all_metadata(file_path, bank_code, df if isinstance(df, pd.DataFrame) and not df.empty else None)
                    print(f"Direct metadata extraction: openingBalance={metadata.get('openingBalance')}, accountNumber={metadata.get('accountNumber')}", file=sys.stderr)
                except Exception as direct_meta_err:
                    print(f"Direct metadata extraction failed: {direct_meta_err}", file=sys.stderr)
                    metadata = {}
            
            # Convert datetime objects to ISO strings for JSON serialization
            if metadata and isinstance(metadata, dict):
                if metadata.get('statementStartDate') and hasattr(metadata['statementStartDate'], 'isoformat'):
                    metadata['statementStartDate'] = metadata['statementStartDate'].isoformat()
                elif metadata.get('statementStartDate'):
                    # Already a string, keep as is
                    pass
                if metadata.get('statementEndDate') and hasattr(metadata['statementEndDate'], 'isoformat'):
                    metadata['statementEndDate'] = metadata['statementEndDate'].isoformat()
                elif metadata.get('statementEndDate'):
                    # Already a string, keep as is
                    pass
    except Exception as e:
        print(f"Metadata extraction error (non-critical): {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        metadata = {}  # Return empty dict instead of None
    
    # Ensure metadata is always a dict
    if metadata is None:
        metadata = {}
    elif not isinstance(metadata, dict):
        metadata = {}
    
    # Post-parse validation (after metadata extraction)
    if isinstance(df, pd.DataFrame) and not df.empty:
        try:
            from parsers.data_validator import DataValidator
            validation_result = DataValidator.validate_transactions(df, bank_code, metadata)
            
            # Print validation report if there are errors
            if validation_result.get('errors') or validation_result.get('warnings'):
                from parsers.data_validator import DataValidator
                report = DataValidator.generate_validation_report(validation_result)
                print("\n" + report)
                
                # If there are critical errors, log them
                if validation_result.get('errors'):
                    print(f"\n⚠️  WARNING: {len(validation_result['errors'])} validation errors found!")
        except Exception as e:
            # Don't fail parsing if validation fails
            print(f"Validation error (non-critical): {e}")
    
    return df, metadata


# Backward compatibility: keep old function signature as alias
# This will be removed in future versions
def _parse_bank_statement_legacy(file_path: Path, bank_code: Optional[str] = None) -> tuple[pd.DataFrame, Optional[dict]]:
    """Legacy function - use parse_bank_statement_with_metadata instead."""
    return parse_bank_statement_with_metadata(file_path, bank_code)


def deduplicate_transactions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove duplicate transactions from DataFrame.
    
    Args:
        df: DataFrame with transactions
        
    Returns:
        DataFrame without duplicates
    """
    if not isinstance(df, pd.DataFrame) or df.empty:
        return df if isinstance(df, pd.DataFrame) else pd.DataFrame()
    
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


from typing import Optional, Any
import pandas as pd

# ... (existing code) ...

def get_parser_for_bank(bank_code: str) -> Any:
    """
    Get appropriate parser for bank code.
    
    Args:
        bank_code: Bank code
        
    Returns:
        Parser instance
    """
    # Import parsers locally to avoid circular imports
    try:
        from parsers.sbi_parser import SBIParser
        from parsers.indian_bank_parser import IndianBankParser
        from parsers.kotak_bank_parser import KotakBankParser
        from parsers.kotak_bank_parser_v2 import KotakBankParserV2
        from parsers.hdfc_bank_parser import HDFCBankParser
        from parsers.sbm_parser import SBMParser
        from parsers.multi_bank_parser import MultiBankParser
    except ImportError:
        # Fallback for direct execution
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'parsers'))
        from sbi_parser import SBIParser
        from indian_bank_parser import IndianBankParser
        from kotak_bank_parser import KotakBankParser
        from kotak_bank_parser_v2 import KotakBankParserV2
        from hdfc_bank_parser import HDFCBankParser
        from sbm_parser import SBMParser
        from multi_bank_parser import MultiBankParser

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
    
    if len(sys.argv) < 2:
        print("Usage: python bank_statement_parser.py <file_path> [bank_code]")
        sys.exit(1)
    
    file_path = Path(sys.argv[1])
    bank_code = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        df, metadata = parse_bank_statement_with_metadata(file_path, bank_code)
        
        if not isinstance(df, pd.DataFrame) or df.empty:
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
