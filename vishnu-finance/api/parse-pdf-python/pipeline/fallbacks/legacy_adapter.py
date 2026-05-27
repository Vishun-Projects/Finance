"""
Legacy parser adapters — thin wrappers kept for bank-specific table/text fallbacks.
Primary parsing is handled by pipeline.orchestrator.ParseOrchestrator.
"""

from pathlib import Path
from typing import Optional

import pandas as pd

try:
    from parsers.hdfc_bank_parser import HDFCBankParser
    from parsers.sbi_parser import SBIParser
    from parsers.multi_bank_parser import MultiBankParser
except ImportError:
    HDFCBankParser = None
    SBIParser = None
    MultiBankParser = None


_BANK_PARSER_MAP = {
    "HDFC": HDFCBankParser,
    "SBIN": SBIParser,
    "SBI": SBIParser,
    "KKBK": MultiBankParser,
    "KOTAK": MultiBankParser,
}


def parse_with_legacy_bank_parser(file_path: str, bank_code: Optional[str] = None) -> pd.DataFrame:
    """Invoke a legacy bank parser when orchestrator table fallback needs bank-specific logic."""
    code = (bank_code or "").upper()
    parser_cls = _BANK_PARSER_MAP.get(code)
    if not parser_cls:
        return pd.DataFrame()

    if parser_cls is MultiBankParser:
        parser = MultiBankParser(code or "UNKNOWN")
    else:
        parser = parser_cls()

    path = Path(file_path)
    if path.suffix.lower() in (".xls", ".xlsx"):
        return parser.parse_excel(path)
    return parser.parse_pdf(path)
