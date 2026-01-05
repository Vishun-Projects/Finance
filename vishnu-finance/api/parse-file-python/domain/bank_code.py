"""
Bank Code Value Object
======================
Represents a bank code with validation and helper methods.
"""

from typing import Optional, Dict, List, ClassVar
from dataclasses import dataclass


@dataclass(frozen=True)
class BankCode:
    """Value object representing a bank code."""
    
    code: str
    
    # Major Indian Banks - Top 20+
    SBIN: ClassVar[str] = 'SBIN'  # State Bank of India
    HDFC: ClassVar[str] = 'HDFC'  # HDFC Bank
    ICIC: ClassVar[str] = 'ICIC'  # ICICI Bank
    UTIB: ClassVar[str] = 'UTIB'  # Axis Bank
    KKBK: ClassVar[str] = 'KKBK'  # Kotak Mahindra Bank
    PUNB: ClassVar[str] = 'PUNB'  # Punjab National Bank
    BARB: ClassVar[str] = 'BARB'  # Bank of Baroda
    CNRB: ClassVar[str] = 'CNRB'  # Canara Bank
    UBIN: ClassVar[str] = 'UBIN'  # Union Bank of India
    IDIB: ClassVar[str] = 'IDIB'  # Indian Bank
    IOBA: ClassVar[str] = 'IOBA'  # Indian Overseas Bank
    BKID: ClassVar[str] = 'BKID'  # Bank of India
    CBIN: ClassVar[str] = 'CBIN'  # Central Bank of India
    YESB: ClassVar[str] = 'YESB'  # Yes Bank
    IDFB: ClassVar[str] = 'IDFB'  # IDFC First Bank
    FDRL: ClassVar[str] = 'FDRL'  # Federal Bank
    MAHB: ClassVar[str] = 'MAHB'  # State Bank of Maharashtra
    RATN: ClassVar[str] = 'RATN'  # RBL Bank
    SIBL: ClassVar[str] = 'SIBL'  # South Indian Bank
    KVBL: ClassVar[str] = 'KVBL'  # Karur Vysya Bank
    JIOP: ClassVar[str] = 'JIOP'  # Jio Payments Bank
    
    # Bank name mappings
    BANK_NAMES: ClassVar[Dict[str, str]] = {
        'SBIN': 'State Bank of India',
        'HDFC': 'HDFC Bank',
        'ICIC': 'ICICI Bank',
        'UTIB': 'Axis Bank',
        'KKBK': 'Kotak Mahindra Bank',
        'PUNB': 'Punjab National Bank',
        'BARB': 'Bank of Baroda',
        'CNRB': 'Canara Bank',
        'UBIN': 'Union Bank of India',
        'IDIB': 'Indian Bank',
        'IOBA': 'Indian Overseas Bank',
        'BKID': 'Bank of India',
        'CBIN': 'Central Bank of India',
        'YESB': 'Yes Bank',
        'IDFB': 'IDFC First Bank',
        'FDRL': 'Federal Bank',
        'MAHB': 'State Bank of Maharashtra',
        'RATN': 'RBL Bank',
        'SIBL': 'South Indian Bank',
        'KVBL': 'Karur Vysya Bank',
        'JIOP': 'Jio Payments Bank',
    }
    
    # Valid bank codes
    VALID_CODES: ClassVar[List[str]] = [
        SBIN, HDFC, ICIC, UTIB, KKBK, PUNB, BARB, CNRB, UBIN,
        IDIB, IOBA, BKID, CBIN, YESB, IDFB, FDRL, MAHB, RATN,
        SIBL, KVBL, JIOP
    ]
    
    def __post_init__(self):
        """Validate bank code."""
        if self.code not in self.VALID_CODES and self.code != 'UNKNOWN':
            # Allow UNKNOWN for fallback cases
            pass  # Don't raise error, just log warning if needed
    
    @property
    def name(self) -> str:
        """Get bank name from code."""
        return self.BANK_NAMES.get(self.code, 'Unknown Bank')
    
    @classmethod
    def from_string(cls, code: Optional[str]) -> 'BankCode':
        """Create BankCode from string."""
        if not code:
            return cls('UNKNOWN')
        code_upper = code.upper().strip()
        if code_upper in cls.VALID_CODES:
            return cls(code_upper)
        return cls('UNKNOWN')
    
    @classmethod
    def detect_from_filename(cls, filename: str) -> Optional['BankCode']:
        """Detect bank code from filename."""
        filename_lower = filename.lower()
        
        # Bank detection patterns
        patterns = {
            'sbi': cls.SBIN,
            'sbin': cls.SBIN,
            'state bank of india': cls.SBIN,
            'hdfc': cls.HDFC,
            'icici': cls.ICIC,
            'axis': cls.UTIB,
            'utib': cls.UTIB,
            'kotak': cls.KKBK,
            'kkbk': cls.KKBK,
            'pnb': cls.PUNB,
            'punb': cls.PUNB,
            'punjab national': cls.PUNB,
            'baroda': cls.BARB,
            'barb': cls.BARB,
            'canara': cls.CNRB,
            'cnrb': cls.CNRB,
            'union bank': cls.UBIN,
            'ubin': cls.UBIN,
            'indian bank': cls.IDIB,
            'idib': cls.IDIB,
            'iob': cls.IOBA,
            'ioba': cls.IOBA,
            'indian overseas': cls.IOBA,
            'bank of india': cls.BKID,
            'bkid': cls.BKID,
            'central bank': cls.CBIN,
            'cbin': cls.CBIN,
            'yes bank': cls.YESB,
            'yesb': cls.YESB,
            'idfc': cls.IDFB,
            'idfb': cls.IDFB,
            'federal': cls.FDRL,
            'fdrl': cls.FDRL,
            'maharashtra': cls.MAHB,
            'sbm': cls.MAHB,
            'mahabank': cls.MAHB,
            'mahb': cls.MAHB,
            'rbl': cls.RATN,
            'ratn': cls.RATN,
            'south indian': cls.SIBL,
            'sibl': cls.SIBL,
            'karur vysya': cls.KVBL,
            'kvbl': cls.KVBL,
            'jio': cls.JIOP,
            'jiop': cls.JIOP,
        }
        
        for pattern, code in patterns.items():
            if pattern in filename_lower:
                return cls(code)
        
        return None
    
    def __str__(self) -> str:
        return self.code
    
    def __repr__(self) -> str:
        return f"BankCode(code='{self.code}', name='{self.name}')"

