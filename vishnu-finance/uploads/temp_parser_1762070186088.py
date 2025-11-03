
import sys
import os
sys.path.append(r'C:\\Users\\vishnu.vishwakarma\\Desktop\\Projects\\Finance\\vishnu-finance\\tools')

PDF_FILE = r"C:\\Users\\vishnu.vishwakarma\\Desktop\\Projects\\Finance\\vishnu-finance\\uploads\\statement_1762070185969.pdf"
BANK_HINT = r""
CSV_FILE = r"C:\\Users\\vishnu.vishwakarma\\Desktop\\Projects\\Finance\\vishnu-finance\\uploads\\extracted_1762070186088.csv"
JSON_FILE = r"C:\\Users\\vishnu.vishwakarma\\Desktop\\Projects\\Finance\\vishnu-finance\\uploads\\extracted_1762070186088.json"
from pathlib import Path
import pandas as pd
import json

def main():
    pdf_path = Path(PDF_FILE)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    df = None
    
    # First try bank-specific parser (supports SBIN, IDIB, KKBK, HDFC, MAHB)
    metadata = None
    try:
        import sys
        import os
        parsers_path = os.path.join(os.path.dirname(os.path.dirname(PDF_FILE)), 'tools', 'parsers')
        if parsers_path not in sys.path:
            sys.path.insert(0, parsers_path)
        from bank_detector import BankDetector
        detected_bank = BankDetector.detect_from_file(pdf_path)
        if detected_bank in ['SBIN', 'IDIB', 'KKBK', 'HDFC', 'MAHB']:
            # Add tools directory to path
            tools_path = os.path.join(os.path.dirname(os.path.dirname(PDF_FILE)), 'tools')
            if tools_path not in sys.path:
                sys.path.insert(0, tools_path)
            from bank_statement_parser import parse_bank_statement
            result = parse_bank_statement(pdf_path, detected_bank)
            # Handle tuple return (df, metadata)
            if isinstance(result, tuple):
                df, metadata = result
            else:
                df = result
                metadata = None
            print(f"Bank-specific parser ({detected_bank}) extracted {len(df)} transactions", file=sys.stderr)
            if not df.empty:
                # Success with bank-specific parser
                pass
            else:
                # Try accurate parser as fallback
                print(f"Bank-specific parser returned 0 transactions, trying accurate parser", file=sys.stderr)
                try:
                    from accurate_parser import parse_bank_statement_accurately
                    df_temp = parse_bank_statement_accurately(pdf_path)
                    if df_temp is not None and not df_temp.empty:
                        df = df_temp
                        metadata = None
                    print(f"Accurate parser extracted {len(df)} transactions", file=sys.stderr)
                except Exception as e:
                    print(f"Accurate parser error: {e}", file=sys.stderr)
    except Exception as e:
        print(f"Bank-specific parser error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
    
    # If still no transactions, try accurate parser
    if df is None or df.empty:
        try:
            from accurate_parser import parse_bank_statement_accurately
            df_temp = parse_bank_statement_accurately(pdf_path)
            if not df_temp.empty:
                df = df_temp
                print(f"Accurate parser extracted {len(df)} transactions", file=sys.stderr)
            elif df is None:
                df = df_temp
                print(f"Accurate parser extracted {len(df)} transactions", file=sys.stderr)
        except Exception as e:
            print(f"Accurate parser failed: {e}", file=sys.stderr)
            if df is None:
                df = pd.DataFrame()
    
    # Final fallback: try bank-specific parser without bank code
    metadata = None
    if df is None or df.empty:
        try:
            from bank_statement_parser import parse_bank_statement
            result = parse_bank_statement(pdf_path)
            # Handle tuple return (df, metadata)
            if isinstance(result, tuple):
                df, metadata = result
            else:
                df = result
                metadata = None
            print(f"Bank-specific parser (auto-detect) extracted {len(df)} transactions", file=sys.stderr)
        except Exception as e:
            print(f"Bank-specific parser fallback also failed: {e}", file=sys.stderr)
            if df is None:
                df = pd.DataFrame()
    
    if df.empty:
        result = {
            "success": True, 
            "transactions": [], 
            "count": 0,
            "metadata": metadata if metadata else {}
        }
        with open(JSON_FILE, 'w') as f:
            json.dump(result, f)
        print(json.dumps(result))
        return
    
    # Convert metadata datetime objects to ISO strings for JSON serialization
    if metadata:
        if metadata.get('statementStartDate') and hasattr(metadata['statementStartDate'], 'isoformat'):
            metadata['statementStartDate'] = metadata['statementStartDate'].isoformat()
        if metadata.get('statementEndDate') and hasattr(metadata['statementEndDate'], 'isoformat'):
            metadata['statementEndDate'] = metadata['statementEndDate'].isoformat()
    
    # Convert dates and ensure JSON-serializable - CRITICAL: Use strict DD/MM/YYYY for MAHB/SBM
    def normalize_date(date_val, bank_code=None):
        """Normalize date to ISO format (YYYY-MM-DD) with strict format enforcement"""
        if pd.isna(date_val):
            return None
        try:
            # If date_iso already exists and is valid, use it (parsed by strict parser)
            # Otherwise, parse from date column with strict format
            date_str = str(date_val).strip()
            
            # For MAHB/SBM/IDIB banks, ALWAYS use DD/MM/YYYY format (never auto-detect)
            if bank_code in ['MAHB', 'SBM', 'IDIB']:
                # Try strict DD/MM/YYYY format first
                parsed = pd.to_datetime(date_str, format='%d/%m/%Y', errors='coerce')
                if pd.notna(parsed):
                    return parsed.strftime('%Y-%m-%d')
                # If strict format failed, try manual parsing to prevent swap
                import re
                match = re.match(r'^(d{2})/(d{2})/(d{4})$', date_str)
                if match:
                    day_str, month_str, year_str = match.groups()
                    day = int(day_str)
                    month = int(month_str)
                    year = int(year_str)
                    if 1 <= month <= 12 and 1 <= day <= 31:
                        from datetime import datetime
                        try:
                            test_date = datetime(year, month, day)  # year, month, day (DD/MM/YYYY)
                            return f"{year}-{month_str}-{day_str}"
                        except ValueError:
                            return None
                return None
            
            # For other banks, use dayfirst=True to prefer DD/MM interpretation
            parsed = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
            if pd.notna(parsed):
                return parsed.strftime('%Y-%m-%d')
            
            # Fallback
            parsed = pd.to_datetime(date_str, errors='coerce')
            if pd.notna(parsed):
                return parsed.strftime('%Y-%m-%d')
            return None
        except:
            return None
    
    # Get bank code from DataFrame if available
    bank_code = None
    if 'bankCode' in df.columns and not df['bankCode'].isna().all():
        bank_code = str(df['bankCode'].iloc[0]) if not df.empty else None
    
    # CRITICAL: If date_iso already exists (from strict parser), use it - don't re-parse!
    # Only normalize if date_iso is missing or invalid
    if 'date_iso' in df.columns:
        # Check if date_iso is already valid
        valid_date_iso = df['date_iso'].notna()
        if valid_date_iso.sum() == len(df):
            # All dates already parsed correctly by strict parser - use them as-is
            pass
        else:
            # Some dates missing - fill from date column with strict parsing
            missing_mask = df['date_iso'].isna()
            if missing_mask.any() and 'date' in df.columns:
                df.loc[missing_mask, 'date_iso'] = df.loc[missing_mask, 'date'].apply(
                    lambda x: normalize_date(x, bank_code=bank_code)
                )
    elif 'date' in df.columns:
        # No date_iso column - create from date with strict parsing
        df["date_iso"] = df["date"].apply(lambda x: normalize_date(x, bank_code=bank_code))
    else:
        df["date_iso"] = None
    
    # Filter out rows with invalid dates
    df = df[df["date_iso"].notna()].copy()
    
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
        result = {
            "success": True, 
            "transactions": json.loads(json_records), 
            "count": int(len(df)),
            "metadata": metadata if metadata else {}
        }
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
        # Also print to stdout for compatibility, but truncate if too large
        result_str = json.dumps(result, ensure_ascii=False)
        if len(result_str) < 1000000:  # Only print if under 1MB
            print(result_str)
        else:
            print(json.dumps({
                "success": True, 
                "transactions": [], 
                "count": len(df), 
                "metadata": metadata if metadata else {},
                "file": JSON_FILE
            }))
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
        result = {
            "success": True, 
            "transactions": records, 
            "count": len(records),
            "metadata": metadata if metadata else {}
        }
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)

if __name__ == "__main__":
    main()
