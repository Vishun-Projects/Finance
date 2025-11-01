
import sys
import os
sys.path.append(r'D:\\Finance\\Finance\\vishnu-finance\\tools')

# Import the multi-format parser
from multi_format_parser import parse_file
from pathlib import Path
import pandas as pd
import json

def main():
    file_path = Path(r"D:\\Finance\\Finance\\vishnu-finance\\uploads\\statement_1761991092882.xlsx")
    csv_path = Path(r"D:\\Finance\\Finance\\vishnu-finance\\uploads\\extracted_1761991092888.csv")
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    print(f"Parsing {file_path.suffix.upper()} file: {file_path.name}")

    df = parse_file(file_path)
    
    if df.empty:
        print("No transactions found")
        result = {"success": True, "transactions": [], "count": 0}
        with open(csv_path.parent / f"{csv_path.stem}.json", 'w') as f:
            json.dump(result, f)
        print(json.dumps(result))
        return
    
    # Ensure date_iso is properly formatted (YYYY-MM-DD)
    def normalize_date_iso(date_val):
        """Normalize date_iso to YYYY-MM-DD format."""
        if pd.isna(date_val):
            return None
        try:
            if isinstance(date_val, str):
                parsed = pd.to_datetime(date_val, errors='coerce')
            else:
                parsed = pd.to_datetime(date_val, errors='coerce')
            if pd.isna(parsed):
                return None
            return parsed.strftime('%Y-%m-%d')
        except:
            return None
    
    if 'date_iso' not in df.columns or df['date_iso'].isna().all():
        # Generate date_iso from date column if missing
        if 'date' in df.columns:
            df['date_iso'] = df['date'].apply(lambda x: normalize_date_iso(x))
    
    # Normalize all date_iso values
    df['date_iso'] = df['date_iso'].apply(normalize_date_iso)
    
    # Filter out rows with invalid dates
    initial_count = len(df)
    df = df[df['date_iso'].notna()].copy()
    if len(df) < initial_count:
        print(f"Filtered out {initial_count - len(df)} transactions with invalid dates")
    
    # Convert date columns to strings for CSV/JSON serialization
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime('%Y-%m-%d')
    
    # Save to CSV
    try:
        df.to_csv(csv_path, index=False)
    except Exception as e:
        print(f"Warning: Could not save CSV: {e}", file=sys.stderr)
    
    # Also save to JSON for better error handling
    json_path = csv_path.parent / f"{csv_path.stem}.json"
    try:
        json_records = df.to_dict(orient='records')
        result = {
            "success": True,
            "transactions": json_records,
            "count": len(json_records)
        }
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, default=str)
        
        # Print JSON result (truncate if too large)
        result_str = json.dumps(result, ensure_ascii=False, default=str)
        if len(result_str) < 1000000:
            print(result_str)
        else:
            print(json.dumps({"success": True, "transactions": [], "count": len(df), "file": str(json_path)}, default=str))
    except Exception as e:
        print(f"Warning: Could not save JSON: {e}", file=sys.stderr)
        print(f"SUCCESS: Extracted {len(df)} transactions.")
        print(f"CSV saved to: {csv_path}")

if __name__ == "__main__":
    main()
