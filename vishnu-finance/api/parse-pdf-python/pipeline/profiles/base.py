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

    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str, Optional[str]]:
        """
        Approach B: Scoring Engine.
        Returns (Store, Person, Confidence, Commodity, upiId)
        """
        from .categories import get_commodity
        
        cleaned = self.clean_description(text)
        commodity = get_commodity(cleaned)
        
        # Extract UPI ID if present
        upi_id = None
        upi_match = re.search(r'upi/.*?/[^/]+/([^/]+)/', cleaned.lower())
        if upi_match:
            upi_id = upi_match.group(1).strip()
        
        # 1. Fragmentation: Split by semantic delimiters
        # We also split by "INR" or "UPI" if they are surrounded by delimiters
        fragments = [f.strip() for f in re.split(r'[/-]|:|\s{2,}', cleaned) if f.strip()]
        
        candidates = []
        for frag in fragments:
            # NEW: Scrub noise tokens from WITHIN the fragment (e.g. "Indian INR Railways" -> "Indian Railways")
            # We do this BEFORE the anchor check so "Indian INR" isn't discarded
            scrubbed_fragArr = []
            for w in frag.split():
                if w.upper() not in {"INR", "UPI", "NEFT", "RTGS", "IMPS"}:
                    scrubbed_fragArr.append(w)
            scrubbed_frag = " ".join(scrubbed_fragArr)
            if not scrubbed_frag:
                continue
                
            frag = scrubbed_frag # replacing with the scrubbed version for anchor checks

            if len(frag) < 3: 
                continue
            if bool(re.search(r'\d{3,}', frag)): # Hash/ID
                continue
            if frag.upper() in {"UPI", "NEFT", "RTGS", "IMPS", "ACH", "POS"}:
                continue
                
            # Discard fragments that are strictly informational anchors
            if frag.lower() in [
                "card", "branch", "atm", "cash", "deposit", 
                "cheque", "fee", "tax", "charge", "to", "by"
            ]:
                continue
                
            score = 0.5
            
            # Boost if it looks like a person's name
            if self._is_likely_person(frag):
                score += 0.3
            # Boost if it has capitalization
            if any(c.isupper() for c in frag):
                score += 0.2
            # Penalty if it looks like a location/date
            if re.match(r'^(delhi|mumbai|bangalore|chennai|hyderabad)$', frag.lower()):
                score -= 0.3
            
            candidates.append((frag, score))
            
        if not candidates:
            return None, None, 0.0, commodity, upi_id
            
        # 2. Selection: Pick highest score
        best_candidate = max(candidates, key=lambda x: x[1])
        name = best_candidate[0].title()
        conf = min(best_candidate[1], 1.0)
        
        return name, name, conf, commodity, upi_id

    def classify_commodity(self, text: str) -> str:
        from .categories import get_commodity
        return get_commodity(text)

    def _is_likely_person(self, text: str) -> bool:
        """Heuristic: does this fragment look like a personal name?"""
        NOISE = {
            "UPI", "NEFT", "RTGS", "IMPS", "ACH", "POS", "ATM",
            "BANK", "TRANSFER", "PAYMENT", "DEBIT", "CREDIT",
            "INR", "INDIA", "ACCOUNT", "SAVINGS", "CURRENT"
        }
        words = text.split()
        if not words or len(words) > 5:
            return False
        # All words Title Case and none are noise words
        return all(
            w[0].isupper() and w.upper() not in NOISE
            for w in words if w
        )
