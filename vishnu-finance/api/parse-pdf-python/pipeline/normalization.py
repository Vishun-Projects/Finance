import logging
from typing import List, Dict, Any
from .models import JobContext, FinalTransaction
from .profiles.base import BaseStyle
from .profiles.idbi import IDBIStyle
from .profiles.mahabank import MAHBStyle
from .profiles.sbi import SBIStyle
from .profiles.hdfc import HDFCStyle
from .profiles.kotak import KKBKStyle
from .profiles.axis import AxisStyle
from .profiles.bkid import BKIDStyle
from .profiles.yesb import YESBStyle

logger = logging.getLogger(__name__)

class NormalizationShim:
    """
    Stage 11: Semantic Normalization
    Dynamically switches between bank-specific styles to clean narratives 
    and extract Store/Person entities.
    Updated for Approach B: Returns (Store, Person, Confidence, Commodity)
    """
    
    STYLE_MAP = {
        "MAHB": MAHBStyle,
        "IDIB": IDBIStyle,
        "INDIAN": IDBIStyle,
        "SBIN": SBIStyle,
        "SBI": SBIStyle,
        "HDFC": HDFCStyle,
        "KKBK": KKBKStyle,
        "KOTAK": KKBKStyle,
        "UTIB": AxisStyle,
        "AXIS": AxisStyle,
        "BKID": BKIDStyle,
        "BOI": BKIDStyle,
        "YESB": YESBStyle
    }
    
    def normalize_transactions(self, ctx: JobContext, transactions: List[FinalTransaction]) -> List[FinalTransaction]:
        bank_code = ctx.bank_code or "UNKNOWN"
        logger.info(f"Starting Stage 11: Semantic Normalization [Style: {bank_code}]")
        
        style_class = self.STYLE_MAP.get(bank_code, BaseStyle)
        style = style_class(ctx) # Pass context to style
        
        suspicious_rows = []
        for txn in transactions:
            raw = txn.description
            
            # 1. Extract Entities (Store/Person, Confidence, Commodity)
            store, person, conf, comm = style.extract_entities(raw)
            
            txn.store = store
            txn.personName = person
            txn.confidence = conf if conf > 0 else txn.confidence
            txn.commodity = comm
            
            # 2. Clean Final Narrative (keeps it readable in UI)
            txn.description = style.clean_description(raw)
            
            # 3. Diagnostic: Flag low confidence for review
            if conf < 0.4 and (store or person):
                suspicious_rows.append({
                    "raw": raw,
                    "extracted": store or person,
                    "confidence": conf
                })
        
        if suspicious_rows:
            logger.warning(f"Semantic Extraction: {len(suspicious_rows)} rows have low confidence. See Diagnostic Logs.")
            
        return transactions
