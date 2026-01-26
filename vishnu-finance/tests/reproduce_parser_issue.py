
import sys
from pathlib import Path

# Add src to path
sys.path.append(str(Path.cwd() / 'src'))

from parser.bank_parser import AccurateParser

test_cases = [
    # Problematic lines from user
    "28 Apr 2024 YESB0PTMUPIndian Railways Ticketing /paytm-64670120@paytm ANCH : ATM SERVICE BRANCH",
    "02 Jul 2024 TRAN DATE -(MMDD) 0702 TRAN TIME -(HHMMSS) 124301-DIVA SHILL ROAD KHARDI WDL SEQ NO 418412329551 ATM ID MPB00942 : MUMBAI MULUND (E)",
    "28 Jun 2024 YESB0YBLUPI", # Should become empty or generic, not "YESB0YBLUPI"
    "25 May 2024 IDIB000M764r MUNSHEELAL RAMSURAT VISHWAK /munshilalvis hwakarma210@okaxis H : ATM SERVICE BRANCH", # Handle split name/email
    "10 Jun 2024 YESB0YESUPI YA PRABHA RAKESH /bharatpe09908797641@ye sbankltd /paan : ATM SERVICE BRANCH", # Split bharatpe
    "08 Jun 2024 YESB0PTMUPI", # Too short
    "05 Sep 2024 TRANSFER FROM 94959000126 NEFT 63567 PUBLISH/ : MUMBAI FORT",
    "05 Sep 2024 SBIN0008975 ALI axl ANCH : ATM SERVICE BRANCH", # Short name
    "17 Jul 2024 YESB0YBLUPI LALSINGH GUPTA /q271381350@ybl ANCH : ATM SERVICE BRANCH",
    "26 Jun 2024 MOHAMMA D YUNUS NAJIBULLA SHAIK /paytmqr28100505010119y xr20blah5@paytm ANCH : ATM SERVICE BRANCH",
    "03 Sep 2024 IDIB000M764r MUNSHEELAL RAMSURAT VISHWAK /munshilal",
    "30 Jun 2024 MIN BAL CHGS /",
    "28 Apr 2024 YESB0PTMUPIndian Railways Ticketing /paytm-64670120@paytm ANCH : ATM SERVICE BRANCH",
    "31 May 2024 MIN BAL CHGS /",
    "24 Aug 2024 YESB0PTMUPI HAND SALIKRAM AGRAHARI /paytmqr1x2nizlea0@paytm /",
    "09 Sep 2024 HDFC0002504 MUNSHEELAL VISHWAKARMA /mamtavishwakarma0948@ okhdfcbank ANCH : ATM SERVICE BRANCH",
    "19 Jun 2024 YESB0PTMUPIularamDip ajiMandora /paytmqr1wnuo8jxhc@payt m ANCH : ATM SERVICE BRANCH"
]

print("-" * 80)
print(f"{'Input Description':<80} | {'Extracted Store':<30} | {'Commodity':<15}")
print("-" * 80)

for desc in test_cases:
    # Mimic the cleaning done before calling extract
    # The parser seems to pass the whole description (minus date/amount if regex parsed)
    # But user raw data includes date. AccurateParser.extract_store_and_commodity expects "description".
    # We should strip the date for the test to be realistic to what `_process_transaction` does
    # as it removes the date.
    
    # Simple strip of date for simulation
    clean_desc = desc
    import re
    date_match = re.search(r'(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})', clean_desc)
    if date_match:
        clean_desc = clean_desc.replace(date_match.group(1), "").strip()
        
    store, commodity, cleaned = AccurateParser.extract_store_and_commodity(clean_desc)
    print(f"{clean_desc[:80]:<80} | {str(store)[:30]:<30} | {str(commodity):<15}")
