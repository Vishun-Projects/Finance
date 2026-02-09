import re
from typing import Tuple, Optional
from .base import BaseStyle

class KKBKStyle(BaseStyle):
    """
    Kotak Mahindra Bank Style.
    """
    
    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str]:
        # Kotak pattern: [ID] - [ENTITY]
        cleaned = self.clean_description(text)
        from .categories import get_commodity
        commodity = get_commodity(cleaned)

        match_hyphen = re.search(r'^\s*\d+\s*-\s*(.*)', cleaned, re.IGNORECASE)
        if match_hyphen:
            entity = match_hyphen.group(1).strip()
            if len(entity) >= 3:
                is_store = any(k in entity.upper() for k in self.STORE_KEYWORDS)
                return (entity, None, 0.95, commodity) if is_store else (None, entity, 0.95, commodity)

        return super().extract_entities(text)
