import re
import logging
from .models import JobContext

logger = logging.getLogger(__name__)

class SanitizerShim:
    """
    Stage 4: Numeral Sanity Filter
    Protects numbers before logic touches them.
    """
    
    # Regex for potential numbers: 
    # Matches: 1,000.00 | 1000 | 1.00 | 1,00,000.00 (Indian)
    # Allows currency symbols prefix/suffix
    NUMERIC_PATTERN = re.compile(r'^(?:INR|₹|\$|€|£)?\s*[-]?\s*[0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?\s*(?:DR|CR|INR)?$', re.IGNORECASE)

    def sanitize_numerals(self, ctx: JobContext):
        logger.info("Starting Stage 4: Numeral Sanity check")
        
        count = 0
        suspicious_count = 0
        for page in ctx.pages:
            for word in page.words:
                text = word.text.strip()
                # 1. Detect if it looks like a number
                if self.NUMERIC_PATTERN.match(text):
                    # 2. Normalize: remove currency, commas, and handle DR/CR
                    normalized = self._normalize_number(text)
                    
                    # 3. Mark suspicious if format is weird
                    if self._is_suspicious(text, normalized):
                        word.confidence *= 0.7 
                        word.metadata['suspicious_numeric'] = True
                        suspicious_count += 1
                    
                    # Store normalized value in metadata for downstream stages
                    word.metadata['normalized_amount'] = normalized
                    count += 1
                else:
                    # check for common OCR errors like "S00" instead of "500" or "O" instead of "0"
                    # But we'll be conservative here for now.
                    pass
                    
        ctx.stats['sanitized_numerals'] = count
        ctx.stats['suspicious_numerals'] = suspicious_count
        logger.info(f"Sanitized {count} words ({suspicious_count} suspicious)")

    def _normalize_number(self, text: str) -> str:
        # Remove currency symbols and commas
        clean = re.sub(r'(?:INR|₹|\$|€|£|,)', '', text, flags=re.IGNORECASE)
        # Handle DR/CR
        clean = re.sub(r'(DR|CR)', '', clean, flags=re.IGNORECASE).strip()
        # Handle trailing/leading spaces
        return clean

    def _is_suspicious(self, raw: str, normalized: str) -> bool:
        # Multiple decimal points
        if normalized.count('.') > 1:
            return True
        # Starts with a decimal point but no leading zero (common but sometimes noisy)
        if normalized.startswith('.'):
            return False # allow .50
        # Check for alphabets that are NOT Dr/Cr remaining (shouldn't happen with regex)
        if any(c.isalpha() for c in normalized):
             return True
        return False

    def _is_potential_number(self, text: str) -> bool:
        return bool(self.NUMERIC_PATTERN.match(text))

