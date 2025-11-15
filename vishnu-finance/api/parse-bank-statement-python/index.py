"""
Vercel Python Serverless Function for Bank Statement Parsing
Handles PDF, XLS, XLSX bank statement parsing with bank-specific parsers
"""
import json
import base64
import sys
import os
from pathlib import Path

# Add tools directory to path
project_root = Path('/var/task')
tools_dir = project_root / 'tools'
if tools_dir.exists():
    sys.path.insert(0, str(tools_dir))
else:
    tools_dir = Path(__file__).parent.parent.parent / 'tools'
    if str(tools_dir) not in sys.path:
        sys.path.insert(0, str(tools_dir))

def handler(request):
    """Vercel serverless function handler"""
    try:
        # Parse request body - Vercel passes request as dict with 'body' key (string)
        if isinstance(request, dict):
            body_str = request.get('body', '{}')
            if isinstance(body_str, str):
                body = json.loads(body_str)
            else:
                body = body_str
        elif hasattr(request, 'json'):
            body = request.json()
        elif hasattr(request, 'body'):
            if isinstance(request.body, str):
                body = json.loads(request.body)
            else:
                body = request.body
        else:
            body = {}
        
        # Get file data (base64 encoded)
        file_base64 = body.get('file_data')
        bank_type = body.get('bankType', '')
        file_type = body.get('file_type', '.pdf')
        
        if not file_base64:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'No file data provided'})
            }
        
        # Decode file
        file_bytes = base64.b64decode(file_base64)
        
        # Determine file extension
        extension = file_type.lower() if file_type.startswith('.') else f'.{file_type.lower()}'
        
        # Save to temporary file in /tmp
        tmp_dir = Path('/tmp')
        tmp_file_path = tmp_dir / f'statement_{os.getpid()}_{id(file_bytes)}{extension}'
        with open(tmp_file_path, 'wb') as tmp_file:
            tmp_file.write(file_bytes)
        file_path = tmp_file_path
        
        try:
            # Import parsers
            # These imports are resolved at runtime via sys.path manipulation
            from bank_statement_parser import parse_bank_statement  # type: ignore
            import pandas as pd
            
            # Parse bank statement
            df, metadata = parse_bank_statement(file_path, bank_type if bank_type else None)
            
            # Get detected bank type
            detected_bank = None
            if df is not None and not df.empty and 'bankCode' in df.columns:
                if not df['bankCode'].isna().all():
                    detected_bank = str(df['bankCode'].iloc[0])
            
            if df is None or df.empty:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'success': True,
                        'transactions': [],
                        'count': 0,
                        'bankType': detected_bank or bank_type or 'UNKNOWN',
                        'metadata': metadata or {}
                    })
                }
            
            # Normalize dates
            bank_code = detected_bank or bank_type
            
            def parse_date_strict(date_val, bank_code=None):
                if pd.isna(date_val):
                    return None
                try:
                    date_str = str(date_val).strip()
                    # For MAHB/SBM/IDIB, use DD/MM/YYYY
                    if bank_code in ['MAHB', 'SBM', 'IDIB']:
                        parsed = pd.to_datetime(date_str, format='%d/%m/%Y', errors='coerce')
                        if pd.notna(parsed):
                            return parsed.strftime('%Y-%m-%d')
                        # Manual parsing fallback
                        import re
                        match = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', date_str)
                        if match:
                            day_str, month_str, year_str = match.groups()
                            from datetime import datetime
                            try:
                                dt = datetime(int(year_str), int(month_str), int(day_str))
                                return dt.strftime('%Y-%m-%d')
                            except ValueError:
                                return None
                        return None
                    # For other banks, use dayfirst=True
                    parsed = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
                    if pd.notna(parsed):
                        return parsed.strftime('%Y-%m-%d')
                    return None
                except:
                    return None
            
            # Ensure date_iso exists
            if 'date_iso' not in df.columns or df['date_iso'].isna().all():
                if 'date' in df.columns:
                    df['date_iso'] = df['date'].apply(lambda x: parse_date_strict(x, bank_code=bank_code))
            
            # Normalize date_iso
            def normalize_date_iso(date_val):
                if pd.isna(date_val):
                    return None
                try:
                    if isinstance(date_val, str) and len(date_val) == 10 and date_val.count('-') == 2:
                        return date_val  # Already in YYYY-MM-DD format
                    parsed = pd.to_datetime(date_val, errors='coerce')
                    if pd.notna(parsed):
                        return parsed.strftime('%Y-%m-%d')
                    return None
                except:
                    return None
            
            df['date_iso'] = df['date_iso'].apply(normalize_date_iso)
            
            # Filter out invalid dates
            initial_count = len(df)
            df = df[df['date_iso'].notna()].copy()
            
            # Convert datetime columns to strings
            for col in df.columns:
                if pd.api.types.is_datetime64_any_dtype(df[col]):
                    df[col] = df[col].dt.strftime('%Y-%m-%d')
            
            # Convert to records
            transactions = df.to_dict('records')
            
            # Convert datetime objects to strings
            for trans in transactions:
                for key, value in trans.items():
                    if hasattr(value, 'isoformat'):
                        trans[key] = value.isoformat()
                    elif pd.isna(value):
                        trans[key] = None
            
            # Ensure metadata is a dict
            if metadata is None:
                metadata = {}
            elif not isinstance(metadata, dict):
                metadata = {}
            
            # Convert metadata datetime objects
            if metadata:
                if metadata.get('statementStartDate') and hasattr(metadata['statementStartDate'], 'isoformat'):
                    metadata['statementStartDate'] = metadata['statementStartDate'].isoformat()
                if metadata.get('statementEndDate') and hasattr(metadata['statementEndDate'], 'isoformat'):
                    metadata['statementEndDate'] = metadata['statementEndDate'].isoformat()
            
            result = {
                'success': True,
                'transactions': transactions,
                'count': len(transactions),
                'bankType': detected_bank or bank_type or 'UNKNOWN',
                'metadata': metadata
            }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps(result, ensure_ascii=False, default=str)
            }
            
        finally:
            # Clean up temporary file
            try:
                if file_path.exists():
                    file_path.unlink()
            except:
                pass
                
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in bank statement parser: {error_details}", file=sys.stderr)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Failed to parse bank statement',
                'details': str(e)
            })
        }

