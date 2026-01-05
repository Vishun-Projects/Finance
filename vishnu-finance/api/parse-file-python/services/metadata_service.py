"""
Metadata Service
===============
Service for extracting statement metadata from bank statements.
"""

import sys
import os
from pathlib import Path
from typing import Optional, Dict
import pandas as pd

# Add parsers directory to path
parsers_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'parsers')
if parsers_dir not in sys.path:
    sys.path.insert(0, parsers_dir)

try:
    from parsers.statement_metadata import StatementMetadataExtractor
except ImportError:
    try:
        from statement_metadata import StatementMetadataExtractor
    except ImportError:
        StatementMetadataExtractor = None


class MetadataService:
    """Service for extracting statement metadata."""
    
    @staticmethod
    def extract_metadata(
        file_path: Path,
        bank_code: Optional[str],
        parser: Optional[object] = None,
        transactions_df: Optional[pd.DataFrame] = None
    ) -> Dict:
        """
        Extract statement metadata from bank statement file.
        
        Args:
            file_path: Path to PDF or Excel file
            bank_code: Bank code
            parser: Parser instance (optional, for parser-specific extraction)
            transactions_df: DataFrame of transactions (optional)
            
        Returns:
            Dictionary with metadata
        """
        metadata = None
        
        try:
            # For PDF files, try parser-specific extraction first
            if file_path.suffix.lower() == '.pdf' and parser:
                try:
                    if hasattr(parser, 'extract_statement_metadata'):
                        metadata = parser.extract_statement_metadata(
                            file_path,
                            transactions_df if isinstance(transactions_df, pd.DataFrame) and not transactions_df.empty else None
                        )
                except Exception as parser_meta_err:
                    print(f"Parser metadata extraction failed: {parser_meta_err}", file=sys.stderr)
                    metadata = None
            
            # If parser didn't return metadata or it's empty, try direct extraction
            if not metadata or (isinstance(metadata, dict) and not any(metadata.values())):
                if StatementMetadataExtractor:
                    try:
                        metadata = StatementMetadataExtractor.extract_all_metadata(
                            file_path,
                            bank_code,
                            transactions_df if isinstance(transactions_df, pd.DataFrame) and not transactions_df.empty else None
                        )
                    except Exception as direct_meta_err:
                        print(f"Direct metadata extraction failed: {direct_meta_err}", file=sys.stderr)
                        metadata = {}
                else:
                    metadata = {}
            
            # Convert datetime objects to ISO strings for JSON serialization
            if metadata and isinstance(metadata, dict):
                if metadata.get('statementStartDate') and hasattr(metadata['statementStartDate'], 'isoformat'):
                    metadata['statementStartDate'] = metadata['statementStartDate'].isoformat()
                if metadata.get('statementEndDate') and hasattr(metadata['statementEndDate'], 'isoformat'):
                    metadata['statementEndDate'] = metadata['statementEndDate'].isoformat()
                    
        except Exception as e:
            print(f"Metadata extraction error (non-critical): {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            metadata = {}
        
        # Ensure metadata is always a dict
        if metadata is None:
            metadata = {}
        elif not isinstance(metadata, dict):
            metadata = {}
        
        return metadata

