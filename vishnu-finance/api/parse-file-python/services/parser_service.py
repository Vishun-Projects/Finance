"""
Parser Service
==============
Main service for orchestrating bank statement parsing.
"""

import sys
import os
from pathlib import Path
from typing import Optional
import pandas as pd

# Add necessary directories to path
parsers_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'parsers')
if parsers_dir not in sys.path:
    sys.path.insert(0, parsers_dir)

parent_dir = os.path.dirname(os.path.dirname(__file__))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import dependencies
try:
    from domain.bank_code import BankCode
    from factories.parser_factory import ParserFactory
    from services.metadata_service import MetadataService
    from parsers.bank_detector import BankDetector
except ImportError:
    try:
        from api.parse_file_python.domain.bank_code import BankCode
        from api.parse_file_python.factories.parser_factory import ParserFactory
        from api.parse_file_python.services.metadata_service import MetadataService
        from api.parse_file_python.parsers.bank_detector import BankDetector
    except ImportError:
        # Fallback imports
        sys.path.insert(0, os.path.dirname(__file__))
        from domain.bank_code import BankCode
        from factories.parser_factory import ParserFactory
        from metadata_service import MetadataService
        from parsers.bank_detector import BankDetector


class ParserService:
    """Service for parsing bank statements."""
    
    def __init__(self):
        """Initialize parser service."""
        if MetadataService:
            self.metadata_service = MetadataService()
        else:
            self.metadata_service = None
    
    def parse(self, file_path: Path, bank_code: Optional[str] = None) -> pd.DataFrame:
        """
        Parse bank statement and return DataFrame.
        
        Args:
            file_path: Path to PDF or Excel file
            bank_code: Optional bank code override
            
        Returns:
            DataFrame with transactions
        """
        df, _ = self.parse_with_metadata(file_path, bank_code)
        return df
    
    def parse_with_metadata(self, file_path: Path, bank_code: Optional[str] = None) -> tuple[pd.DataFrame, dict]:
        """
        Parse bank statement with metadata extraction.
        
        Args:
            file_path: Path to PDF or Excel file
            bank_code: Optional bank code override
            
        Returns:
            Tuple of (DataFrame with transactions, metadata dictionary)
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Detect or normalize bank code
        bank_code_str = self._detect_bank_code(file_path, bank_code)
        if BankCode:
            bank_code_obj = BankCode.from_string(bank_code_str)
        
        # Get parser from factory
        if ParserFactory:
            parser = ParserFactory.create_parser(bank_code_str)
        else:
            raise ImportError("ParserFactory not available")
        if not parser:
            raise ImportError("No parser available - all parser imports failed")
        
        # Parse based on file type
        df = self._parse_file(file_path, parser)
        
        # Deduplicate transactions
        if isinstance(df, pd.DataFrame) and not df.empty:
            df = self._deduplicate_transactions(df)
        
        # Extract metadata
        if self.metadata_service:
            metadata = self.metadata_service.extract_metadata(
                file_path,
                bank_code_str,
                parser,
                df
            )
        else:
            metadata = {}
        
        # Validate transactions
        if isinstance(df, pd.DataFrame) and not df.empty:
            self._validate_transactions(df, bank_code_str, metadata)
        
        return df, metadata
    
    def _detect_bank_code(self, file_path: Path, bank_code: Optional[str] = None) -> Optional[str]:
        """Detect bank code from file or use provided code."""
        if bank_code:
            return bank_code.upper().strip()
        
        # Try BankDetector first
        if BankDetector:
            try:
                detected = BankDetector.detect_from_file(file_path)
                if detected:
                    return detected
            except Exception as e:
                print(f"Bank detection failed: {e}", file=sys.stderr)
        
        # Fallback: detect from filename using BankCode
        if BankCode:
            bank_code_obj = BankCode.detect_from_filename(file_path.stem)
            if bank_code_obj:
                return str(bank_code_obj)
        
        return None
    
    def _parse_file(self, file_path: Path, parser) -> pd.DataFrame:
        """Parse file using parser."""
        file_suffix = file_path.suffix.lower()
        
        if file_suffix == '.pdf':
            result = parser.parse_pdf(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_suffix}. Only PDF files are supported.")
        
        # Ensure result is DataFrame (never tuple)
        if isinstance(result, tuple) and len(result) >= 1:
            df = result[0]
        elif isinstance(result, pd.DataFrame):
            df = result
        else:
            df = pd.DataFrame()
        
        # Ensure df is a DataFrame
        if not isinstance(df, pd.DataFrame):
            print(f"Warning: Parser returned non-DataFrame (type: {type(df)}), creating empty DataFrame", file=sys.stderr)
            df = pd.DataFrame()
        
        return df
    
    def _deduplicate_transactions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove duplicate transactions."""
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
                str(row.get('description', ''))[:100],
                str(row.get('debit', 0)),
                str(row.get('credit', 0))
            ]
            key = '|'.join(key_parts)
            return hashlib.md5(key.encode()).hexdigest()
        
        # Add hash column
        df['_hash'] = df.apply(create_hash, axis=1)
        
        # Remove duplicates
        df = df.drop_duplicates(subset=['_hash'], keep='first')
        
        # Remove hash column
        df = df.drop(columns=['_hash'])
        
        return df
    
    def _validate_transactions(self, df: pd.DataFrame, bank_code: Optional[str], metadata: dict):
        """Validate parsed transactions."""
        try:
            from parsers.data_validator import DataValidator
            validation_result = DataValidator.validate_transactions(df, bank_code, metadata)
            
            if validation_result.get('errors') or validation_result.get('warnings'):
                report = DataValidator.generate_validation_report(validation_result)
                print("\n" + report)
                
                if validation_result.get('errors'):
                    print(f"\n⚠️  WARNING: {len(validation_result['errors'])} validation errors found!")
        except Exception as e:
            # Don't fail parsing if validation fails
            print(f"Validation error (non-critical): {e}")


# Convenience functions for backward compatibility
def parse_bank_statement(file_path: Path, bank_code: Optional[str] = None) -> pd.DataFrame:
    """Parse bank statement - returns DataFrame only."""
    service = ParserService()
    return service.parse(file_path, bank_code)


def parse_bank_statement_with_metadata(file_path: Path, bank_code: Optional[str] = None) -> tuple[pd.DataFrame, dict]:
    """Parse bank statement with metadata - returns tuple."""
    service = ParserService()
    return service.parse_with_metadata(file_path, bank_code)

