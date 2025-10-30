
import sys
import os
sys.path.append('C:\Users\vishnu.vishwakarma\Desktop\Projects\Finance\vishnu-finance\tools')

# Update the configuration
PDF_FILE = "C:\Users\vishnu.vishwakarma\Desktop\Projects\Finance\vishnu-finance\uploads\statement_1761626470864.pdf"
CSV_FILE = "C:\Users\vishnu.vishwakarma\Desktop\Projects\Finance\vishnu-finance\uploads\extracted_1761626470867.csv"
DB_FILE = "C:\Users\vishnu.vishwakarma\Desktop\Projects\Finance\vishnu-finance\uploads\transactions_1761626470867.db"

# Import and run the parser
from bank_statement_parser import extract_text_from_pdf, parse_transactions, save_to_csv_and_db
from pathlib import Path

def main():
    pdf_path = Path(PDF_FILE)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    print(f"📄 Extracting transactions from: {pdf_path.name}")

    text = extract_text_from_pdf(pdf_path)
    df = parse_transactions(text)

    print(f"✅ Extracted {len(df)} transactions.")
    save_to_csv_and_db(df, Path(CSV_FILE), Path(DB_FILE))

    print(f"📊 CSV saved → {CSV_FILE}")
    print(f"🗄️  SQLite DB saved → {DB_FILE}")

if __name__ == "__main__":
    main()
