import re
from typing import Tuple, Optional
from .base import BaseStyle

class AxisStyle(BaseStyle):
    """
    Axis Bank Style.
    """
    
    def extract_entities(self, text: str) -> Tuple[Optional[str], Optional[str], float, str]:
        # Axis often uses standard delimiters handled by BaseStyle
        return super().extract_entities(text)
