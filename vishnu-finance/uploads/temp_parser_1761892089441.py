
import sys
import os
sys.path.append(r'C:\\Users\\vishnu.vishwakarma\\Desktop\\Projects\\Finance\\vishnu-finance\\tools')

PDF_FILE = r"C:\\Users\\vishnu.vishwakarma\\Desktop\\Projects\\Finance\\vishnu-finance\\uploads\\statement_1761892089341.pdf"
BANK_HINT = r""
from pathlib import Path
import pandas as pd
import json

def main():
    pdf_path = Path(PDF_FILE)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    df = None
    try:
        from enhanced_bank_parser import parse_bank_statement_advanced
        df = parse_bank_statement_advanced(pdf_path, bank_hint=BANK_HINT)
    except Exception as e:
        # Fallback
        from accurate_parser import parse_bank_statement_accurately
        df = parse_bank_statement_accurately(pdf_path)
    
    if df.empty:
        print(json.dumps({"success": True, "transactions": [], "count": 0}))
        return
    
    # Convert dates
    df["date_iso"] = pd.to_datetime(df["date"], errors="coerce").dt.date
    records = df.to_dict(orient='records')
    print(json.dumps({"success": True, "transactions": records, "count": len(records)}))

if __name__ == "__main__":
    main()
