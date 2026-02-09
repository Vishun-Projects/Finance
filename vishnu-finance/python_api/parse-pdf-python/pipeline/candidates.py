from typing import List, Dict, Any, Optional
import re
import sys 
from .models import JobContext, TransactionCandidate, WordArtifact

class CandidatesShim:
    """
    Stage 8: Candidate Generation
    
    Uses the Semantic Mapping (column definitions) to extract potential transactions.
    """
    NOISE_KEYWORDS = ["SR NO", "SR. NO.", "CHANNEL", "PARTICULARS", "CHQ", "REF"]
    
    def generate_candidates(self, ctx: JobContext, col_mapping: Dict[str, Any]) -> List[TransactionCandidate]:
        """
        Iterates over all pages and lines, applying the column mapping 
        to extract potential transactions, including multi-line support.
        """
        candidates = []
        current_candidate = None
        
        if not col_mapping:
            return []

        for page in ctx.pages:
            for line in page.lines:
                new_cand = self._extract_candidate_from_line(line, col_mapping)
                
                if new_cand:
                    if self._is_noise(new_cand.raw_description):
                        new_cand = None

                if new_cand:
                    if new_cand.raw_date:
                        if current_candidate:
                            candidates.append(current_candidate)
                        current_candidate = new_cand
                    else:
                        if current_candidate and (new_cand.debit is None and new_cand.credit is None):
                            self._merge_into_candidate(current_candidate, new_cand)
                        elif current_candidate:
                            self._merge_into_candidate(current_candidate, new_cand)
                else:
                    text = " ".join([w.text for w in line]).strip()
                    if text and current_candidate:
                         if self._is_noise(text):
                             continue
                         current_candidate.raw_description += " " + text
        
        if current_candidate:
            candidates.append(current_candidate)
                    
        ctx.stats['candidates_generated'] = len(candidates)
        return candidates

    def _is_noise(self, text: str) -> bool:
        if not text: return True
        upper = text.upper()
        # 1. Broad Keyword Rejection
        noise_keys = [
            "TOTAL", "BALANCE", "END OF", "PAGE", "STATEMENT SUMMARY", 
            "HDFC BANK LIMITED", "RTGS/NEFT", "REGISTERED OFFICE",
            "ODLIMIT", "CURRENCY : INR", "CUST ID :", "NOMINATION:",
            "ACCOUNTBRANCH", "PHONENO", "EARMARKED", "UNCLEARED FUNDS",
            "CORRECT IF NO ERROR", "IS THAT ON RECORD", "GSTIN NUMBER",
            "A/C OPEN DATE", "ACCOUNT STATUS", "EARMARKEDFORHOLD",
            "CORRECTIFNOERROR", "ISTHATONRECORD"
        ]
        if any(k in upper for k in noise_keys):
            return True
        # 2. Pattern Rejection
        if re.search(r"PageNo\.|AccountBranch|MICR:|IFSC:|GSTN:|RegisteredOffice", text, re.I):
            return True
        return False

    def _merge_into_candidate(self, primary: TransactionCandidate, overflow: TransactionCandidate):
        if overflow.raw_description and not self._is_noise(overflow.raw_description):
            primary.raw_description += " " + overflow.raw_description
        if primary.debit is None and overflow.debit is not None:
            primary.debit = overflow.debit
        if primary.credit is None and overflow.credit is not None:
            primary.credit = overflow.credit
        if primary.balance is None and overflow.balance is not None:
            primary.balance = overflow.balance

    def _extract_candidate_from_line(self, line: List[WordArtifact], col_map: Dict[str, Any]) -> Optional[TransactionCandidate]:
        extracted = {
            "DATE": [], "DESCRIPTION": [], "DEBIT": [], "CREDIT": [], "BALANCE": []
        }
        
        line_text = " ".join([w.text for w in line])
        if len(line_text.strip()) < 3:
            return None

        for word in line:
            assigned_role = None
            word_center = (word.bbox.x0 + word.bbox.x1) / 2
            
            for role, region_data in col_map.items():
                x_range = region_data.get("x_range")
                if not x_range: continue
                
                x0, x1 = x_range
                margin = 15
                
                if (word.bbox.x0 >= x0 - margin) and (word.bbox.x1 <= x1 + margin):
                     assigned_role = role
                     break
                elif (word_center >= x0 - margin) and (word_center <= x1 + margin):
                     assigned_role = role
                     break
            
            if assigned_role:
                extracted[assigned_role].append(word)
            else:
                extracted["DESCRIPTION"].append(word)

        def extract_text(word_list):
            sorted_words = sorted(word_list, key=lambda w: w.bbox.x0)
            return " ".join([w.text for w in sorted_words]).strip()
            
        def extract_value(word_list):
            for w in word_list:
                val = w.metadata.get('normalized_amount')
                if val: return val
            raw = extract_text(word_list)
            match = re.search(r'(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\.\d+)', raw)
            return match.group(1).replace(',', '') if match else ""

        date_raw = extract_text(extracted["DATE"])
        date_match = re.search(r'(\d{1,2}[\s\/\-\.](?:\d{1,2}|[A-Z]{3,10})[\s\/\-\.]\d{2,4})', date_raw, re.IGNORECASE)
        date_str = date_match.group(1) if date_match else ""
        
        date_leftover = date_raw.replace(date_str, "").strip() if date_str else date_raw
        date_leftover = re.sub(r'^\s*\d{1,4}\b', '', date_leftover).strip()
        
        desc_str = (date_leftover + " " + extract_text(extracted["DESCRIPTION"])).strip()
        desc_str = re.sub(r'^\s*\d{1,4}\b', '', desc_str).strip()
        desc_str = re.sub(r'(?i)\bSR\s*NO\.?\s*', '', desc_str)
        
        # Robust Header/Footer Suppression
        header_patterns = [
            r"(?i)Date\s+Transaction\s+Details\s+Debits",
            r"(?i)Credits\s+Balance",
            r"(?i)TRAN\s+DATE\s+-\(MMDD\)",
            r"(?i)TRAN\s+TIME\s+-\s+\(HHMMSS\)",
            r"(?i)Opening\s+Balance\s+INR",
            r"(?i)Total\s+Credits\s+\+",
            r"(?i)Total\s+Debits\s+-",
            r"(?i)Ending\s+Balance\s+INR",
            r"(?i)Summary\s+for\s+\d{2}/\d{2}/\d{4}",
            r"(?i)Account\s+No\s+\d+",
            r"(?i)Total\s+(Debit|Credit)\s+Count",
            r"(?i)END\s+OF\s+STATEMENT",
            r"(?i)Generated\s+Statement",
            r"(?i)No\s+Signature\s+is\s+Required",
            r"(?i)advised\s+to\s+keep\s+their\s+KYC\s+updated",
            r"(?i)HDFC\s+BANK\s+LIMITED",
            r"(?i)Closing\s*balance\s*includes\s*funds",
            r"(?i)Contents\s*of\s*this\s*statement\s*will\s*be\s*considered",
            r"(?i)The\s*address\s*on\s*this\s*statement",
            r"(?i)State\s*account\s*branch\s*GSTN",
            r"(?i)Registered\s*Office\s*Address",
            r"(?i)PageNo\.:\s*\d+",
            r"(?i)AccountBranch\s*:",
            r"(?i)STATEMENT\s*SUMMARY\s*:",
            r"(?i)OpeningBalance\s+DrCount\s+CrCount"
        ]
        for p in header_patterns:
            desc_str = re.sub(p, '', desc_str).strip()

        # Strip trailing punctuation
        desc_str = re.sub(r'[/.\-\s]+$', '', desc_str).strip()
        desc_str = " ".join(desc_str.split())
        
        debit_val = None
        try:
            d_str = extract_value(extracted["DEBIT"])
            debit_val = float(d_str) if d_str else None
        except: pass

        credit_val = None
        try:
            c_str = extract_value(extracted["CREDIT"])
            credit_val = float(c_str) if c_str else None
        except: pass

        balance_val = None
        try:
            b_str = extract_value(extracted["BALANCE"])
            balance_val = float(b_str) if b_str else None
        except: pass
        
        amt_str = extract_value(extracted.get("AMOUNT", []))
        if debit_val is None and credit_val is None and amt_str:
            try: debit_val = float(amt_str)
            except: pass

        return TransactionCandidate(
            raw_date=date_str if date_str else None,
            raw_description=desc_str,
            debit=debit_val, credit=credit_val, balance=balance_val
        )
