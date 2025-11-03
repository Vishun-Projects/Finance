"""
Diagnostic script to analyze Kotak Type 2 PDF format
"""
import sys
import os
from pathlib import Path
import pdfplumber

# Add tools directory to path
tools_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, tools_dir)

def analyze_pdf(pdf_path: Path):
    """Analyze PDF structure and extract sample data."""
    print(f"Analyzing PDF: {pdf_path.name}")
    print("=" * 80)
    
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            print(f"Total pages: {len(pdf.pages)}\n")
            
            # Analyze first few pages
            for page_num in range(min(3, len(pdf.pages))):
                page = pdf.pages[page_num]
                print(f"\n{'='*80}")
                print(f"PAGE {page_num + 1}")
                print(f"{'='*80}")
                
                # Extract text
                text = page.extract_text()
                if text:
                    print("\n--- TEXT CONTENT (first 50 lines) ---")
                    lines = text.split('\n')
                    for i, line in enumerate(lines[:50]):
                        if line.strip():
                            print(f"{i+1:3d}: {line[:100]}")
                
                # Extract tables
                tables = page.extract_tables()
                print(f"\n--- TABLES FOUND: {len(tables)} ---")
                for table_idx, table in enumerate(tables):
                    if not table:
                        continue
                    print(f"\nTable {table_idx + 1}:")
                    print(f"  Rows: {len(table)}")
                    if len(table) > 0:
                        print(f"  Header row: {table[0]}")
                    if len(table) > 1:
                        print(f"  Sample data row: {table[1]}")
                    if len(table) > 2:
                        print(f"  Another data row: {table[2]}")
                
                # Extract text by lines for pattern analysis
                if text:
                    print("\n--- KEY PATTERNS ---")
                    lines_lower = text.lower()
                    
                    # Look for Kotak identifiers
                    if 'kotak' in lines_lower or 'kkbk' in lines_lower:
                        print("  ✓ Contains Kotak/KKBK references")
                    
                    # Look for date patterns
                    import re
                    date_matches = re.findall(r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}', text)
                    if date_matches:
                        print(f"  ✓ Found {len(date_matches)} date patterns")
                        print(f"    Sample dates: {date_matches[:5]}")
                    
                    # Look for amount patterns
                    amount_matches = re.findall(r'[0-9,]+\.\d{2}', text)
                    if amount_matches:
                        print(f"  ✓ Found {len(amount_matches)} amount patterns")
                        print(f"    Sample amounts: {amount_matches[:5]}")
                    
                    # Look for column headers
                    header_keywords = ['date', 'narration', 'withdrawal', 'deposit', 'debit', 'credit', 'balance', 'ref', 'chq']
                    found_headers = []
                    for keyword in header_keywords:
                        if keyword in lines_lower:
                            found_headers.append(keyword)
                    if found_headers:
                        print(f"  ✓ Found header keywords: {', '.join(found_headers)}")
                    
                    # Look for opening/closing balance
                    if 'opening' in lines_lower and 'balance' in lines_lower:
                        print("  ✓ Contains opening balance reference")
                    if 'closing' in lines_lower and 'balance' in lines_lower:
                        print("  ✓ Contains closing balance reference")
                    
                    # Look for account number
                    acc_matches = re.findall(r'account\s+(?:no|number)[:\s]+(\d+)', text, re.IGNORECASE)
                    if acc_matches:
                        print(f"  ✓ Found account numbers: {acc_matches}")
    
    except Exception as e:
        print(f"Error analyzing PDF: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Analyze the new Kotak Type 2 PDF
    pdf_path = Path(r"C:\Users\vishnu.vishwakarma\Desktop\Projects\Finance\vishnu-finance\2025-11-02-12-56-59Sep-25_400081.pdf")
    
    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}")
        sys.exit(1)
    
    analyze_pdf(pdf_path)

