
import sys
import os
sys.path.append(r'C:\\Users\\vishnu.vishwakarma\\Desktop\\Projects\\Finance\\vishnu-finance\\tools')

from pathlib import Path
import pandas as pd

try:
    # Try accurate parser first
    from accurate_parser import parse_bank_statement_accurately
    pdf_path = Path(r"C:\\Users\\vishnu.vishwakarma\\Desktop\\Projects\\Finance\\vishnu-finance\\uploads\\chat-attachments\\1763028322340_5ee4118d-e67e-4792-bdfd-b4cfd8215711_AccountStatement_02-11-2025 14_35_36.pdf")
    df = parse_bank_statement_accurately(pdf_path)
    if df is not None and not df.empty:
        # Convert DataFrame to readable text
        text_output = []
        text_output.append(f"Extracted {len(df)} transactions from PDF:")
        for idx, row in df.iterrows():
            text_output.append(f"\nTransaction {idx + 1}:")
            for col in df.columns:
                if pd.notna(row[col]):
                    text_output.append(f"  {col}: {row[col]}")
        print("\n".join(text_output))
    else:
        # Try pdfplumber for text extraction
        try:
            import pdfplumber
            with pdfplumber.open(str(pdf_path)) as pdf:
                full_text = []
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        full_text.append(page_text)
                    # Also extract tables
                    tables = page.extract_tables()
                    for table in tables:
                        if table:
                            for row in table:
                                if row and any(cell for cell in row if cell):
                                    full_text.append(" | ".join(str(cell) for cell in row if cell))
                if full_text:
                    print("\n".join(full_text))
                else:
                    print("[Scanned PDF - no text layer found. This appears to be an image-based PDF.]")
        except Exception as e:
            print(f"[pdfplumber error: {str(e)}]")
except Exception as e:
    import traceback
    print(f"[Python parser error: {str(e)}]")
    traceback.print_exc()
