"""
Vercel Python Serverless Function for PDF Parsing
Handles PDF bank statement parsing using bundled parsers
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
        
        # Get PDF file data (base64 encoded)
        pdf_base64 = body.get('pdf_data')
        bank_hint = body.get('bank', '').lower()
        
        if not pdf_base64:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'No PDF data provided'})
            }
        
        # Decode PDF
        pdf_bytes = base64.b64decode(pdf_base64)
        
        # Save to temporary file
        import tempfile
        fd, tmp_file_path = tempfile.mkstemp(suffix='.pdf', prefix='statement_')
        pdf_path = Path(tmp_file_path)
        try:
            with os.fdopen(fd, 'wb') as tmp_file:
                tmp_file.write(pdf_bytes)
            
            # Use the unified parser
            from bank_statement_parser import parse_bank_statement
            
            # Use the unified pipeline with auto-detection
            # bank_hint is converted to uppercase as expected by get_parser_for_bank
            bank_code_hint = bank_hint.upper() if bank_hint else None
            df, metadata = parse_bank_statement(
                pdf_path, 
                bank_code=bank_code_hint,
                bank_profiles=body.get('bank_profiles')
            )
            
            # Format results
            if df is not None and hasattr(df, 'empty') and not df.empty:
                # Ensure date_iso exists
                if 'date_iso' not in df.columns and 'date' in df.columns:
                    import pandas as pd # type: ignore
                    def normalize_date(date_val):
                        if pd.isna(date_val): return None
                        try:
                            parsed = pd.to_datetime(str(date_val).strip(), dayfirst=True, errors='coerce')
                            return parsed.strftime('%Y-%m-%d') if pd.notna(parsed) else None
                        except: return None
                    df['date_iso'] = df['date'].apply(normalize_date)
                
                transactions = df.to_dict('records')
                result = {
                    'success': True,
                    'transactions': transactions,
                    'count': len(transactions),
                    'metadata': metadata or {},
                    'bank': metadata.get('bank', 'Unknown') if metadata else 'Unknown',
                    'debug': {
                        'page_count': len(df) if df is not None else 0,
                        'first_page_sample': metadata.get('raw_rows_sample')[:5] if metadata else []
                    }
                }
            else:
                # Diagnostics for empty result
                try:
                    import pdfplumber # type: ignore
                    with pdfplumber.open(pdf_path) as pdf:
                        debug_words = " ".join([str(w['text']) for w in pdf.pages[0].extract_words()[:20]])
                except:
                    debug_words = "Failed to extract words for debug"
                
                result = {
                    'success': True,
                    'transactions': [],
                    'count': 0,
                    'metadata': metadata or {},
                    'error': 'No transactions found',
                    'debug': {
                        'first_20_words': debug_words,
                        'pdf_path': str(pdf_path),
                        'pdf_exists': pdf_path.exists()
                    }
                }
            
            import math
            def sanitize(obj):
                if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                    return None
                if isinstance(obj, dict):
                    return {k: sanitize(v) for k, v in obj.items()}
                if isinstance(obj, list):
                    return [sanitize(i) for i in obj]
                return obj

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps(sanitize(result), ensure_ascii=False, default=str)
            }
            
        finally:
            # Clean up temporary file
            try:
                if pdf_path.exists():
                    pdf_path.unlink()
            except:
                pass
                
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"✗ Error in PDF parser: {error_details}", file=sys.stderr)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Failed to parse PDF',
                'details': str(e)
            })
        }
