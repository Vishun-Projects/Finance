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

    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str]:
        cleaned = self.clean_description(text)
        from .categories import get_commodity
        commodity = get_commodity(cleaned)
        
        # 1. HDFC UPI Pattern: UPI-SENDER-RECIPIENT-REF
        match_upi = re.search(r'UPI-(?:.*?)-(.*?)-', cleaned, re.IGNORECASE)
        if match_upi:
            entity = match_upi.group(1).strip()
            if len(entity) >= 3:
                is_store = any(k in entity.upper() for k in self.STORE_KEYWORDS)
                return (entity, None, 0.95, commodity) if is_store else (None, entity, 0.95, commodity)

        return super().extract_entities(text)
