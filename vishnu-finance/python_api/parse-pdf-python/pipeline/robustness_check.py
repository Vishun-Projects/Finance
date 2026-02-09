import re
from typing import List, Tuple, Optional

class RobustnessEngine:
    """
    Simulation of the Approach B Scoring Engine.
    Objective: Prove that semantic anchors isolate names regardless of bank format.
    """
    
    # 1. Anchors (Negative signal - what a name NEVER looks like)
    ANCHORS = {
        "IFSC": r'^[A-Z]{4}0[A-Z0-9]{6}$',
        "UPI_HANDLE": r'.*@.*',
        "TXN_ID": r'^\d{10,14}$',
        "MASKED": r'.*XXXXX.*',
        "JUNK_KW": r'\b(UPI|IMPS|NEFT|IFSC|BRANCH|REMARKS|INR|REF|ID|Date|Transaction|Details|Debits|Credits|Balance)\b',
        "SERIAL": r'^\d{1,4}$'
    }

    STORE_KEYWORDS = ["CAFE", "RESTAURANT", "FOOD", "STORES", "STATIONERY", "ELEVEN", "MEDICAL", "RAILWAYS"]

    def process(self, narrative: str) -> dict:
        # Split by semantic delimiters
        fragments = [f.strip() for f in re.split(r'[/-]|:|\s{2,}', narrative) if f.strip()]
        
        candidates = []
        for frag in fragments:
            score = 0
            is_anchor = False
            
            # Check for Anchors
            for name, pattern in self.ANCHORS.items():
                if re.search(pattern, frag, re.IGNORECASE):
                    is_anchor = True
                    break
            
            if is_anchor:
                continue

            # Check if alphabetic and long (Potential Name/Store)
            alpha_only = re.sub(r'[^a-zA-Z\s]', '', frag).strip()
            if len(alpha_only) < 3:
                continue
            
            score += len(alpha_only) # Length bias
            if ' ' in alpha_only: score += 5   # Multi-word bias
            if any(k in alpha_only.upper() for k in self.STORE_KEYWORDS):
                score += 10 # Store bias
                
            candidates.append({
                "fragment": frag,
                "score": score,
                "type": "Store" if any(k in frag.upper() for k in self.STORE_KEYWORDS) else "Person"
            })
        
        # Sort by score
        candidates.sort(key=lambda x: x['score'], reverse=True)
        
        result = candidates[0] if candidates else {"fragment": None, "score": 0, "type": None}
        return {
            "narrative": narrative,
            "extracted": result['fragment'],
            "type": result['type'],
            "score": result['score']
        }

# --- STRESS TESTS ---
test_narratives = [
    # Case 1: HDFC format (IFSC first)
    "HDFC0002504/MAMTA MUNSHEELAL VISHWAKARMA //mamtavishw akarma0948@okhdfcbank /UPI/566651688219/Recharge",
    # Case 2: YESB format (Name shifted)
    "YESB0YBLUPI/Sunrise Counter 03 QR / /q638827937@ybl /UPI/566608935252/gulab jamun chips",
    # Case 3: ICICI (Multiple names/noise)
    "ICIC0003887/WASIULLA KHAN /XXXXX38476/wasiullahkha n8786@okicici /UPI/530187628031/UPI/BRANCH : BRANCH",
    # Case 4: Reverse arrangement
    "UPI/566867568273/7 Eleven Navi Mumbai T9XV/JIOP0000001/REMARKS",
    # Case 5: Messy page bleeding
    "YESB0PTMUPI/Sangam Stationery Stores / /paytmqr14rgritxc9@paytm /UPI/530124247822/pens / Date Transaction Details"
]

engine = RobustnessEngine()
print(f"{'RAW NARRATIVE':<100} | {'EXTRACTED':<30} | {'TYPE':<10}")
print("-" * 150)
for t in test_narratives:
    res = engine.process(t)
    print(f"{res['narrative'][:98]:<100} | {str(res['extracted']):<30} | {str(res['type']):<10}")
