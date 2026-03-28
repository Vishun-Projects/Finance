import re
from typing import Tuple, Optional
from .base import BankProfile

class KarnatakaBankProfile(BankProfile):
    """Profile for Karnataka Bank (KARB)"""
    
    @property
    def bank_code(self) -> str:
        return "KARB"
        
    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str, Optional[str]]:
        text_lower = text.lower()
        conf = 1.0
        
        # 1) UPI Pattern
        upi_match = re.search(r'upi/.*?/([^/]+)/([^/]+)/([^/]+)', text)
        if upi_match:
            person = upi_match.group(2).strip()
            upi_id = upi_match.group(3).strip()
            return person, person, conf, text, upi_id

        # 2) NEFT/IMPS / RTGS
        neft_match = re.search(r'(?:neft|imps|rtgs)[-\s]?[a-z0-9]+[-\s]+(.*?)(?:[-\s].*)?$', text_lower)
        if neft_match:
            name = neft_match.group(1).title().strip()
            return name, name, 0.8, text, None
            
        # 3) To / By Name fallback
        by_match = re.search(r'by\s+([a-z\s]+)', text_lower)
        if by_match:
            name = by_match.group(1).title().strip()
            return name, name, 0.6, text, None
            
        to_match = re.search(r'to\s+([a-z\s]+)', text_lower)
        if to_match:
            name = to_match.group(1).title().strip()
            return name, name, 0.6, text, None

        # Ultimate fallback
        return text.strip(), text.strip(), 0.3, text, None
