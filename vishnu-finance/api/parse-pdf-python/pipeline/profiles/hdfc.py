import re
from typing import Tuple, Optional
from .base import BaseStyle

class HDFCStyle(BaseStyle):
    """
    HDFC Bank Style.
    """
    
    def clean_description(self, text: str) -> str:
        cleaned = super().clean_description(text)
        # HDFC Footer/Header Noise Removal
        noise_patterns = [
            r"(?i)HDFC\s+BANK\s+LIMITED.*",
            r"(?i)Closing\s*balance\s*includes\s*funds.*",
            r"(?i)Contents\s*of\s*this\s*statement.*",
            r"(?i)The\s*address\s*on\s*this\s*statement.*",
            r"(?i)Registered\s*Office\s*Address.*",
            r"(?i)PageNo\.:\s*\d+.*",
            r"(?i)AccountBranch\s*:.*",
            r"(?i)STATEMENT\s*SUMMARY\s*:.*",
            r"(?i)OpeningBalance\s+DrCount.*",
            r"(?i)State\s*account\s*branch\s*GSTN.*"
        ]
        for p in noise_patterns:
            cleaned = re.sub(p, '', cleaned, flags=re.DOTALL).strip()
        return cleaned

    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str, Optional[str]]:
        cleaned = self.clean_description(text)
        from .categories import get_commodity
        commodity = get_commodity(cleaned)
        
        upi_id = None
        upi_match = re.search(r'upi/.*?/[^/]+/([^/]+)/', cleaned.lower())
        if upi_match:
            upi_id = upi_match.group(1).strip()

        # HDFC UPI Pattern: UPI-SENDER-RECIPIENT-REF — prefer known merchant brands
        match_upi = re.search(r'UPI-([^-]+)-([^-]+)-', cleaned, re.IGNORECASE)
        if match_upi:
            for segment in (match_upi.group(1), match_upi.group(2)):
                brand = self._merchant_from_fragment(segment)
                if brand:
                    return brand, None, 0.95, get_commodity(brand) or commodity, upi_id

                normalized = self._normalize_entity_name(segment)
                if normalized and not self._is_invalid_entity(normalized):
                    is_store = (
                        any(k in normalized.upper() for k in self.STORE_KEYWORDS)
                        or self._looks_like_company(normalized)
                    )
                    if is_store:
                        return normalized, None, 0.95, commodity, upi_id

        return super().extract_entities(text)
