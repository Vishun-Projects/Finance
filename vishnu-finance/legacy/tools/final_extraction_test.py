"""
Final Fix for Store and Commodity Extraction
===========================================
Let's create a completely new approach based on the debug results
"""

import re

def extract_store_and_commodity_final(description):
    """Final fixed extraction logic based on debug analysis."""
    store = None
    commodity = None
    clean_description = description
    
    print(f"Processing: {description}")
    
    # Extract store name - this is working correctly
    store_match = re.search(r'^[A-Z0-9]+/([^/]+?)(?:\s*/\s*XXXXX|\s*/\s*UPI|\s*/\s*[A-Z0-9@]+|\s*$)', description)
    if store_match:
        store = store_match.group(1).strip()
        store = re.sub(r'\s+', ' ', store).strip()
    
    # Extract commodity - look for meaningful words, prioritize actual commodities over technical codes
    commodity_patterns = [
        # Pattern 1: XXXXX /something /UPI /numbers /commodity
        r'/\s*XXXXX\s*/\s*[^/]+\s*/\s*UPI\s*/\s*[0-9]+\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)',
        # Pattern 2: XXXXX /something /commodity /BRANCH
        r'/\s*XXXXX\s*/\s*[^/]+\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*(?:BRANCH|@))',
        # Pattern 3: Direct commodity before UPI/BRANCH
        r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*(?:UPI|BRANCH|paytmqr|@))',
        # Pattern 4: Commodity at the end
        r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*$)',
    ]
    
    for pattern in commodity_patterns:
        commodity_match = re.search(pattern, description)
        if commodity_match:
            candidate = commodity_match.group(1).strip()
            # Skip technical codes and meaningless words
            if candidate and len(candidate) > 1 and candidate not in ['XXXXX', 'UPI', 'BRANCH', 'ATM', 'SERVICE']:
                commodity = candidate
                break
    
    # Clean up description
    clean_description = description
    
    # Remove store name part
    if store:
        clean_description = re.sub(r'^[A-Z0-9]+/[^/]+', '', clean_description)
    
    # Remove commodity
    if commodity:
        clean_description = re.sub(r'/\s*' + re.escape(commodity) + r'(?:\s|$)', '', clean_description)
    
    # Remove UPI IDs, codes, and other technical info
    clean_description = re.sub(r'/\s*[A-Z0-9@]+', '', clean_description)
    clean_description = re.sub(r'/\s*UPI', '', clean_description)
    clean_description = re.sub(r'/\s*BRANCH.*', '', clean_description)
    clean_description = re.sub(r'/\s*paytmqr.*', '', clean_description)
    clean_description = re.sub(r'/\s*XXXXX', '', clean_description)
    clean_description = re.sub(r'\s+', ' ', clean_description).strip()
    
    print(f"  Store: '{store}'")
    print(f"  Commodity: '{commodity}'")
    print(f"  Clean Description: '{clean_description}'")
    print()
    
    return store, commodity, clean_description

def test_final_patterns():
    """Test the final fixed patterns."""
    
    print("=== FINAL FIXED EXTRACTION TEST ===")
    print()
    
    test_cases = [
        "YESB0PTMUPI/Mohammad Farman /XXXXX /paytmqr66co9g@ptys/UPI/ 566109272768/paan /BRANCH : ATM SERVICE BRANCH",
        "YESB0YBLUPI/Mr RADHE SHYAM PANC/XXXXX /q612947641@ybl /UPI/566149177529/milk /BRANCH : ATM SERVICE BRANCH",
        "KKBK0000811/NADEEM IBRAHIM SHAH /XXXXX /7710948307@kotak /UPI/529656503078/auto fare/BRANCH : ATM SERVICE BRANCH",
        "JIOP0000001/7 Eleven Navi Mumbai T9XV /XXXXX68642/2319338741 807-01@jiopay /UPI/566385535354/UPI/BR ANCH : ATM SERVICE BRANCH",
        "YESB0PTMUPI/Fularam Dipaji Mandora /XXXXX /paytmqr68d1ra@ptys/UPI/5 66336373585/chaans soyabean besa /BRANCH : ATM SERVICE BRANCH",
        "YESB0PTMUPI/NARSINGH LALSINGH GUPTA/XXXXX /paytmqr5bgw5k@paytm /UPI/566342881545/dhaniya /BRANCH : ATM SERVICE BRANCH",
    ]
    
    for i, description in enumerate(test_cases, 1):
        print(f"--- Test Case {i} ---")
        store, commodity, clean_description = extract_store_and_commodity_final(description)

if __name__ == "__main__":
    test_final_patterns()
