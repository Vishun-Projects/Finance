"""
Test with Real Bank Statement Patterns
=====================================
Analyzing the actual patterns from the user's bank statements
"""

import re

def extract_store_and_commodity_fixed(description):
    """Fixed extraction logic based on real bank statement patterns."""
    store = None
    commodity = None
    clean_description = description
    
    print(f"Processing: {description}")
    
    # Pattern 1: YESB0PTMUPI/Mohammad Farman /XXXXX /paytmqr66co9g@ptys/UPI/ 566109272768/paan
    # Pattern 2: YESB0YBLUPI/Mr RADHE SHYAM PANC/XXXXX /q612947641@ybl /UPI/566149177529/milk
    # Pattern 3: KKBK0000811/NADEEM IBRAHIM SHAH /XXXXX /7710948307@kotak /UPI/529656503078/auto fare
    
    # Extract store name - look for pattern: BANK_CODE/Store Name /XXXXX or /UPI or /other
    store_patterns = [
        r'^[A-Z0-9]+/([^/]+?)(?:\s*/\s*XXXXX|\s*/\s*UPI|\s*/\s*[A-Z0-9@]+|\s*$)',  # Before XXXXX, UPI, or codes
        r'^[A-Z0-9]+/([^/]+?)(?:\s*/\s*[A-Z0-9@]+)',  # Before any code
        r'^[A-Z0-9]+/([^/]+)',  # Everything after bank code
    ]
    
    for pattern in store_patterns:
        store_match = re.search(pattern, description)
        if store_match:
            store = store_match.group(1).strip()
            # Clean up store name - remove extra spaces and common suffixes
            store = re.sub(r'\s+', ' ', store).strip()
            store = re.sub(r'\s*/\s*$', '', store)  # Remove trailing slash
            if store and len(store) > 2:  # Only if we have meaningful content
                break
    
    # Extract commodity - look for patterns like /paan, /milk, /auto fare, etc.
    # Priority: look for meaningful words after /XXXXX or before UPI/BRANCH
    commodity_patterns = [
        r'/\s*XXXXX\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*(?:UPI|BRANCH|paytmqr|@))',  # After XXXXX, before UPI/BRANCH
        r'/\s*XXXXX\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*$)',  # After XXXXX, at the end
        r'/\s*XXXXX\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*[A-Z0-9]+)',  # After XXXXX, before codes
        r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*(?:UPI|BRANCH|paytmqr|@))',  # Before UPI/BRANCH
        r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*$)',  # At the end
        r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*[A-Z0-9]+)',  # Before transaction codes
    ]
    
    for pattern in commodity_patterns:
        commodity_match = re.search(pattern, description)
        if commodity_match:
            commodity = commodity_match.group(1).strip()
            # Clean up commodity
            commodity = re.sub(r'\s+', ' ', commodity).strip()
            if commodity and len(commodity) > 1:  # Only if we have meaningful content
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

def test_real_patterns():
    """Test with real bank statement patterns."""
    
    print("=== TESTING REAL BANK STATEMENT PATTERNS ===")
    print()
    
    test_cases = [
        "YESB0PTMUPI/Mohammad Farman /XXXXX /paytmqr66co9g@ptys/UPI/ 566109272768/paan /BRANCH : ATM SERVICE BRANCH",
        "YESB0YBLUPI/Mr RADHE SHYAM PANC/XXXXX /q612947641@ybl /UPI/566149177529/milk /BRANCH : ATM SERVICE BRANCH",
        "KKBK0000811/NADEEM IBRAHIM SHAH /XXXXX /7710948307@kotak /UPI/529656503078/auto fare/BRANCH : ATM SERVICE BRANCH",
        "JIOP0000001/7 Eleven Navi Mumbai T9XV /XXXXX68642/2319338741 807-01@jiopay /UPI/566385535354/UPI/BR ANCH : ATM SERVICE BRANCH",
        "TRANSFER FROM 97167000125 NEFT/HDFC/HDFCN52025 102454796314/WP TRANSLA//BRANCH : MUMBAI FORT",
        "YESB0PTMUPI/Fularam Dipaji Mandora /XXXXX /paytmqr68d1ra@ptys/UPI/5 66336373585/chaans soyabean besa /BRANCH : ATM SERVICE BRANCH",
        "YESB0PTMUPI/NARSINGH LALSINGH GUPTA/XXXXX /paytmqr5bgw5k@paytm /UPI/566342881545/dhaniya /BRANCH : ATM SERVICE BRANCH",
    ]
    
    for i, description in enumerate(test_cases, 1):
        print(f"--- Test Case {i} ---")
        store, commodity, clean_description = extract_store_and_commodity_fixed(description)

if __name__ == "__main__":
    test_real_patterns()
