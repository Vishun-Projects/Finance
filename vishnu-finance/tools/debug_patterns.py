"""
Debug Real Bank Statement Patterns
==================================
Let's debug the exact patterns to understand why extraction is failing
"""

import re

def debug_patterns():
    """Debug the exact patterns in bank statements."""
    
    print("=== DEBUGGING BANK STATEMENT PATTERNS ===")
    print()
    
    test_cases = [
        "YESB0PTMUPI/Mohammad Farman /XXXXX /paytmqr66co9g@ptys/UPI/ 566109272768/paan /BRANCH : ATM SERVICE BRANCH",
        "YESB0YBLUPI/Mr RADHE SHYAM PANC/XXXXX /q612947641@ybl /UPI/566149177529/milk /BRANCH : ATM SERVICE BRANCH",
        "KKBK0000811/NADEEM IBRAHIM SHAH /XXXXX /7710948307@kotak /UPI/529656503078/auto fare/BRANCH : ATM SERVICE BRANCH",
    ]
    
    for i, description in enumerate(test_cases, 1):
        print(f"--- Test Case {i} ---")
        print(f"Original: {description}")
        print()
        
        # Debug store extraction
        print("Store extraction:")
        store_patterns = [
            r'^[A-Z0-9]+/([^/]+?)(?:\s*/\s*XXXXX|\s*/\s*UPI|\s*/\s*[A-Z0-9@]+|\s*$)',
            r'^[A-Z0-9]+/([^/]+?)(?:\s*/\s*[A-Z0-9@]+)',
            r'^[A-Z0-9]+/([^/]+)',
        ]
        
        for j, pattern in enumerate(store_patterns):
            match = re.search(pattern, description)
            print(f"  Pattern {j+1}: {pattern}")
            print(f"  Match: {match.group(1) if match else 'None'}")
        
        print()
        
        # Debug commodity extraction
        print("Commodity extraction:")
        commodity_patterns = [
            r'/\s*XXXXX\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*(?:UPI|BRANCH|paytmqr|@))',
            r'/\s*XXXXX\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*$)',
            r'/\s*XXXXX\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*[A-Z0-9]+)',
            r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*(?:UPI|BRANCH|paytmqr|@))',
            r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*$)',
            r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*[A-Z0-9]+)',
        ]
        
        for j, pattern in enumerate(commodity_patterns):
            match = re.search(pattern, description)
            print(f"  Pattern {j+1}: {pattern}")
            print(f"  Match: {match.group(1) if match else 'None'}")
        
        print()
        print("=" * 80)
        print()

if __name__ == "__main__":
    debug_patterns()
