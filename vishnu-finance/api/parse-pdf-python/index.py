"""
Vercel Python Serverless Function for PDF Parsing
Handles PDF bank statement parsing using the existing Python parsers
"""
import json
import base64
import sys
import os
from pathlib import Path
import tempfile

# Add tools directory to path
# In Vercel, the project root is the deployment root
# Try multiple possible paths
possible_roots = [
    Path('/var/task'),  # Vercel's deployment directory
    Path(__file__).parent.parent.parent,  # Relative from api/parse-pdf-python/
    Path.cwd(),  # Current working directory
]

tools_dir = None
for root in possible_roots:
    test_tools = root / 'tools'
    if test_tools.exists() and (test_tools / 'parsers').exists():
        tools_dir = test_tools
        sys.path.insert(0, str(tools_dir))
        sys.path.insert(0, str(tools_dir / 'parsers'))
        break

if not tools_dir:
    # Last resort: try relative path from current file
    tools_dir = Path(__file__).parent.parent.parent / 'tools'
    if str(tools_dir) not in sys.path:
        sys.path.insert(0, str(tools_dir))
    parsers_dir = tools_dir / 'parsers'
    if str(parsers_dir) not in sys.path:
        sys.path.insert(0, str(parsers_dir))

def handler(request):
    """Vercel serverless function handler"""
    try:
        # Parse request body - Vercel passes request as dict with 'body' key (string)
        # In some cases, it might be a Request object
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
            # Import parsers - handle import errors gracefully
            import pandas as pd
            
            # Try importing parsers with multiple fallback paths
            BankDetector = None
            parse_bank_statement = None
            parse_bank_statement_accurately = None
            StatementMetadataExtractor = None
            
            # Debug: Print sys.path for troubleshooting
            print(f"Python sys.path: {sys.path}", file=sys.stderr)
            print(f"Tools dir: {tools_dir}", file=sys.stderr)
            if tools_dir:
                print(f"Tools dir exists: {tools_dir.exists()}", file=sys.stderr)
            
            try:
                from parsers.bank_detector import BankDetector  # type: ignore
                print("Successfully imported BankDetector from parsers.bank_detector", file=sys.stderr)
            except ImportError as e:
                print(f"Failed to import from parsers.bank_detector: {e}", file=sys.stderr)
                try:
                    from bank_detector import BankDetector  # type: ignore
                    print("Successfully imported BankDetector from bank_detector", file=sys.stderr)
                except ImportError as e2:
                    print(f"Failed to import BankDetector: {e2}", file=sys.stderr)
            
            try:
                from bank_statement_parser import parse_bank_statement  # type: ignore
                print("Successfully imported parse_bank_statement", file=sys.stderr)
            except ImportError as e:
                print(f"Failed to import parse_bank_statement: {e}", file=sys.stderr)
            
            try:
                from accurate_parser import parse_bank_statement_accurately  # type: ignore
                print("Successfully imported parse_bank_statement_accurately", file=sys.stderr)
            except ImportError as e:
                print(f"Failed to import parse_bank_statement_accurately: {e}", file=sys.stderr)
            
            try:
                from parsers.statement_metadata import StatementMetadataExtractor  # type: ignore
                print("Successfully imported StatementMetadataExtractor from parsers.statement_metadata", file=sys.stderr)
            except ImportError:
                try:
                    from statement_metadata import StatementMetadataExtractor  # type: ignore
                    print("Successfully imported StatementMetadataExtractor from statement_metadata", file=sys.stderr)
                except ImportError:
                    print("StatementMetadataExtractor not available", file=sys.stderr)
            
            df = None
            metadata = None
            detected_bank = None
            
            # Try bank-specific parser first
            if BankDetector:
                try:
                    detected_bank = BankDetector.detect_from_file(pdf_path)
                    print(f"Detected bank: {detected_bank}", file=sys.stderr)
                    if detected_bank in ['SBIN', 'IDIB', 'KKBK', 'KKBK_V2', 'HDFC', 'MAHB'] and parse_bank_statement:
                        result = parse_bank_statement(pdf_path, detected_bank)
                        if isinstance(result, tuple):
                            df, metadata = result
                        else:
                            df = result
                            metadata = None
                        
                        if df is not None and not df.empty:
                            print(f"Bank-specific parser extracted {len(df)} transactions", file=sys.stderr)
                        else:
                            # Try accurate parser as fallback
                            if parse_bank_statement_accurately:
                                try:
                                    df_temp = parse_bank_statement_accurately(pdf_path)
                                    if df_temp is not None and not df_temp.empty:
                                        df = df_temp
                                        print(f"Accurate parser (fallback) extracted {len(df)} transactions", file=sys.stderr)
                                except Exception as e:
                                    print(f"Accurate parser (fallback) error: {e}", file=sys.stderr)
                except Exception as e:
                    print(f"Bank detection/parsing error: {e}", file=sys.stderr)
                    import traceback
                    traceback.print_exc(file=sys.stderr)
            
            # If still no transactions, try accurate parser
            if (df is None or (hasattr(df, 'empty') and df.empty)) and parse_bank_statement_accurately:
                try:
                    df = parse_bank_statement_accurately(pdf_path)
                    if df is not None and not df.empty:
                        print(f"Accurate parser extracted {len(df)} transactions", file=sys.stderr)
                        # Try to extract metadata
                        if not metadata and StatementMetadataExtractor:
                            try:
                                metadata = StatementMetadataExtractor.extract_all_metadata(
                                    pdf_path, detected_bank or 'UNKNOWN', df
                                )
                            except Exception as meta_err:
                                print(f"Metadata extraction error: {meta_err}", file=sys.stderr)
                                metadata = {}
                except Exception as e:
                    print(f"Accurate parser error: {e}", file=sys.stderr)
                    import traceback
                    traceback.print_exc(file=sys.stderr)
                    if df is None:
                        df = pd.DataFrame()
            
            # Final fallback: try bank-specific parser without bank code
            if (df is None or (hasattr(df, 'empty') and df.empty)) and parse_bank_statement:
                try:
                    result = parse_bank_statement(pdf_path)
                    if isinstance(result, tuple):
                        df, metadata = result
                    else:
                        df = result
                    if df is not None and not df.empty:
                        print(f"Generic parser extracted {len(df)} transactions", file=sys.stderr)
                    # Try to extract metadata if not already extracted
                    if not metadata and df is not None and not df.empty and StatementMetadataExtractor:
                        try:
                            metadata = StatementMetadataExtractor.extract_all_metadata(
                                pdf_path, detected_bank or 'UNKNOWN', df
                            )
                        except Exception as meta_err:
                            print(f"Metadata extraction error: {meta_err}", file=sys.stderr)
                            metadata = {}
                except Exception as e:
                    print(f"Fallback parser error: {e}", file=sys.stderr)
                    import traceback
                    traceback.print_exc(file=sys.stderr)
                    if df is None:
                        df = pd.DataFrame()
            
            # If still no data, create empty DataFrame
            if df is None:
                df = pd.DataFrame()
                print("Warning: All parsers failed, returning empty DataFrame", file=sys.stderr)
            
            # Ensure metadata is a dict
            if metadata is None:
                metadata = {}
            elif not isinstance(metadata, dict):
                metadata = {}
            
            # Convert DataFrame to JSON
            if df is not None and hasattr(df, 'to_dict'):
                # Normalize dates
                if 'date_iso' not in df.columns and 'date' in df.columns:
                    def normalize_date(date_val):
                        if pd.isna(date_val):
                            return None
                        try:
                            date_str = str(date_val).strip()
                            parsed = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
                            if pd.notna(parsed):
                                return parsed.strftime('%Y-%m-%d')
                            return None
                        except:
                            return None
                    df['date_iso'] = df['date'].apply(normalize_date)
                
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
            else:
                transactions = []
            
            result = {
                'success': True,
                'transactions': transactions,
                'count': len(transactions),
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
                if pdf_path.exists():
                    pdf_path.unlink()
            except:
                pass
                
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in PDF parser: {error_details}", file=sys.stderr)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Failed to parse PDF',
                'details': str(e)
            })
        }

