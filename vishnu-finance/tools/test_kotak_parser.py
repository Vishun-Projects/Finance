"""
Test script for Kotak Bank parser
"""
import sys
import os
from pathlib import Path
import pandas as pd

# Add tools directory to path
tools_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, tools_dir)

# Add parsers directory
parsers_dir = os.path.join(tools_dir, 'parsers')
sys.path.insert(0, parsers_dir)

from bank_statement_parser import parse_bank_statement
from bank_detector import BankDetector

def main():
    # Path to the Kotak PDF
    pdf_path = Path(r"C:\Users\vishnu.vishwakarma\Desktop\Projects\Finance\vishnu-finance\AccountStatement_01-Jul-2025_30-Sep-2025.pdf")
    
    if not pdf_path.exists():
        print(f"❌ PDF file not found: {pdf_path}")
        return
    
    print(f"📄 Testing Kotak Bank parser on: {pdf_path.name}")
    print("=" * 80)
    
    # Test bank detection
    print("\n1. Testing Bank Detection:")
    print("-" * 80)
    detected_bank = BankDetector.detect_from_file(pdf_path)
    print(f"   Detected bank: {detected_bank}")
    
    # Test parsing
    print("\n2. Testing PDF Parsing:")
    print("-" * 80)
    try:
        df = parse_bank_statement(pdf_path, bank_code=detected_bank or 'KKBK')
        
        if df.empty:
            print("   ⚠️  No transactions found!")
            print("\n   Checking parser output...")
            
            # Try to see what's in the PDF
            import pdfplumber
            with pdfplumber.open(str(pdf_path)) as pdf:
                print(f"   Total pages: {len(pdf.pages)}")
                for i, page in enumerate(pdf.pages[:2]):  # Check first 2 pages
                    print(f"\n   Page {i+1}:")
                    tables = page.extract_tables()
                    print(f"     Tables found: {len(tables)}")
                    if tables:
                        for j, table in enumerate(tables[:2]):
                            print(f"     Table {j+1} - Rows: {len(table)}")
                            if table and len(table) > 0:
                                print(f"     First row: {table[0]}")
                                if len(table) > 1:
                                    print(f"     Second row: {table[1]}")
                    
                    text = page.extract_text()
                    if text:
                        lines = text.split('\n')
                        print(f"     Text lines: {len(lines)}")
                        if lines:
                            print(f"     First 5 lines:")
                            for line in lines[:5]:
                                print(f"       {line[:100]}")
        else:
            print(f"   ✅ Successfully parsed {len(df)} transactions!")
            print(f"\n   Date range: {df['date_iso'].min()} to {df['date_iso'].max()}")
            print(f"   Total debits: ₹{df['debit'].sum():,.2f}")
            print(f"   Total credits: ₹{df['credit'].sum():,.2f}")
            
            print("\n   Sample transactions:")
            print("-" * 80)
            for idx, row in df.head(10).iterrows():
                txn_type = 'Credit' if row.get('credit', 0) > 0 else 'Debit'
                amount = row.get('credit', 0) if row.get('credit', 0) > 0 else row.get('debit', 0)
                desc = str(row.get('description', ''))[:60]
                print(f"   {row.get('date_iso', 'N/A')} | {txn_type:>6} | ₹{amount:>10,.2f} | {desc}")
            
            # Save to CSV for inspection
            csv_output = pdf_path.parent / f"parsed_{pdf_path.stem}.csv"
            df.to_csv(csv_output, index=False)
            print(f"\n   💾 Saved to: {csv_output}")
    
    except Exception as e:
        print(f"   ❌ Error parsing PDF: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

