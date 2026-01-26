
import sys
from pathlib import Path

# Add src to path
sys.path.append(str(Path.cwd() / 'src'))

from parser.bank_parser import AccurateParser

test_cases = [
    "19 Sep 2024 /Ramu /XXXXX /paytm.s1121ot@pty /UPI/426364695568/dhaniy a bhindi /BRANCH : ATM SERVICE BRANCH", # Issue: Dhaniy A Bhindi as Store
    "06 Sep 2024 TRAN DATE -(MMDD) 0906 TRAN TIME -(HHMMSS) 082558/SELF-IN TOUCH MAHAPE THANE /ATM WDL SEQ NO 425008001585 ATM ID 06240157 /BRANCH : MUMBAI MULUND (E)", # Issue: MUMBAI MULUND (E) as Store
    "05 Sep 2024 UNCOLL CHRG DT:", # Issue: UNCOLL CHRG DT as Store
    "22 Sep 2024 SMS_CHGS_JUNE- 24_QTR 00000000000098058/SERV", # Issue: Long alphanumeric as Store
    "17 Sep 2024 /Google India Service/XXXXX /gpayrecharge@icici/UPI/46 2710065322/UPI/BRANCH : ATM SERVICE BRANCH", # Issue: 46 2710065322 as Store?
    "17 Aug 2024 /GEETIKA MAHENDRA SALIAN/XXXXX /geetikasalian19@okhdfcba nk /UPI/459610007099/Rakhi Gift /BRANCH : ATM SERVICE BRANCH",
    "05 Sep 2024 /DEEPAKC HAND SALIKRAM AGRAHARI/XXXXX /paytmqr5bgvtw@paytm /UPI/461596443605/UPI/BR ANCH : ATM SERVICE BRANCH", # Issue: DEEPAKC HAND
    "05 Sep 2024 TRANSFER FROM 94959000126 NEFT/HDFC/N2492432482 63567 /WORD PUBLISH/ /BRANCH : MUMBAI FORT", # Issue: N2492432482... as Store
    "24 Aug 2024 /DEEPAKC HAND SALIKRAM AGRAHARI/XXXXX /paytmqr1x2nizlea0@paytm /UPI/423729346943/UPI/",
    "08 Jun 2024 /VIVEK", # Issue: 08 Jun 2024 as Store?
    "08 Sep 2024 /Trupti Dryfruit and General St"
]

print("-" * 120)
print(f"{'Input Description':<80} | {'Extracted Store':<30} | {'Commodity':<15}")
print("-" * 120)

for desc in test_cases:
    # Mimic the cleaning steps from `_process_transaction` (removing date if found at start)
    clean_desc = desc
    import re
    # The real parser logic in `_process_transaction` strips the DATE from the beginning of the line 
    # BEFORE calling `extract_store_and_commodity`.
    # e.g. "08 Jun 2024 /VIVEK" -> "/VIVEK"
    
    date_match = re.search(r'^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})', clean_desc)
    if not date_match:
         date_match = re.search(r'^(\d{2}/\d{2}/\d{4})', clean_desc)
         
    if date_match:
        clean_desc = clean_desc.replace(date_match.group(1), "").strip()
        
    store, commodity, cleaned = AccurateParser.extract_store_and_commodity(clean_desc)
    print(f"{clean_desc[:80]:<80} | {str(store)[:30]:<30} | {str(commodity):<15}")
