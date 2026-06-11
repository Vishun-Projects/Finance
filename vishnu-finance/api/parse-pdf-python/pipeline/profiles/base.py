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
    "spotify": "Spotify",
    "spotifyindia": "Spotify",
    "uber": "Uber",
    "uberindia": "Uber",
    "airtel": "Airtel",
    "razorpay": "Razorpay",
    "rzp": "Razorpay",
    "western": "Western",
    "netflix": "Netflix",
    "hotstar": "Disney+ Hotstar",
}
_UPI_COLON_RE = re.compile(r'UPI:\d+:([^@(]+)@[^@(]+\(([^)]+)\)?', re.IGNORECASE)
_BANK_UPI_SLASH_RE = re.compile(r'[A-Z]{4}0[A-Z0-9]*UPI/([^/]+)', re.IGNORECASE)
_BANK_CODE_SLASH_RE = re.compile(r'[A-Z]{4}\d+/([^/]+?)(?:\s*/|\s*$)', re.IGNORECASE)
_VPA_RE = re.compile(r'[a-z0-9._-]+@[a-z0-9._-]+', re.IGNORECASE)
_MERCHANT_FRAGS = {"ZOMATO", "SWIGGY", "BLINKIT", "ZEPTO", "AMAZON", "FLIPKART", "GOOGLE", "BAJAJ", "SIMPL", "JIO", "RECHARGE", "PAYTM", "VRL", "AXIO", "ZOMATO4", "BAJAJFINANCE", "BLINKIT.PAYU", "SPOTIFY", "UBER", "AIRTEL", "NETFLIX", "RAZORPAY", "WESTERN"}
_PAYMENT_RAIL_BRANDS = {
    "PAYTM", "PHONEPE", "GPAY", "GOOGLE PAY", "BHARATPE", "PAYZAPP", "MOBIKWIK",
}
_COMPANY_MARKERS = ("LIMITED", "PRIVATE", "PVT", "LLP", "SYSTEMS", "ENTERPRISES", "SERVICES", "CORP", "INC")
_JUNK_PERSON_NAMES = {"MAN", "MANDATE", "MANDATEREQUEST", "BOTM", "BRANCH", "ATM", "UPI", "NEFT", "RTGS", "IMPS", "INR", "REF", "RE"}
_NEFT_BANK_CODES = {"BOTM", "HDFC", "ICIC", "SBIN", "YESB", "UTIB", "AXIS", "IDFB", "CNRB", "BARB", "MAHB", "BKID", "KKBK", "AIRP", "UNBA"}

class BaseStyle:
    """
    Template for Bank-Specific Normalization & Cleaning.
    Now uses Approach B (Scoring Engine) for multi-bank robustness.
    """
    
    # Store Keywords for classification
    STORE_KEYWORDS = [
        "XEROX", "MEDICAL", "GENERAL", "MART", "FOOD", "DINING", "STORE", "CAFE", 
        "RESTAURANT", "GOPAY", "ZOMATO", "SWIGGY", "RAILWAYS", "GROWW", 
        "ADDAT", "GAMING", "CHALO", "MMRDA", "MMRCL", "AMAZON", "FLIPKART", "BLINKIT", 
        "ZEPTO", "BIGBASKET", "RELIANCE", "JIOMART", "D MART", "NETFLIX", "SPOTIFY",
        "TICKETING", "HOTEL", "MEDICO", "PHARMACY", "HOSPITAL", "ENTERPRISES", "TRAVELS",
        "TRADERS", "REFRIGERATION", "ELECTRONICS", "TELECOM", "MOBILE", "BAKERY", "DAIRY",
        "COUNTER", "STATIONERY", " QR"
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
        # 2. Strip common Indian bank footer/legal blocks
        footer_patterns = [
            r"(?i)closing\s*balance\s*includes\s*funds.*",
            r"(?i)contents\s*of\s*this\s*statement.*",
            r"(?i)the\s*address\s*on\s*this\s*statement.*",
            r"(?i)registered\s*office\s*address.*",
            r"(?i)state\s*account\s*branch\s*gstn.*",
            r"(?i)hdfc\s*bank\s*gstin.*",
            r"(?i)goods-and-service-tax.*",
        ]
        for pattern in footer_patterns:
            text = re.sub(pattern, '', text, flags=re.DOTALL)
        # 3. Collapse whitespace
        return " ".join(text.split()).strip()

    def _strip_branch_noise(self, text: str) -> str:
        text = re.sub(r'(?i)\bBR\s*ANCH\s*:.*$', '', text)
        text = re.sub(r'(?i)\bBRANCH\s*:.*$', '', text)
        return text.strip()

    def _is_invalid_entity(self, name: str) -> bool:
        if not name or len(name.strip()) < 2:
            return True
        normalized = name.strip()
        upper = normalized.upper()
        compact = re.sub(r'\s+', '', upper)
        if re.match(r'^(YESB|HDFC|ICIC|SBIN|KKBK|UTIB|AXIS|IDFB|CNRB|BARB|MAHB|BKID)\d', compact):
            return True
        if '@' in normalized:
            return True
        digits = sum(ch.isdigit() for ch in normalized)
        if digits >= max(6, len(compact) * 0.5):
            return True
        if upper in {"ATM SERVICE BRANCH", "BR ANCH", "BRANCH", "ATM SERVICE", "UPI"}:
            return True
        if upper.endswith(" BRANCH") or "ATM SERVICE BRANCH" in upper:
            return True
        if upper in _PAYMENT_RAIL_BRANDS:
            return True
        compact = re.sub(r'\s+', '', upper)
        if compact in _JUNK_PERSON_NAMES:
            return True
        if 'MANDATE' in upper:
            return True
        return False

    def _is_junk_person_name(self, name: str) -> bool:
        if self._is_invalid_entity(name):
            return True
        upper = re.sub(r'\s+', '', name.upper())
        if upper in _JUNK_PERSON_NAMES:
            return True
        if 'MANDATE' in upper:
            return True
        if len(name.strip()) < 4:
            return True
        return False

    def _extract_neft_remitter(self, cleaned: str) -> Optional[str]:
        if 'NEFT' not in cleaned.upper() and 'TRANSFER FROM' not in cleaned.upper():
            return None

        remitter_match = re.search(
            r'(?i)NEFT[/\s-]+(?:[^/\s]+[/\s-]+)*[^/\s]*[/\s-]+([A-Z][A-Z0-9\s&\.]{2,50}?)(?:[/\s]|//|$)',
            cleaned,
        )
        if remitter_match:
            candidate = self._normalize_entity_name(remitter_match.group(1))
            if candidate and not self._is_junk_person_name(candidate):
                compact = re.sub(r'\s+', '', candidate.upper())
                if compact not in _NEFT_BANK_CODES:
                    return candidate

        after_neft = re.split(r'(?i)NEFT', cleaned, maxsplit=1)
        if len(after_neft) < 2:
            return None

        segments = [s.strip() for s in re.split(r'[/\s-]+', after_neft[1]) if s.strip()]
        candidates: List[str] = []
        for seg in segments:
            if re.match(r'^\d+$', seg):
                continue
            if seg.upper() in _NEFT_BANK_CODES:
                continue
            if re.match(r'^[A-Z0-9]{10,}$', seg):
                continue
            if len(seg) >= 4:
                candidates.append(seg)

        for seg in reversed(candidates):
            name = self._normalize_entity_name(seg)
            if name and not self._is_junk_person_name(name):
                return name
        return None

    def _extract_upi_note(self, cleaned: str) -> Optional[str]:
        match = re.search(r'(?i)/UPI/\d[\d\s]*/([^/]+?)(?:/\s*(?:BR|BRANCH)|$)', cleaned)
        if not match:
            return None
        note = self._normalize_entity_name(match.group(1))
        if note and not self._is_invalid_entity(note):
            return note
        return None

    def _normalize_entity_name(self, text: str) -> str:
        if not text:
            return ""
        name = re.sub(r'\s*(?:Date|Transaction|Details|Debits|Credits|Balance).*$', '', text, flags=re.IGNORECASE).strip()
        name = re.sub(r'\s*(?:ANCH|ATM|SERVICE|BRANCH)\s*:.*$', '', name, flags=re.IGNORECASE).strip()
        name = re.sub(r'\bINR\b', ' ', name, flags=re.IGNORECASE)
        name = re.sub(r'\s+', ' ', name).strip()
        if not name:
            return ""
        words = name.split()
        merged: List[str] = []
        for word in words:
            if len(word) == 1 and word.islower() and merged:
                merged[-1] = f"{merged[-1]}{word}"
            else:
                merged.append(word)
        name = ' '.join(merged)
        return name.title()

    def _is_discarded_fragment(self, frag: str) -> bool:
        if not frag or len(frag.strip()) < 3:
            return True
        frag = frag.strip()
        for pattern in self.ANCHORS.values():
            if re.match(pattern, frag, re.IGNORECASE):
                return True
        if re.search(r'\d{3,}', frag):
            return True
        upper = frag.upper()
        if upper in {"UPI", "NEFT", "RTGS", "IMPS", "ACH", "POS"}:
            return True
        if frag.lower() in {"card", "branch", "atm", "cash", "deposit", "cheque", "fee", "tax", "charge", "to", "by"}:
            return True
        return False

    def _fragment_is_vpa_or_handle(self, frag: str) -> bool:
        if '@' in frag:
            return True
        return bool(re.search(r'(?i)^(?:paytmqr|paytm\.|gpay|phonepe|bharatpe|okhdfcbank|okicici|ybl|pty|axl|ibl)', frag))

    def _looks_like_company(self, name: str) -> bool:
        upper = name.upper()
        return any(marker in upper for marker in _COMPANY_MARKERS)

    def _classify_entity(self, name: str, commodity: str, upi_id: Optional[str]) -> Tuple[Optional[str], Optional[str], float, str, Optional[str]]:
        normalized = self._normalize_entity_name(name)
        if not normalized:
            return None, None, 0.0, commodity, upi_id
        is_store = (
            any(kw in normalized.upper() for kw in self.STORE_KEYWORDS)
            or self._looks_like_company(normalized)
        )
        if is_store:
            return normalized, None, 0.92, commodity, upi_id
        return None, normalized, 0.92, commodity, upi_id

    def _extract_bank_upi_slash_name(self, cleaned: str) -> Optional[str]:
        match = _BANK_UPI_SLASH_RE.search(cleaned)
        if match:
            return match.group(1).strip()
        match = _BANK_CODE_SLASH_RE.search(cleaned)
        if match:
            return match.group(1).strip()
        return None

    def _merchant_from_fragment(self, frag: str) -> Optional[str]:
        if self._fragment_is_vpa_or_handle(frag):
            return None

        u_frag = frag.upper()
        for kw in _MERCHANT_FRAGS:
            if kw in u_frag:
                brand = _BRAND_MAP.get(kw.lower(), kw.title())
                if brand.upper() in _PAYMENT_RAIL_BRANDS:
                    return None
                return brand

        for key, val in _BRAND_MAP.items():
            if key in frag.lower() and val.upper() not in _PAYMENT_RAIL_BRANDS:
                return val
        return None

    def _extract_upi_id(self, cleaned: str) -> Optional[str]:
        vpa_match = _VPA_RE.search(cleaned)
        if vpa_match:
            return vpa_match.group(0).strip()
        upi_match = re.search(r'upi/.*?/[^/]+/([^/]+)/', cleaned.lower())
        if upi_match:
            return upi_match.group(1).strip()
        return None

    def extract_transaction_id(self, text: str) -> Optional[str]:
        if not text:
            return None
        patterns = [
            r'(?i)/UPI/(\d{10,})/',
            r'(?i)UPI:(\d{10,}):',
            r'(?i)UPI[:\/\s-]+(\d{10,})',
            r'(?i)NEFT[\/\s-]+([A-Z0-9]{8,24})',
            r'(?i)IMPS[\/\s-]+([A-Z0-9]{8,24})',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match and match.group(1):
                return match.group(1).strip()
        long_nums = re.findall(r'\b(\d{12,})\b', text)
        if long_nums:
            return long_nums[-1]
        return None

    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str, Optional[str]]:
        """
        Approach B: Scoring Engine.
        Returns (Store, Person, Confidence, Commodity, upiId)
        """
        from .categories import get_commodity
        
        cleaned = self.clean_description(text)
        cleaned = self._strip_branch_noise(cleaned)
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

        upi_id = self._extract_upi_id(cleaned)

        neft_remitter = self._extract_neft_remitter(cleaned)
        if neft_remitter:
            return neft_remitter, None, 0.93, commodity, upi_id

        # ── Priority 1: YES/HDFC slash format ───────────────────────────────
        # YESB0MCHUPI/Vinod INR Singh Rajput /XXXXX /paytm...@pty ...
        slash_name = self._extract_bank_upi_slash_name(cleaned)
        if slash_name:
            normalized_slash = self._normalize_entity_name(slash_name)
            if not self._is_invalid_entity(normalized_slash):
                store, person, conf, _, resolved_upi = self._classify_entity(slash_name, commodity, upi_id)
                if store or person:
                    return store, person, conf, commodity, resolved_upi
        
        # Extract UPI ID if present (slash format for other banks)
        if not upi_id:
            upi_match = re.search(r'upi/.*?/[^/]+/([^/]+)/', cleaned.lower())
            if upi_match:
                upi_id = upi_match.group(1).strip()
        
        # 1. Fragmentation: Split by semantic delimiters
        fragments = [f.strip() for f in re.split(r'[/-]|:|\s{2,}', cleaned) if f.strip()]
        
        person_candidates: List[Tuple[str, float]] = []
        store_candidates: List[Tuple[str, float]] = []

        for frag in fragments:
            brand = self._merchant_from_fragment(frag)
            if brand:
                store_candidates.append((brand, 0.95))
                continue

            if self._is_discarded_fragment(frag):
                continue

            scrubbed_frag_arr = []
            for w in frag.split():
                if w.upper() not in {"INR", "UPI", "NEFT", "RTGS", "IMPS"}:
                    scrubbed_frag_arr.append(w)
            scrubbed_frag = " ".join(scrubbed_frag_arr).strip()
            if not scrubbed_frag or self._is_discarded_fragment(scrubbed_frag):
                continue

            normalized = self._normalize_entity_name(scrubbed_frag)
            if not normalized:
                continue

            score = 0.5
            if self._is_likely_person(normalized):
                score += 0.3
            if any(c.isupper() for c in scrubbed_frag):
                score += 0.2
            if re.match(r'^(delhi|mumbai|bangalore|chennai|hyderabad)$', normalized.lower()):
                score -= 0.3
            if self._looks_like_company(normalized) or any(kw in normalized.upper() for kw in self.STORE_KEYWORDS):
                store_candidates.append((normalized, min(score + 0.2, 1.0)))
            elif not self._is_junk_person_name(normalized):
                person_candidates.append((normalized, min(score, 1.0)))

        if store_candidates:
            best_store = max(store_candidates, key=lambda x: x[1])
            return best_store[0], None, best_store[1], commodity, upi_id

        person_candidates = [
            (name, score)
            for name, score in person_candidates
            if not self._is_junk_person_name(name)
        ]
        if person_candidates:
            best_person = max(person_candidates, key=lambda x: x[1])
            return None, best_person[0], best_person[1], commodity, upi_id

        upi_note = self._extract_upi_note(cleaned)
        if upi_note:
            return upi_note, None, 0.7, commodity, upi_id

        return None, None, 0.0, commodity, upi_id

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
