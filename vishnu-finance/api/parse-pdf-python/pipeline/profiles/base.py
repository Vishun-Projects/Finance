from ..models import JobContext
import re
from typing import List, Tuple, Optional

# Brand map: VPA prefix → clean display name (used by all banks for UNKNOWN style)
_BRAND_MAP = {
    "blinkit.payu": "Blinkit",
    "blinkit": "Blinkit",
    "zomato4.payu": "Zomato",
    "zomato": "Zomato",
    "swiggy": "Swiggy",
    "swiggyit": "Swiggy",
    "amazonupi": "Amazon",
    "amazon": "Amazon",
    "amazon.refunds": "Amazon (Refund)",
    "amazonpaygrocery": "Amazon Pay",
    "amznlpa": "Amazon",
    "gpayrecharge": "Google Pay",
    "gpay": "Google Pay",
    "googlepay": "Google Pay",
    "playstore": "Google Play Store",
    "google": "Google",
    "netflix.bd": "Netflix",
    "hotstar": "Disney+ Hotstar",
    "jioinappdirect": "Jio Recharge",
    "jio": "Jio",
    "bajajfinanceieplqr": "Bajaj Finance",
    "bajajfinancelimwl3": "Bajaj Finance",
    "bajajfinserv.payu": "Bajaj Finserv",
    "bajaj": "Bajaj Finance",
    "getsimpl": "Simpl",
    "cf.simp": "Simpl",
    "simpl": "Simpl",
    "zepto.payu": "Zepto",
    "zepto": "Zepto",
    "vrlonline": "VRL Travels",
    "vrl.bdpg": "VRL Travels",
    "vrl": "VRL Travels",
    "paytm-axiocf": "AXIO",
    "pinelabs": "Pine Labs",
    "zomatopay": "Zomato Pay",
    "cred.club": "CRED",
    "credpay": "CRED",
    "phonepe": "PhonePe",
    "bharatpe": "BharatPe",
    "payzapp": "PayZapp",
    "mobikwik": "MobiKwik",
    "ubereat": "Uber Eats",
    "ola.money": "Ola Money",
    "dunzo": "Dunzo",
    "bigbasket": "BigBasket",
    "jiomart": "JioMart",
    "irctc": "IRCTC",
    "nykaa": "Nykaa",
    "ajio": "Ajio",
    "tataneu": "Tata Neu",
    "tatacliq": "Tata Cliq",
    "myntra": "Myntra",
    "blinkit": "Blinkit",
    "zomato": "Zomato",
    "swiggy": "Swiggy",
    "bajaj": "Bajaj Finance",
    "google": "Google Pay",
    "simpl": "Simpl",
    "zepto": "Zepto",
    "vrl": "VRL Travels",
    "axio": "AXIO",
    "aj nursery": "A J Nursery",
    "nirvi": "Nirvi Medicals",
    "shree mahal": "Shree Mahalaxmi",
}
_UPI_COLON_RE = re.compile(r'UPI:\d+:([^@(]+)@[^@(]+\(([^)]+)\)?', re.IGNORECASE)
_MERCHANT_FRAGS = {"ZOMATO", "SWIGGY", "BLINKIT", "ZEPTO", "AMAZON", "FLIPKART", "GOOGLE", "BAJAJ", "SIMPL", "JIO", "RECHARGE", "PAYTM", "VRL", "AXIO", "ZOMATO4", "BAJAJFINANCE", "BLINKIT.PAYU"}

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
        "TICKETING", "HOTEL", "MEDICO", "PHARMACY", "HOSPITAL", "ENTERPRISES", "TRAVELS",
        "TRADERS", "REFRIGERATION", "ELECTRONICS", "TELECOM", "MOBILE", "BAKERY", "DAIRY"
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
        "BANK_CODE": r'^(BKID|SBIN|HDFC|ICIC|UTIB|YESB|MAHB|AXIS|TBSB|AIRP|UNBA|BARB|KKBK|IDFB|CNRB|KARB)$'
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
        
        # ── Priority 0: Karnataka / Standard UPI colon format ──────────────
        # Matches: UPI:REFNO:vpa@bank(HUMAN NAME) or UPI:REFNO:vpa@bank(NAME
        upi_col = _UPI_COLON_RE.search(cleaned)
        if upi_col:
            vpa_user = upi_col.group(1).strip().lower()   # e.g. "blinkit.payu"
            paren_name = upi_col.group(2).strip()           # e.g. "Blinkit" or "ALIUL HOQUE"
            upi_id = upi_col.group(1) + '@' + cleaned.split('@')[1].split('(')[0] if '@' in cleaned else None
            
            # 1. Try brand map first
            brand = None
            if vpa_user in _BRAND_MAP:
                brand = _BRAND_MAP[vpa_user]
            else:
                for key, val in _BRAND_MAP.items():
                    if vpa_user.startswith(key):
                        brand = val; break
            
            # 2. Try partial match on the human name if brand not found
            if not brand:
                u_name = paren_name.upper()
                for kw in _MERCHANT_FRAGS:
                    if kw in u_name:
                        brand = _BRAND_MAP.get(kw.lower(), kw.title())
                        break

            if brand:
                return brand, None, 0.99, get_commodity(brand), upi_id

            # Fall back to the human name from parentheses
            name = paren_name.strip()
            # Remove trailing colon/extra keywords like :UPI or -KBLUP
            name = re.sub(r'[:\-].*$', '', name).strip()
            
            # IMPROVEMENT: If name is truncated/junk, try VPA heuristic
            if len(name) <= 3 and len(vpa_user) > 5:
                # e.g. "raghavendrakaranth205" -> "Raghavendra Karanth"
                possible = re.sub(r'[\d\-_.]', ' ', vpa_user).strip().title()
                if len(possible.split()) >= 2:
                    name = possible
            
            name = name.title()
            
            is_store = any(kw in name.upper() for kw in self.STORE_KEYWORDS)
            if is_store:
                return name, None, 0.9, commodity, upi_id
            return None, name, 0.9, commodity, upi_id
        
        # Extract UPI ID if present (slash format for other banks)
        upi_id = None
        upi_match = re.search(r'upi/.*?/[^/]+/([^/]+)/', cleaned.lower())
        if upi_match:
            upi_id = upi_match.group(1).strip()
        
        # 1. Fragmentation: Split by semantic delimiters
        # We also split by "INR" or "UPI" if they are surrounded by delimiters
        fragments = [f.strip() for f in re.split(r'[/-]|:|\s{2,}', cleaned) if f.strip()]
        
        candidates = []
        for frag in fragments:
            # 1. Check brand map for this fragment
            u_frag = frag.upper()
            found_brand = None
            for kw in _MERCHANT_FRAGS:
                if kw in u_frag:
                    found_brand = _BRAND_MAP.get(kw.lower(), kw.title())
                    break
            if found_brand:
                return found_brand, None, 0.95, get_commodity(found_brand), upi_id

            # NEW: Scrub noise tokens from WITHIN the fragment...
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
