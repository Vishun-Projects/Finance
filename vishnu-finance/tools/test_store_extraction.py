"""
Test Store and Commodity Extraction
==================================
Test the extraction logic with the provided example:
YESB0PTMUPI/Sangam Stationery Stores /XXXXX /paytmqr14rgritxc9@paytm /UPI/530124247822/pens /BRANCH : ATM SERVICE BRANCH
"""

import re

def extract_store_and_commodity(description):
    """Extract store name and commodity from transaction description."""
    store = None
    commodity = None
    clean_description = description
    
    # Pattern to match: TRANSACTION_CODE/Store Name /other_info /commodity
    # Example: YESB0PTMUPI/Sangam Stationery Stores /XXXXX /pens
    
    # First, try to extract store name (text after first slash, before next slash or UPI/code)
    store_match = re.search(r'^[A-Z0-9]+/([^/]+?)(?:\s*/\s*(?:[A-Z0-9@]+|UPI|BRANCH)|$)', description)
    if store_match:
        store = store_match.group(1).strip()
        # Clean up store name
        store = re.sub(r'\s+', ' ', store).strip()
    
    # Extract commodity - look for the last meaningful word before technical info
    # Priority: look for patterns like /XXXXX /pens or /pens at the end
    commodity_patterns = [
        r'/([a-zA-Z]+)(?:\s*/\s*(?:UPI|BRANCH|paytmqr|@))',  # Before UPI/BRANCH
        r'/([a-zA-Z]+)(?:\s*$)',  # At the end
        r'/([a-zA-Z]+)(?:\s*/\s*[A-Z0-9]+)',  # Before transaction codes
    ]
    
    # Special case: look for pattern like /XXXXX /pens (commodity after placeholder)
    special_pattern = r'/\s*[A-Z0-9]+\s*/\s*([a-zA-Z]+)(?:\s|$)'
    special_match = re.search(special_pattern, description)
    if special_match:
        commodity = special_match.group(1).strip()
    else:
        # Try other patterns
        for pattern in commodity_patterns:
            commodity_match = re.search(pattern, description)
            if commodity_match:
                commodity = commodity_match.group(1).strip()
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
    clean_description = re.sub(r'/\s*[A-Z0-9@]+', '', clean_description)  # Remove UPI IDs, codes
    clean_description = re.sub(r'/\s*UPI', '', clean_description)  # Remove UPI references
    clean_description = re.sub(r'/\s*BRANCH.*', '', clean_description)  # Remove branch info
    clean_description = re.sub(r'/\s*paytmqr.*', '', clean_description)  # Remove Paytm QR codes
    clean_description = re.sub(r'/\s*XXXXX', '', clean_description)  # Remove placeholder codes
    clean_description = re.sub(r'\s+', ' ', clean_description).strip()  # Clean whitespace
    
    return store, commodity, clean_description

def test_extraction():
    """Test the extraction with the provided example."""
    
    print("=== STORE AND COMMODITY EXTRACTION TEST ===")
    
    # Test cases
    test_cases = [
        "YESB0PTMUPI/Sangam Stationery Stores /XXXXX /paytmqr14rgritxc9@paytm /UPI/530124247822/pens /BRANCH : ATM SERVICE BRANCH",
        "YESB0MCHUPI/Snehal /milk",
        "HDFC0004359/KASHMIRA /salary",
        "YESB0YBLUPI /UPI/1234567890",
        "BARB0BHABOM /refund",
        "YESB0PTMUPI/Sangam Stationery Stores /pens",
        "YESB0PTMUPI/Sangam Stationery Stores /XXXXX /pens"
    ]
    
    for i, description in enumerate(test_cases, 1):
        print(f"\n--- Test Case {i} ---")
        print(f"Original: {description}")
        
        store, commodity, clean_description = extract_store_and_commodity(description)
        
        print(f"Store: {store}")
        print(f"Commodity: {commodity}")
        print(f"Clean Description: {clean_description}")
        print(f"Notes: {commodity}")

if __name__ == "__main__":
    test_extraction()
