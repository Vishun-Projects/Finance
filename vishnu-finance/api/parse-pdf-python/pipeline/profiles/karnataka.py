import re
from typing import Tuple, Optional
from .base import BaseStyle

# Karnataka Bank UPI format: UPI:REFNO:vpa@bank(HUMAN NAME):suffix
_UPI_KARB_RE = re.compile(r'UPI:\d+:[^(]+\(([^)]+)\)?', re.IGNORECASE)
_UPI_VPA_RE  = re.compile(r'UPI:\d+:([^@]+@[^\s(]+)', re.IGNORECASE)
_NEFT_RE     = re.compile(r'(?:NEFT|IMPS|RTGS)[-/\s]+([A-Z][^-\n]{2,})(?:\s*-\s*\d|$)', re.IGNORECASE)
_MBS_RE      = re.compile(r'MBS/To\s+([^/]+?)(?:\s+[A-Z]\/|\s*\/)', re.IGNORECASE)
_CASH_RE     = re.compile(r'CASH\s+DEPOSIT', re.IGNORECASE)
_TRANSFER_RE = re.compile(r'Transfer\s+to\s+([\w\s]+)', re.IGNORECASE)

# Brand normalization: normalize common VPA/merchant names to proper names
BRAND_MAP = {
    "blinkit": "Blinkit",
    "blinkit.payu": "Blinkit",
    "zomato": "Zomato",
    "zomato4.payu": "Zomato",
    "swiggy": "Swiggy",
    "amazonupi": "Amazon",
    "amazon": "Amazon",
    "amazonpaygrocery": "Amazon Pay",
    "amazon.refunds": "Amazon",
    "gpayrecharge": "Google Pay Recharge",
    "playstore": "Google Play",
    "googlepay": "Google Pay",
    "netflix.bd": "Netflix",
    "jioinappdirect": "Jio",
    "bajajfinanceieplqr": "Bajaj Finance",
    "bajajfinancelimwl3": "Bajaj Finance",
    "bajajfinserv.payu": "Bajaj Finserv",
    "getsimpl": "Simpl",
    "cf.simp": "Simpl",
    "simpl": "Simpl",
    "zepto.payu": "Zepto",
    "vrlonline": "VRL Travels",
    "vrl.bdpg": "VRL Travels",
    "paytm-axiocf": "AXIO (Paytm)",
    "pinelabs": "Pine Labs",
    "amznlpa": "Amazon",
}

class KarbStyle(BaseStyle):
    """
    Karnataka Bank (KARB) normalization style.
    Handles the UPI:REFNO:vpa@bank(NAME):suffix format.
    """

    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str, Optional[str]]:
        from .categories import get_commodity
        commodity = get_commodity(text)

        # Priority 1: Extract name from UPI parentheses (main Karnataka format)
        m = _UPI_KARB_RE.search(text)
        if m:
            raw_name = m.group(1).strip()
            # Extract vpa for brand normalization
            vpa_m = _UPI_VPA_RE.search(text)
            upi_id = None
            vpa_key = None
            if vpa_m:
                vpa = vpa_m.group(1).strip().lower()
                upi_id = vpa
                vpa_key = vpa.split('@')[0]  # part before @bank

            # Try brand map using VPA key first
            if vpa_key and vpa_key in BRAND_MAP:
                brand = BRAND_MAP[vpa_key]
                return brand, None, 0.99, commodity, upi_id

            # Also try partial match in brand map
            if vpa_key:
                for key, brand in BRAND_MAP.items():
                    if key in vpa_key or vpa_key.startswith(key.split('.')[0]):
                        return brand, None, 0.98, commodity, upi_id

            # Fall back to the human name in parentheses
            name = raw_name.title()
            is_merchant = self._is_merchant_name(name)
            if is_merchant:
                return name, None, 0.92, commodity, upi_id
            return None, name, 0.92, commodity, upi_id

        # Priority 2: NEFT / IMPS transfers with entity name
        neft_m = _NEFT_RE.search(text)
        if neft_m:
            name = neft_m.group(1).strip().title()
            if len(name) >= 3:
                return name, None, 0.85, commodity, None

        # Priority 3: MBS/To <merchant name>
        mbs_m = _MBS_RE.search(text)
        if mbs_m:
            name = mbs_m.group(1).strip().title()
            return name, None, 0.8, commodity, None

        # Priority 4: Cash Deposit
        if _CASH_RE.search(text):
            return "Cash Deposit", None, 0.95, commodity, None

        # Priority 5: IMPS/Transfer to
        transfer_m = _TRANSFER_RE.search(text)
        if transfer_m:
            name = transfer_m.group(1).strip().title()
            if len(name) >= 3:
                return name, None, 0.8, commodity, None

        # Base fallback
        return None, None, 0.0, commodity, None

    def _is_merchant_name(self, name: str) -> bool:
        MERCHANT_KWS = {
            "BLINKIT", "ZOMATO", "AMAZON", "FLIPKART", "SWIGGY", "NETFLIX",
            "GOOGLE", "BAJAJ", "SIMPL", "ZEPTO", "JIO", "PAYTM", "AIRTEL",
            "BROADBAND", "STORE", "MART", "SHOP", "PHARMACY", "MEDICAL",
            "ENTERPRISES", "TRAVELS", "SERVICES", "LIMITED", "PVT", "LTD",
            "PLAY", "RECHARGE", "FINANCE", "AXIO", "GROFRU", "VRL", "PINE",
        }
        upper = name.upper()
        return any(kw in upper for kw in MERCHANT_KWS)


# Legacy BankProfile alias kept for backward compat
BankProfile = object

class KarnatakaBankProfile:
    """Legacy alias — not used in pipeline. Use KarbStyle instead."""
    pass
