import re
from typing import Tuple, Optional
from .base import BaseStyle

class YESBStyle(BaseStyle):
    """
    Yes Bank Style.
    """
    
    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str]:
        return super().extract_entities(text)
