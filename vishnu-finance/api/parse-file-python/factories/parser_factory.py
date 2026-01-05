"""
Parser Factory
==============
Factory for creating bank-specific parser instances.
Uses registry pattern for easy extension.
"""

import sys
import os
from typing import Optional

# Add parsers directory to path
parsers_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'parsers')
if parsers_dir not in sys.path:
    sys.path.insert(0, parsers_dir)

# Try importing parsers
try:
    from parsers.base_parser import BaseBankParser
    from parsers.sbi_parser import SBIParser
    from parsers.indian_bank_parser import IndianBankParser
    from parsers.kotak_bank_parser import KotakBankParser
    from parsers.kotak_bank_parser_v2 import KotakBankParserV2
    from parsers.hdfc_bank_parser import HDFCBankParser
    from parsers.sbm_parser import SBMParser
    from parsers.multi_bank_parser import MultiBankParser
except ImportError:
    try:
        from base_parser import BaseBankParser
        from sbi_parser import SBIParser
        from indian_bank_parser import IndianBankParser
        from kotak_bank_parser import KotakBankParser
        from kotak_bank_parser_v2 import KotakBankParserV2
        from hdfc_bank_parser import HDFCBankParser
        from sbm_parser import SBMParser
        from multi_bank_parser import MultiBankParser
    except ImportError as e:
        print(f"Warning: Failed to import parsers: {e}", file=sys.stderr)
        BaseBankParser = None
        SBIParser = None
        IndianBankParser = None
        KotakBankParser = None
        KotakBankParserV2 = None
        HDFCBankParser = None
        SBMParser = None
        MultiBankParser = None


class ParserFactory:
    """Factory for creating bank-specific parser instances."""
    
    # Parser registry - maps bank codes to parser classes
    _parsers: dict[str, type] = {}
    
    @classmethod
    def _initialize_registry(cls):
        """Initialize parser registry."""
        if cls._parsers:
            return  # Already initialized
        
        if SBIParser:
            cls._parsers['SBIN'] = SBIParser
        if IndianBankParser:
            cls._parsers['IDIB'] = IndianBankParser
        if KotakBankParser:
            cls._parsers['KKBK'] = KotakBankParser
        if KotakBankParserV2:
            cls._parsers['KKBK_V2'] = KotakBankParserV2
        if HDFCBankParser:
            cls._parsers['HDFC'] = HDFCBankParser
        if SBMParser:
            cls._parsers['MAHB'] = SBMParser
            cls._parsers['SBM'] = SBMParser  # Alias
    
    @classmethod
    def create_parser(cls, bank_code: Optional[str]) -> Optional[BaseBankParser]:
        """
        Create parser instance for given bank code.
        
        Args:
            bank_code: Bank code (SBIN, HDFC, etc.) or None
            
        Returns:
            Parser instance or None if no parser available
        """
        cls._initialize_registry()
        
        if not bank_code:
            # Use MultiBankParser as fallback
            if MultiBankParser:
                return MultiBankParser('UNKNOWN')
            return None
        
        bank_code_upper = bank_code.upper().strip()
        
        # Check for exact match in registry (bank-specific parsers)
        parser_class = cls._parsers.get(bank_code_upper)
        if parser_class:
            try:
                return parser_class()
            except Exception as e:
                print(f"Warning: Failed to create parser for {bank_code}: {e}", file=sys.stderr)
        
        # For all other banks, use MultiBankParser (generic parser)
        # This works for: ICICI, PNB, BoB, Canara, Union, IOB, BoI, Central, IDFC, Federal, RBL, SIB, KVB, etc.
        if MultiBankParser:
            return MultiBankParser(bank_code_upper)
        
        return None
    
    @classmethod
    def register_parser(cls, bank_code: str, parser_class: type):
        """
        Register a new parser class.
        
        Args:
            bank_code: Bank code
            parser_class: Parser class (must inherit from BaseBankParser)
        """
        cls._initialize_registry()
        cls._parsers[bank_code.upper()] = parser_class
    
    @classmethod
    def get_supported_banks(cls) -> list[str]:
        """Get list of supported bank codes."""
        cls._initialize_registry()
        return list(cls._parsers.keys())
    
    @classmethod
    def is_supported(cls, bank_code: Optional[str]) -> bool:
        """Check if bank code is supported."""
        if not bank_code:
            return False
        cls._initialize_registry()
        return bank_code.upper() in cls._parsers

