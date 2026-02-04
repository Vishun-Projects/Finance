import logging
import re
from typing import List, Dict, Any, Optional
from .models import JobContext, FinalTransaction, TransactionCandidate

logger = logging.getLogger(__name__)

class InferenceEngineShim:
    """
    Stage 9: Semantic Inference Engine (Core IP)
    Decides Credit/Debit based on balance delta and column logic.
    """
    
    def process_transactions(self, ctx: JobContext, candidates: List[TransactionCandidate]) -> List[FinalTransaction]:
        logger.info("Starting Stage 9: Semantic Inference Engine")
        final_transactions = []
        
        # 0. Try to find Opening Balance on first page
        prev_balance = self._detect_opening_balance(ctx)
        if prev_balance is not None:
             logger.info(f"Detected Opening Balance: {prev_balance}")
        
        for cand in candidates:
            date_str = cand.raw_date
            iso_date = self._normalize_date(date_str)
            desc_str = (cand.raw_description or "").strip()
            bal_val = cand.balance
            
            # Logic: Balance-Driven Truth
            inferred_credit = 0.0
            inferred_debit = 0.0
            reasons = []
            
            explicit_debit = cand.debit or 0.0
            explicit_credit = cand.credit or 0.0
            
            if prev_balance is not None and bal_val is not None:
                delta = round(bal_val - prev_balance, 2)
                
                if delta > 0.009: # Positive delta = Credit
                    inferred_credit = delta
                    reasons.append(f"balance_delta_positive ({delta})")
                elif delta < -0.009: # Negative delta = Debit
                    inferred_debit = abs(delta)
                    reasons.append(f"balance_delta_negative ({abs(delta)})")
                else:
                    # No delta. If explicit amounts exist, maybe it's a correction or non-impacting?
                    # Or it's a junk row.
                    if explicit_debit == 0 and explicit_credit == 0:
                        logger.info(f"Skipping row with zero delta and no explicit amounts: {desc_str[:30]}...")
                        continue
            
            # Fallback/Confirmation: Logic B (Explicit Columns)
            if inferred_credit == 0 and inferred_debit == 0:
                if explicit_credit > 0:
                    inferred_credit = explicit_credit
                    reasons.append("explicit_column_credit")
                elif explicit_debit > 0:
                    inferred_debit = explicit_debit
                    reasons.append("explicit_column_debit")

            # Logic C: Keyword Confirmation
            if "CR" in desc_str.upper() or "CREDIT" in desc_str.upper():
                reasons.append("keyword_hit_credit")
            if "DR" in desc_str.upper() or "DEBIT" in desc_str.upper():
                reasons.append("keyword_hit_debit")

            # Confidence Level
            confidence = 0.6
            if any("delta" in r for r in reasons):
                confidence = 0.98
            elif any("explicit" in r for r in reasons):
                confidence = 0.85
            
            # Final Construction
            if (inferred_credit > 0 or inferred_debit > 0 or (date_str and bal_val is not None)):
                txn = FinalTransaction(
                    date=date_str or "PARSE_ERROR",
                    date_iso=iso_date,
                    description=desc_str,
                    debit=inferred_debit,
                    credit=inferred_credit,
                    balance=bal_val if bal_val is not None else (prev_balance or 0.0),
                    confidence=confidence,
                    reasons=reasons,
                    bankCode=ctx.bank_code
                )
                final_transactions.append(txn)
            
            if bal_val is not None:
                prev_balance = bal_val

        logger.info(f"Inferred {len(final_transactions)} transactions using Balance-Driven Truth")
        return final_transactions

    def _detect_opening_balance(self, ctx: JobContext) -> Optional[float]:
        """
        Scans all pages for metadata summary sections.
        """
        metadata = ctx.metadata
        opening_bal = None
        
    def _detect_opening_balance(self, ctx: JobContext) -> Optional[float]:
        """
        Scans all pages for metadata summary sections.
        """
        metadata = ctx.metadata
        opening_bal = None
        
        # 1. Broad Metadata Extraction Patterns
        summary_patterns = {
            "openingBalance": [
                r"OPENING\s+BALANCE\s*(?:INR|RS\.?|[$£€])?\s*([\d,]+\.?\d*)",
                r"BALANCE\s+B/F\s*(?:INR|RS\.?|[$£€])?\s*([\d,]+\.?\d*)",
                r"BALANCE\s+AS\s+ON\s+.*?\s*(?:INR|RS\.?|[$£€])?\s*([\d,]+\.?\d*)"
            ],
            "closingBalance": [
                r"(?:ENDING|CLOSING|FINAL)\s+BALANCE\s*(?:INR|RS\.?|[$£€])?\s*([\d,]+\.?\d*)",
                r"BALANCE\s+C/F\s*(?:INR|RS\.?|[$£€])?\s*([\d,]+\.?\d*)",
                r"CLOSING\s*BAL\s*(?:INR|RS\.?|[$£€])?\s*([\d,]+\.?\d*)"
            ],
            "totalCredits": [
                r"TOTAL\s+(?:INWARD|DEPOSITS?|CREDITS?)\s*(?:\+)?\s*(?:INR|RS\.?|[$£€])?\s*([\d,]+\.?\d*)",
                r"TOTAL\s+CREDITS?\s*(?:\+)?\s*(?:INR|RS\.?|[$£€])?\s*([\d,]+\.?\d*)"
            ],
            "totalDebits": [
                r"TOTAL\s+(?:OUTWARD|WITHDRAWALS?|DEBITS?)\s*(?:\-)?\s*(?:INR|RS\.?|[$£€])?\s*([\d,]+\.?\d*)",
                r"TOTAL\s+DEBITS?\s*(?:\-)?\s*(?:INR|RS\.?|[$£€])?\s*([\d,]+\.?\d*)"
            ],
            "statementPeriod": [
                r"FOR\s+PERIOD\s*[:\-]?\s*(\d{1,2}[\s\/\-][A-Z]{3}[\s\/\-]\d{4})\s*-\s*(\d{1,2}[\s\/\-][A-Z]{3}[\s\/\-]\d{4})"
            ]
        }
        
        # 2. Specialized Multi-Value Patterns (like HDFC Statement Summary)
        # STATEMENTSUMMARY :- 
        # OpeningBalance DrCount CrCount Debits Credits ClosingBal
        # 0.00 43 5 58,115.35 58,537.00 421.65
        multi_patterns = [
            # More flexible on spacing and labels
            r"SUMMARY\b.*OPENING\s*BAL(?:ANCE)?\s+DRCOUNT\s+CRCOUNT\s+DEBITS\s+CREDITS\s+CLOSING\s*BAL\s*([\d,]+\.?\d*)\s+\d+\s+\d+\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)"
        ]

        # Scan all pages
        for i, page in enumerate(ctx.pages):
            # Join with extra space to avoid gluing words
            full_text = " ".join([w.text for w in page.words]).upper()
            normalized_text = re.sub(r'\s+', ' ', full_text)
            
            # Check multi-patterns first
            found_multi = False
            for p in multi_patterns:
                match = re.search(p, normalized_text)
                if match:
                    try:
                        metadata["openingBalance"] = float(match.group(1).replace(",", ""))
                        metadata["totalDebits"] = float(match.group(2).replace(",", ""))
                        metadata["totalCredits"] = float(match.group(3).replace(",", ""))
                        metadata["closingBalance"] = float(match.group(4).replace(",", ""))
                        opening_bal = metadata["openingBalance"]
                        logger.info(f"Summary Table detected on Page {i+1}")
                        found_multi = True
                        break
                    except: continue
            
            if found_multi: continue

            # Check individual patterns
            for key, patterns in summary_patterns.items():
                if key in metadata and metadata[key] is not None: continue
                for p in patterns:
                    match = re.search(p, full_text)
                    if match:
                        try:
                            if key == "statementPeriod":
                                metadata["statementStartDate"] = match.group(1)
                                metadata["statementEndDate"] = match.group(2)
                            else:
                                val = float(match.group(1).replace(",", ""))
                                metadata[key] = val
                                if key == "openingBalance":
                                    opening_bal = val
                            logger.info(f"Metadata Detected on Page {i+1}: {key} = {match.group(1)}")
                        except: continue
        
        return opening_bal

    def _normalize_date(self, date_str: str) -> Optional[str]:
        if not date_str or date_str == "PARSE_ERROR": return None
        # Clean up
        date_str = date_str.strip()
        # 1. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        match = re.search(r'(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})', date_str)
        if match:
            d, m, y = match.groups()
            if len(y) == 2:
                # Assume 20xx for 2-digit years
                y = "20" + y
            try:
                day = int(d)
                month = int(m)
                year = int(y)
                # Basic bounds check
                if 1 <= month <= 12 and 1 <= day <= 31:
                    return f"{year:04d}-{month:02d}-{day:02d}"
            except: pass
        
        # 2. DD MMM YYYY (e.g. 01 JAN 2024)
        months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
        match_named = re.search(r'(\d{1,2})[\s\/\-\.]([A-Z]{3,10})[\s\/\-\.](\d{2,4})', date_str, re.I)
        if match_named:
            d, m_name, y = match_named.groups()
            m_name = m_name.upper()[:3]
            if m_name in months:
                month = months.index(m_name) + 1
                if len(y) == 2: y = "20" + y
                try:
                    return f"{int(y):04d}-{month:02d}-{int(d):02d}"
                except: pass

        return None
