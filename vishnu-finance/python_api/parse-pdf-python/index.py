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
        
        # Save to temporary file in /tmp (only writable directory in Vercel)
        tmp_dir = Path('/tmp')
        tmp_file_path = tmp_dir / f'statement_{os.getpid()}_{id(pdf_bytes)}.pdf'
        with open(tmp_file_path, 'wb') as tmp_file:
            tmp_file.write(pdf_bytes)
        pdf_path = tmp_file_path
        
        try:
            # Fallback to local parsers (vendored)
            import pandas as pd
            # Add current directory to sys.path to ensure local imports work
            current_file_path = Path(__file__).resolve()
            current_dir = current_file_path.parent
            if str(current_dir) not in sys.path:
                sys.path.insert(0, str(current_dir))
            
            # Additional check for parsers directory
            parsers_dir = current_dir / 'parsers'
            if parsers_dir.exists() and str(parsers_dir) not in sys.path:
                sys.path.insert(0, str(parsers_dir))

            from bank_statement_parser import parse_bank_statement  # type: ignore
            from accurate_parser import parse_bank_statement_accurately  # type: ignore
            try:
                from parsers.statement_metadata import StatementMetadataExtractor  # type: ignore
            except Exception:
                try:
                    from statement_metadata import StatementMetadataExtractor  # type: ignore
                except Exception:
                    StatementMetadataExtractor = None

            df = None
            metadata = None
            if bank_hint:
                try:
                    res = parse_bank_statement(pdf_path, bank_hint.upper())
                    if isinstance(res, tuple):
                        df, metadata = res
                    else:
                        df = res
                except Exception as e:
                    print(f"Warning: bank_statement_parser failed: {e}", file=sys.stderr)
                    pass
            
            if df is None or (hasattr(df, 'empty') and df.empty):
                try:
                    tmp = parse_bank_statement_accurately(pdf_path)
                    if tmp is not None and not tmp.empty:
                        df = tmp
                except Exception as e:
                    print(f"Warning: accurate_parser failed: {e}", file=sys.stderr)
                    pass
            
            if metadata is None and df is not None and not df.empty and StatementMetadataExtractor:
                try:
                    metadata = StatementMetadataExtractor.extract_all_metadata(pdf_path, bank_hint or 'UNKNOWN', df)
                except Exception:
                    metadata = {}
            if df is None:
                df = pd.DataFrame()
            if 'date_iso' not in df.columns and 'date' in df.columns:
                def normalize_date(date_val):
                    if pd.isna(date_val):
                        return None
                    try:
                        parsed = pd.to_datetime(str(date_val).strip(), dayfirst=True, errors='coerce')
                        if pd.notna(parsed):
                            return parsed.strftime('%Y-%m-%d')
                        return None
                    except:
                        return None
                df['date_iso'] = df['date'].apply(normalize_date)
            if 'date_iso' in df.columns:
                df = df[df['date_iso'].notna()].copy()
            transactions = df.to_dict('records') if hasattr(df, 'to_dict') else []
            result = {
                'success': True,
                'transactions': transactions,
                'count': len(transactions),
                'metadata': metadata or {}
            }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps(result, ensure_ascii=False, default=str)
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
