from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum

class PdfType(Enum):
    TEXT = "TEXT"
    SCANNED = "SCANNED"
    MIXED = "MIXED"
    EXCEL = "EXCEL"
    TXT = "TXT"


@dataclass
class BBox:
    x0: float
    y0: float
    x1: float
    y1: float

@dataclass
class WordArtifact:
    text: str
    bbox: BBox
    confidence: float
    page: int
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class PageArtifact:
    page_no: int
    words: List[WordArtifact] = field(default_factory=list)
    lines: List[Any] = field(default_factory=list) # Placeholder for line objects
    tables: List[Any] = field(default_factory=list) # Placeholder for table objects
    image_path: Optional[str] = None

@dataclass
class JobContext:
    statement_id: str
    file_path: str
    password: Optional[str] = None
    pdf_type: Optional[PdfType] = None
    pages: List[PageArtifact] = field(default_factory=list)
    bank_profiles: Optional[List[Dict[str, Any]]] = None
    bank_code: Optional[str] = None
    account_holder_name: Optional[str] = None
    detected_entities: Dict[str, str] = field(default_factory=dict)
    status: str = "initialized"
    metadata: Dict[str, Any] = field(default_factory=dict)
    stats: Dict[str, Any] = field(default_factory=dict)

@dataclass
class TransactionCandidate:
    raw_date: Optional[str] = None
    raw_amounts: List[str] = field(default_factory=list)
    raw_balance: Optional[str] = None
    raw_description: Optional[str] = None
    
    # Structured fields from Mapper
    debit: Optional[float] = None
    credit: Optional[float] = None
    balance: Optional[float] = None
    
    # Semantic fields
    store: Optional[str] = None
    personName: Optional[str] = None
    commodity: Optional[str] = None
    
    row_index: int = -1
    page_index: int = -1
    confidence: float = 0.0

@dataclass
class FinalTransaction:
    date: str
    description: str
    debit: float
    credit: float
    balance: float
    confidence: float
    bankCode: Optional[str] = None
    store: Optional[str] = None
    personName: Optional[str] = None
    commodity: Optional[str] = None
    date_iso: Optional[str] = None
    reasons: List[str] = field(default_factory=list)
