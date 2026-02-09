import logging
import re
import sys
from typing import List, Dict, Any, Optional
from .models import JobContext, PageArtifact, WordArtifact

logger = logging.getLogger(__name__)

class MapperShim:
    """
    Stage 7: Column Semantic Mapping
    """
    
    # Semantic Keywords
    ROLE_KEYWORDS = {
        "DATE": ["DATE", "TXN DATE", "VALUE DATE", "TRANSACTION DATE", "POST DATE"],
        "DESCRIPTION": ["PARTICULARS", "PARTICULAR", "DESCRIPTION", "NARRATION", "REMARKS", "DETAILS", "TRANSACTION DETAILS", "SUMMARY", "TXN DETAILS"],
        "DEBIT": ["DEBIT", "DEBITS", "DR", "WITHDRAWAL", "WITHDRAWAL(DR)", "DEBIT AMOUNT", "PAYMENT"],
        "CREDIT": ["CREDIT", "CREDITS", "CR", "DEPOSIT", "DEPOSIT(CR)", "CREDIT AMOUNT", "RECEIPT"],
        "BALANCE": ["BALANCE", "BAL", "CLOSING", "RUNNING BALANCE", "BALANCE AMOUNT", "CURR BAL"],
        "AMOUNT": ["AMOUNT", "AMOUNTS", "NET AMOUNT"]
    }

    def map_columns(self, ctx: JobContext) -> Dict[str, Any]:
        """
        Identify the header row and map column x-ranges to roles.
        """
        logger.info("Starting Semantic Column Mapping")
        
        # 0. Find matched profile
        matched_profile = None
        if ctx.bank_profiles and ctx.bank_code != "UNKNOWN":
            for profile in ctx.bank_profiles:
                if profile.get("bankCode") == ctx.bank_code:
                    matched_profile = profile
                    logger.info(f"Using dynamic profile for bank: {ctx.bank_code}")
                    break
        
        # 1. Find Header Row
        header_row = None
        header_row_idx = -1
        
        # Look at first page's rows (lines)
        if not ctx.pages:
            return {}
            
        rows = ctx.pages[0].lines # Populated by Layout Stage
        
        for idx, row in enumerate(rows[:50]): # Check first 50 rows
            row_text = " ".join([(w.text or "").upper() for w in row])
            logger.debug(f"Scanning row {idx}: {row_text}")
            
            if self._is_header_row(row_text, matched_profile):
                header_row = row
                header_row_idx = idx
                logger.info(f"Found Header Row at index {idx}: {row_text}")
                break
        
        if not header_row:
            logger.warning("No header row found")
            return {}

        # 2. Map X-ranges to Roles
        col_map = self._map_header_words_to_roles(header_row, matched_profile)
        logger.info(f"Column Mapping: {col_map}")
        
        return col_map

    def _is_header_row(self, text: str, profile: Optional[Dict] = None) -> bool:
        # Check if row contains at least 3 distinct roles, OR specific strong combinations
        found_roles = set()
        text = text.replace('.', '') # Ignore dots in headers like 'Date.'
        
        # If profile provides specific header keywords, check them first
        if profile and profile.get("headerKeywords"):
            found_count = 0
            for kw in profile["headerKeywords"]:
                if re.search(rf"\b{re.escape(kw.upper())}\b", text):
                    found_count += 1
            if found_count >= 2: # Heuristic: if 2+ specific header keywords found
                return True

        # Standard role-based check
        for role, kws in self.ROLE_KEYWORDS.items():
            for kw in kws:
                # Use regex for word boundary to avoid "CR" matching "DISCREPANCY" or "DR" matching "ADDRESS"
                # Escape kw mostly, but they are simple strings here.
                pattern = rf"\b{re.escape(kw)}\b"
                if re.search(pattern, text):
                    found_roles.add(role)
                    break
        
        # Criteria:
        # Transaction tables MUST have:
        # 1. DATE
        # 2. AND (DEBIT OR CREDIT OR AMOUNT)
        # (Balance and Description are good secondary signals but not enough on their own vs summary tables)
        
        has_date = "DATE" in found_roles
        has_money_flow = any(r in found_roles for r in ["DEBIT", "CREDIT", "AMOUNT"])
        
        if has_date and has_money_flow:
            return True
            
        # Exception: Sometimes simple statements have Date + Description + Amount(implied)?
        # If we have 4+ roles, it's definitely a header.
        if len(found_roles) >= 4:
            return True
            
        return False

    def _map_header_words_to_roles(self, row: List[WordArtifact], profile: Optional[Dict] = None) -> Dict[str, Any]:
        mapping = {}
        found_roles = []
        
        # Get custom column mapping if available
        custom_cols = profile.get("columns") if profile else None

        for word in row:
            text = word.text.upper().replace('.', '')
            role_found = None
            
            if custom_cols:
                for role, kws in custom_cols.items():
                    if any(re.search(rf"\b{re.escape(kw.upper())}\b", text) for kw in kws):
                        role_found = role
                        break
            
            if not role_found:
                for role, kws in self.ROLE_KEYWORDS.items():
                    if any(kw in text for kw in kws): # Substring match for concatenated headers
                        role_found = role
                        break
            
            if role_found:
                found_roles.append({
                    "role": role_found,
                    "x0": word.bbox.x0,
                    "x1": word.bbox.x1,
                    "text": word.text
                })
        
        if not found_roles:
            return {}

        # Sort roles by their horizontal position
        sorted_roles = sorted(found_roles, key=lambda r: r['x0'])
        
        # greedy strategy: each column extends from its start until the next column's start begins
        for i, curr in enumerate(sorted_roles):
            # Start of this column is its own x0
            start_x = curr['x0']
            
            # End of this column is the start of the next column (if exists), else page edge
            if i + 1 < len(sorted_roles):
                end_x = sorted_roles[i+1]['x0']
            else:
                end_x = max(curr['x1'] + 200, 1000.0) # Assume wide last column
                
            mapping[curr['role']] = {
                "x_range": (start_x, end_x),
                "raw_header": curr['text']
            }
        
        return mapping

    def _classify_word_role(self, text: str) -> Optional[str]:
        for role, kws in self.ROLE_KEYWORDS.items():
            for kw in kws:
                # Exact match or very close fuzzy?
                # Start with exact substring
                if kw == text or (len(text) > 3 and kw in text):
                     return role
        return None

