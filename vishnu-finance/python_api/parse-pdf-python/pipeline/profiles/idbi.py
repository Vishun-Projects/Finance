import re
from typing import Tuple, Optional
from .base import BaseStyle

class IDBIStyle(BaseStyle):
    """
    IDBI / Indian Bank Style Normalization.
    """
    
    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str]:
        # Leverage BaseStyle Robust Scoring
        return super().extract_entities(text)
