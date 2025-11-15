"""
Vercel Python Serverless Function for Multi-Format File Parsing
Handles PDF, XLS, XLSX, DOC, DOCX, TXT file parsing
"""
import json
import base64
import sys
import os
from pathlib import Path

# Add current directory to path for local imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(current_dir / 'parsers'))

def handler(request):
    """Vercel serverless function handler"""
    try:
        # Parse request body
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
        file_type = body.get('file_type', '')  # .pdf, .xls, .xlsx, etc.
        
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
            # Import multi-format parser from local directory
            try:
                from multi_format_parser import parse_file
                print("✓ Imported parse_file", file=sys.stderr)
            except ImportError as e:
                print(f"✗ Failed to import parse_file: {e}", file=sys.stderr)
                return {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Failed to import parser', 'details': str(e)})
                }
            
            import pandas as pd
            
            # Parse file
            df = parse_file(file_path)
            
            if df is None or df.empty:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'success': True,
                        'transactions': [],
                        'count': 0
                    })
                }
            
            # Normalize date_iso
            def normalize_date_iso(date_val):
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
            
            # Ensure date_iso exists
            if 'date_iso' not in df.columns and 'date' in df.columns:
                df['date_iso'] = df['date'].apply(normalize_date_iso)
            
            # Filter out invalid dates
            if 'date_iso' in df.columns:
                df = df[df['date_iso'].notna()].copy()
            
            # Convert to records
            transactions = df.to_dict('records')
            
            # Convert datetime objects to strings
            for trans in transactions:
                for key, value in trans.items():
                    if hasattr(value, 'isoformat'):
                        trans[key] = value.isoformat()
                    elif pd.isna(value):
                        trans[key] = None
            
            result = {
                'success': True,
                'transactions': transactions,
                'count': len(transactions)
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
        print(f"✗ Error in file parser: {error_details}", file=sys.stderr)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Failed to parse file',
                'details': str(e)
            })
        }
