from .base import BaseStyle
import re
from typing import Tuple, Optional

class MAHBStyle(BaseStyle):
    """
    Bank of Maharashtra Style.
    """
    
    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str]:
        # 1. Pre-clean using base logic
        cleaned = self.clean_description(text)
        from .categories import get_commodity
        commodity = get_commodity(cleaned)
        
        # 2. Bank-specific shortcut for MAHB: Fragment before UPI
        match_bracket = re.search(r'/(.*?)/\s*UPI', cleaned, re.IGNORECASE)
        match_slash = re.search(r'(.*?)/[^/]*\s*UPI', cleaned, re.IGNORECASE) if not match_bracket else None
        
        match = match_bracket or match_slash
        if match:
            entity = match.group(1).strip()
            
            # MAHB specific cleaning: strip merchant IDs/serial numbers
            entity = re.sub(r'^\d{10,14}\b', '', entity).strip()
            entity = re.sub(r'\b\d{10,14}$', '', entity).strip()
            entity = re.sub(r'\b\d{1,3}\b', '', entity).strip()
            entity = entity.replace('/', '').strip()
            entity = re.sub(r'\s+', ' ', entity)

            if len(entity) >= 3:
                is_store = any(k in entity.upper() for k in self.STORE_KEYWORDS)
                # Since this match is bank-specific, we give it high confidence
                if is_store:
                    return entity, None, 0.95, commodity
                else:
                    return None, entity, 0.95, commodity
            
        # Fallback to general Scoring Engine
        return super().extract_entities(text)
