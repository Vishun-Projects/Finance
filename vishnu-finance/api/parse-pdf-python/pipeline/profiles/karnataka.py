import re
from typing import Tuple, Optional
from .base import BankProfile

# Karnataka Bank UPI format: UPI:REFNO:vpa@bank(HUMAN NAME):suffix
# e.g. UPI:509113780828:q643564534@ybl(ALIUL HOQUE):UPI

_UPI_COLON_RE = re.compile(r'UPI:\d+:[^(]+\(([^)]+)\)?', re.IGNORECASE)   # handles both (NAME) and (NAME
_UPI_VPA_RE = re.compile(r'UPI:\d+:([^@]+@[^\s(]+)', re.IGNORECASE)
_PAREN_NAME_RE = re.compile(r'\(([A-Za-z][^)]{2,})\)', re.IGNORECASE)
_NEFT_IMPS_RE = re.compile(r'(?:NEFT|IMPS|RTGS)[-/\s]+([A-Z].*?)(?:\s*-\s*\d|\s*$)', re.IGNORECASE)
_MBS_RE = re.compile(r'MBS/To\s+([^/]+?)(?:\s+[A-Z]\/|\s*\/)', re.IGNORECASE)
_CASH_RE = re.compile(r'CASH\s+DEPOSIT', re.IGNORECASE)
_TRANSFER_RE = re.compile(r'Transfer\s+to\s+([\w\s]+)', re.IGNORECASE)


class KarnatakaBankProfile(BankProfile):
    """Profile for Karnataka Bank (KARB) — optimized name extractor."""

    @property
    def bank_code(self) -> str:
        return "KARB"

    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str, Optional[str]]:
        # Priority 1: Karnataka Bank UPI format — name in parentheses
        # UPI:509113780828:q643564534@ybl(ALIUL HOQUE):UPI
        m = _UPI_COLON_RE.search(text)
        if m:
            name = m.group(1).strip().title()
            # Extract UPI VPA as the upi_id
            vpa_m = _UPI_VPA_RE.search(text)
            upi_id = vpa_m.group(1).strip() if vpa_m else None
            # Determine store vs person
            is_store = self._is_merchant(name)
            if is_store:
                return name, None, 0.95, text, upi_id
            return None, name, 0.95, text, upi_id

        # Priority 2: NEFT-ALLERN ENTERPRISES / IMPS transfer
        neft_m = _NEFT_IMPS_RE.search(text)
        if neft_m:
            name = neft_m.group(1).strip().title()
            if len(name) >= 3:
                return name, None, 0.85, text, None

        # Priority 3: MBS/To <NAME>/
        mbs_m = _MBS_RE.search(text)
        if mbs_m:
            name = mbs_m.group(1).strip().title()
            return name, None, 0.8, text, None

        # Priority 4: Cash Deposit
        if _CASH_RE.search(text):
            return "Cash Deposit", None, 0.9, text, None

        # Priority 5: IMPS Transfer to NAME
        transfer_m = _TRANSFER_RE.search(text)
        if transfer_m:
            name = transfer_m.group(1).strip().title()
            return name, None, 0.8, text, None

        # Priority 6: Any parenthesised name fallback
        paren_m = _PAREN_NAME_RE.search(text)
        if paren_m:
            name = paren_m.group(1).strip().title()
            if len(name) >= 3:
                is_store = self._is_merchant(name)
                if is_store:
                    return name, None, 0.6, text, None
                return None, name, 0.6, text, None

        # Fallback
        return None, None, 0.0, text, None

    def _is_merchant(self, name: str) -> bool:
        MERCHANT_KEYWORDS = {
            "BLINKIT", "ZOMATO", "AMAZON", "FLIPKART", "SWIGGY", "NETFLIX",
            "GOOGLE", "BAJAJ", "SIMPL", "ZEPTO", "JIO", "PAYTM", "AIRTEL",
            "BROADBAND", "STORE", "MART", "SHOP", "PHARMACY", "MEDICAL",
            "ENTERPRISES", "TRAVELS", "SERVICES", "LIMITED", "PVT", "LTD",
            "PLAY", "RECHARGE", "FINANCE"
        }
        upper = name.upper()
        return any(kw in upper for kw in MERCHANT_KEYWORDS)
