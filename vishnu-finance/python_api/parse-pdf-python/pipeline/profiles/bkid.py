import re
from typing import Tuple, Optional
from .base import BaseStyle

class BKIDStyle(BaseStyle):
    """
    Bank of India Style.
    """
    
    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str]:
        return super().extract_entities(text)
