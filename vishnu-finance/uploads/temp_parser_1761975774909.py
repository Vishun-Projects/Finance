
import sys
import os
sys.path.append(r'D:\\Finance\\Finance\\vishnu-finance\\tools')

PDF_FILE = r"D:\\Finance\\Finance\\vishnu-finance\\uploads\\statement_1761975774875.pdf"
BANK_HINT = r""
CSV_FILE = r"D:\\Finance\\Finance\\vishnu-finance\\uploads\\extracted_1761975774909.csv"
JSON_FILE = r"D:\\Finance\\Finance\\vishnu-finance\\uploads\\extracted_1761975774909.json"
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
        df = parse_bank_statement_advanced(pdf_path)
    except Exception as e:
        print(f"Enhanced parser failed: {e}", file=sys.stderr)
        # Fallback
        from accurate_parser import parse_bank_statement_accurately
        df = parse_bank_statement_accurately(pdf_path)
    
    if df.empty:
        result = {"success": True, "transactions": [], "count": 0}
        with open(JSON_FILE, 'w') as f:
            json.dump(result, f)
        print(json.dumps(result))
        return
    
    # Convert dates and ensure JSON-serializable
    df["date_iso"] = pd.to_datetime(df.get("date", pd.Series(dtype=str)), errors="coerce").dt.strftime('%Y-%m-%d')
    # Best-effort: stringify any remaining date/datetime columns
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime('%Y-%m-%d')
    
    # Persist CSV as a fallback
    try:
        df.to_csv(CSV_FILE, index=False)
    except Exception:
        pass
    
    # Write JSON to file (primary method for large outputs)
    try:
        json_records = df.to_json(orient='records')
        result = {"success": True, "transactions": json.loads(json_records), "count": int(len(df))}
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
        # Also print to stdout for compatibility, but truncate if too large
        result_str = json.dumps(result, ensure_ascii=False)
        if len(result_str) < 1000000:  # Only print if under 1MB
            print(result_str)
        else:
            print(json.dumps({"success": True, "transactions": [], "count": len(df), "file": JSON_FILE}))
    except Exception as e:
        print(f"JSON serialization error: {e}", file=sys.stderr)
        # Final fallback: basic dict conversion
        records = []
        for _, row in df.iterrows():
            obj = {}
            for k, v in row.items():
                if hasattr(v, 'isoformat'):
                    obj[k] = v.isoformat()
                else:
                    obj[k] = str(v) if not isinstance(v, (int, float)) else v
            records.append(obj)
        result = {"success": True, "transactions": records, "count": len(records)}
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)

if __name__ == "__main__":
    main()
