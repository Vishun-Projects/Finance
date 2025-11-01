
import sys
import os
sys.path.append(r'D:\\Finance\\Finance\\vishnu-finance\\tools')

PDF_FILE = r"D:\\Finance\\Finance\\vishnu-finance\\uploads\\statement_1761975067916.pdf"
BANK_HINT = r""
CSV_FILE = r"D:\\Finance\\Finance\\vishnu-finance\\uploads\\extracted_1761975067922.csv"
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
    
    # Convert dates and ensure JSON-serializable
    df["date_iso"] = pd.to_datetime(df.get("date", pd.Series(dtype=str)), errors="coerce").dt.strftime('%Y-%m-%d')
    # Best-effort: stringify any remaining date/datetime columns
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime('%Y-%m-%d')
    # Persist CSV as a fallback for the Node layer
    try:
        df.to_csv(CSV_FILE, index=False)
    except Exception:
        pass
    # Use pandas to_json for safe serialization
    try:
        json_records = df.to_json(orient='records')
        print(json.dumps({"success": True, "transactions": json.loads(json_records), "count": int(len(df))}))
    except Exception:
        # Final fallback: basic dict conversion with string casting
        records = []
        for _, row in df.iterrows():
            obj = {}
            for k, v in row.items():
                if hasattr(v, 'isoformat'):
                    obj[k] = v.isoformat()
                else:
                    obj[k] = str(v) if not isinstance(v, (int, float)) else v
            records.append(obj)
        print(json.dumps({"success": True, "transactions": records, "count": len(records)}))

if __name__ == "__main__":
    main()
