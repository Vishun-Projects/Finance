import logging
from typing import List, Dict, Any, Optional
from .models import JobContext

logger = logging.getLogger(__name__)

class BankDetectorShim:
    """
    Stage 6: Bank Detection
    """
    
    KNOWN_BANKS = {
        "HDFC": [r"\bHDFC BANK\b", r"\bH\.D\.F\.C\b"],
        "SBI": [r"\bSTATE BANK OF INDIA\b", r"\bSBI\s+BANK\b"],
        "KOTAK": [r"\bKOTAK MAHINDRA\b", r"\bKOTAK\b"],
        "AXIS": [r"\bAXIS BANK\b"],
        "ICICI": [r"\bICICI BANK\b"],
        "MAHB": [r"\bBANK OF MAHARASHTRA\b", r"\bMAHABANK\b", r"\bMAHB\b"],
        "IDIB": [r"\bINDIAN BANK\b", r"\bIDIB\d+\b"],
        "INDIAN": [r"\bINDIAN BANK\b"],
        "CANARA": [r"\bCANARA BANK\b"],
        "BOI": [r"\bBANK OF INDIA\b"]
    }

    def detect_bank(self, ctx: JobContext):
        if not ctx.pages:
            return
            
        # Scan first page words for known bank names
        first_page_words = [w.text.upper() for w in ctx.pages[0].words]
        full_text = " ".join(first_page_words)
        
        detected = "UNKNOWN"
        
        # 1. Try DB-backed profiles first
        if ctx.bank_profiles:
            for profile in ctx.bank_profiles:
                kws = profile.get("detectionKeywords", [])
                if isinstance(kws, str): # Handle string if single kw
                    kws = [kws]
                for kw in kws:
                    if kw.upper() in full_text:
                        detected = profile.get("bankCode")
                        logger.info(f"Bank Detected via DB Config: {detected}")
                        break
                if detected != "UNKNOWN":
                    break
                    
        # 2. Fallback to hardcoded profiles
        if detected == "UNKNOWN":
            import re
            for bank, patterns in self.KNOWN_BANKS.items():
                for pattern in patterns:
                    if re.search(pattern, full_text, re.IGNORECASE):
                        detected = bank
                        break
                if detected != "UNKNOWN":
                    break
        
        ctx.bank_code = detected
        logger.info(f"Final Bank Detected: {detected}")

        # 3. Extract Account Holder Name (Heuristic)
        self._extract_account_holder(ctx, full_text)
        
        # 4. Extract Account Number (Heuristic)
        self._extract_account_number(ctx, full_text)

    def _extract_account_number(self, ctx: JobContext, text: str):
        # Look for common patterns: "Account Number:", "Ac NO:", etc.
        patterns = [
            r"Account Number\s*(?:[:\-]?)\s*(\d{9,18})",
            r"A/c\s*No\.?\s*(?:[:\-]?)\s*(\d{9,18})",
            r"Account\s*No\.?\s*(?:[:\-]?)\s*(\d{9,18})",
            r"Ac\s*No\.?\s*(?:[:\-]?)\s*(\d{9,18})"
        ]
        import re
        for p in patterns:
            match = re.search(p, text, re.IGNORECASE)
            if match:
                acc_no = match.group(1).strip()
                ctx.metadata["accountNumber"] = acc_no
                logger.info(f"Detected Account Number: {acc_no}")
                break

    def _extract_account_holder(self, ctx: JobContext, text: str):
        # Look for common patterns: "Account Holder Name(s):", "Name:", etc.
        patterns = [
            r"Account Holder Names?\s+(?:Mr\.|Mrs\.|Ms\.)?\s*([A-Z\s]+?)(?:Primary|Address|Account|Page|$)",
            r"Name\s*:\s*([A-Z\s]+?)(?:CIF|Mobile|Email|$)"
        ]
        import re
        for p in patterns:
            match = re.search(p, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Suppress generic terms
                if len(name) > 3 and not any(k in name.upper() for k in ["ACCOUNT", "DETAILS", "STATEMENT"]):
                    ctx.account_holder_name = name
                    logger.info(f"Detected Account Holder: {name}")
                    break

