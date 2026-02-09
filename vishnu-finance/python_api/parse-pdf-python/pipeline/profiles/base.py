from ..models import JobContext
import re
from typing import List, Tuple, Optional

class BaseStyle:
    """
    Template for Bank-Specific Normalization & Cleaning.
    Now uses Approach B (Scoring Engine) for multi-bank robustness.
    """
    
    # Store Keywords for classification
    STORE_KEYWORDS = [
        "XEROX", "MEDICAL", "GENERAL", "MART", "FOOD", "DINING", "STORE", "CAFE", 
        "RESTAURANT", "PAYTM", "GOPAY", "ZOMATO", "SWIGGY", "RAILWAYS", "GROWW", 
        "ADDAT", "GAMING", "CHALO", "MMRDA", "MMRCL", "AMAZON", "FLIPKART", "BLINKIT", 
        "ZEPTO", "BIGBASKET", "RELIANCE", "JIOMART", "D MART", "NETFLIX", "SPOTIFY",
        "TICKETING", "HOTEL", "MEDICO", "PHARMACY", "HOSPITAL"
    ]

    # Negative Anchors: Fragments that are EXCLUSIVELY noise
    # We use ^...$ for some to avoid discarding good fragments containing these words
    ANCHORS = {
        "IFSC": r'^[A-Z]{4}0[A-Z0-9]{6}$',
        "UPI_HANDLE": r'^.*@.*$',
        "TXN_ID": r'^\d{10,14}$',
        "MASKED": r'.*XXXXX.*',
        "JUNK_ONLY": r'^\s*(UPI|IMPS|NEFT|IFSC|BRANCH|REMARKS|INR|REF|ID|DATE|TRANSACTION|DETAILS|DEBITS|CREDITS|BALANCE|ATM|SERVICE|BRANCH\s*:.*)\s*$',
        "SERIAL": r'^\s*\d{1,5}\s*$',
        "BANK_CODE": r'^(BKID|SBIN|HDFC|ICIC|UTIB|YESB|MAHB|AXIS|TBSB|AIRP|UNBA|BARB|KKBK|IDFB|CNRB)$'
    }

    def __init__(self, ctx: Optional[JobContext] = None):
        self.ctx = ctx

    def clean_description(self, text: str) -> str:
        """Standard pre-cleaning across all banks"""
        if not text: return ""
        # 1. Remove Page x of y
        text = re.sub(r'(?i)\bof\s+\d+\s+Page\s+\d+\b', '', text)
        # 2. Collapse whitespace
        return " ".join(text.split()).strip()

    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str]:
        """
        Approach B: Scoring Engine.
        Returns (Store, Person, Confidence, Commodity)
        """
        from .categories import get_commodity
        
        cleaned = self.clean_description(text)
        commodity = get_commodity(cleaned)
        
        # 1. Fragmentation: Split by semantic delimiters
        # We also split by "INR" or "UPI" if they are surrounded by delimiters
        fragments = [f.strip() for f in re.split(r'[/-]|:|\s{2,}', cleaned) if f.strip()]
        
        candidates = []
        for frag in fragments:
            # NEW: Scrub noise tokens from WITHIN the fragment (e.g. "Indian INR Railways" -> "Indian Railways")
            # We do this BEFORE the anchor check so "Indian INR" isn't discarded
            original_frag = frag
            frag = re.sub(r'\b(INR|UPI|BRANCH|ATM\s+SERVICE)\b', '', frag, flags=re.IGNORECASE)
            frag = " ".join(frag.split()).strip()
            
            if not frag: continue

            # Identify if fragment matches any Negative Anchors
            is_anchor = False
            for name, pattern in self.ANCHORS.items():
                if re.search(pattern, frag, re.IGNORECASE) or re.search(pattern, original_frag, re.IGNORECASE):
                    is_anchor = True
                    break
            
            if is_anchor: continue

            # Scrub isolated numbers/IDs
            frag = re.sub(r'\b\d{10,}\b', '', frag) 
            frag = re.sub(r'^\d+\s+|\s+\d+$', ' ', frag)
            frag = " ".join(frag.split()).strip()
            
            if not frag: continue

            # Calculate Quality Score
            alpha_chars = re.sub(r'[^a-zA-Z\s]', '', frag).strip()
            if len(alpha_chars) < 3: continue
            
            score = len(alpha_chars) 
            if ' ' in alpha_chars: score += 10 # Strong preference for multi-word names
            
            is_store = any(k in alpha_chars.upper() for k in self.STORE_KEYWORDS)
            if is_store: score += 15
            
            candidates.append({
                "fragment": frag,
                "score": score,
                "is_store": is_store
            })
            
        # 2. Selection
        candidates.sort(key=lambda x: x['score'], reverse=True)
        
        if not candidates:
            return None, None, 0.0, commodity
            
        best = candidates[0]
        # Adjust confidence denominator. 
        # A 15-char multi-word name is score 25. A store is 40.
        confidence = min(best['score'] / 30.0, 1.0) 
        
        if best['is_store']:
            return best['fragment'], None, confidence, commodity
        else:
            return None, best['fragment'], confidence, commodity

    def classify_commodity(self, text: str) -> str:
        from .categories import get_commodity
        return get_commodity(text)
