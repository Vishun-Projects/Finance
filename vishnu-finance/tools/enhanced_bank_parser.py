"""
Enhanced Bank Statement PDF Parser
----------------------------------
Advanced parser that can handle multiple PDF formats and extract ALL transactions
from bank statements, including table-based formats.

Features:
- Handles table-based PDF statements
- Extracts ALL transactions (not just visible ones)
- Supports multiple PDF files
- Advanced pattern matching
- Comprehensive error handling
"""

import re
import sqlite3
import pandas as pd
from pathlib import Path
import os
import glob

# ========== CONFIGURATION ==========
PDF_FILES = ["AccountStatement.pdf"]  # Add more PDF files here
CSV_FILE = "all_extracted_transactions.csv"
DB_FILE = "all_transactions.db"
# ===================================

def extract_text_from_pdf_advanced(pdf_path: Path) -> str:
    """Extract text from PDF using multiple methods for maximum coverage."""
    text = ""
    
    try:
        # Method 1: PyPDF2
        from PyPDF2 import PdfReader
        reader = PdfReader(str(pdf_path))
        for page in reader.pages:
            text += page.extract_text() + "\n"
        print(f"PyPDF2 extracted {len(text)} characters")
    except Exception as e:
        print(f"PyPDF2 failed: {e}")
    
    try:
        # Method 2: pdfplumber (often better for tables)
        import pdfplumber
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                
                # Also extract tables
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        for row in table:
                            if row and any(cell for cell in row if cell):
                                text += " ".join(str(cell) for cell in row if cell) + "\n"
        print(f"pdfplumber extracted additional text")
    except Exception as e:
        print(f"pdfplumber failed: {e}")
    
    return text

def parse_transactions_advanced(text: str) -> pd.DataFrame:
    """Advanced transaction parsing with multiple pattern recognition."""
    
    # Normalize text
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'\n{2,}', '\n\n', text)
    
    print(f"Processing text of length: {len(text)}")
    
    # Multiple date patterns
    date_patterns = [
        r'(?P<date>\d{1,2}\s+[A-Za-z]{3}\s+\d{4})',  # 30 Aug 2025
        r'(?P<date>\d{1,2}/\d{1,2}/\d{4})',           # 30/08/2025
        r'(?P<date>\d{1,2}-\d{1,2}-\d{4})',           # 30-08-2025
        r'(?P<date>\d{4}-\d{1,2}-\d{1,2})',           # 2025-08-30
    ]
    
    # Find all date occurrences
    all_dates = []
    for pattern in date_patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            all_dates.append({
                'date': match.group('date'),
                'start': match.start(),
                'end': match.end(),
                'pattern': pattern
            })
    
    # Sort by position
    all_dates.sort(key=lambda x: x['start'])
    print(f"Found {len(all_dates)} date occurrences")
    
    # Extract transaction blocks
    transactions = []
    
    for i, date_info in enumerate(all_dates):
        # Get text around this date
        start_pos = max(0, date_info['start'] - 100)
        end_pos = min(len(text), date_info['end'] + 500)
        
        if i < len(all_dates) - 1:
            end_pos = min(end_pos, all_dates[i + 1]['start'])
        
        block_text = text[start_pos:end_pos]
        
        # Extract amounts from this block
        amount_patterns = [
            r'INR\s*([0-9,]+(?:\.[0-9]{2})?)',
            r'([0-9,]+(?:\.[0-9]{2})?)\s*INR',
            r'([+-]?)\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)',
            r'([0-9,]+(?:\.[0-9]{2})?)\s*-\s*INR',
            r'([0-9,]+(?:\.[0-9]{2})?)\s*\+\s*INR',
        ]
        
        amounts = []
        for pattern in amount_patterns:
            matches = re.finditer(pattern, block_text)
            for match in matches:
                if len(match.groups()) == 1:
                    amounts.append((match.group(1).replace(',', ''), match.start(), 'INR'))
                elif len(match.groups()) == 2:
                    amounts.append((match.group(2).replace(',', ''), match.start(), match.group(1) + 'INR'))
        
        # Sort amounts by position
        amounts.sort(key=lambda x: x[1])
        
        if amounts:
            # Extract transaction details
            transaction = {
                'date': date_info['date'],
                'description': '',
                'remarks': '',
                'debit': None,
                'credit': None,
                'balance': None,
            }
            
            # Clean description
            desc = block_text
            desc = re.sub(re.escape(date_info['date']), '', desc, count=1)
            for amount_info in amounts:
                desc = re.sub(r'INR\s*[0-9,]+(?:\.[0-9]{2})?', '', desc)
            desc = re.sub(r'\s{2,}', ' ', desc).strip()
            
            # Extract remarks
            remark_match = re.search(r'/([A-Za-z][A-Za-z0-9 _.-]{2,})$', desc)
            if remark_match:
                transaction['remarks'] = remark_match.group(1)
                desc = desc[:remark_match.start()].strip(" /")
            
            transaction['description'] = desc
            
            # Process amounts
            if len(amounts) >= 2:
                # Last amount is usually balance
                balance_val = amounts[-1][0]
                transaction['balance'] = float(balance_val)
                
                # Previous amount is transaction amount
                txn_val = amounts[-2][0]
                txn_type = amounts[-2][2]
                
                if '+' in txn_type or 'credit' in block_text.lower():
                    transaction['credit'] = float(txn_val)
                    transaction['debit'] = 0.0
                else:
                    transaction['debit'] = float(txn_val)
                    transaction['credit'] = 0.0
            
            transactions.append(transaction)
    
    # Convert to DataFrame
    df = pd.DataFrame(transactions)
    
    # Ensure date_iso is properly formatted for all transactions
    if not df.empty and 'date' in df.columns:
        def format_date_iso(date_val):
            """Format date to ISO format (YYYY-MM-DD)"""
            if pd.isna(date_val) or not date_val:
                return None
            try:
                # Try parsing various date formats (28 Oct 2025, etc.)
                parsed = pd.to_datetime(date_val, errors='coerce')
                if pd.isna(parsed):
                    return None
                # Return in ISO format
                return parsed.strftime('%Y-%m-%d')
            except:
                return None
        
        df['date_iso'] = df['date'].apply(format_date_iso)
        # Filter out rows with invalid dates
        initial_count = len(df)
        df = df[df['date_iso'].notna()].copy()
        if len(df) < initial_count:
            print(f"Filtered out {initial_count - len(df)} transactions with invalid dates")
    
    print(f"Extracted {len(df)} transactions with valid dates")
    return df

def parse_bank_statement_advanced(pdf_path: Path) -> pd.DataFrame:
    """Main function to parse a bank statement PDF using advanced methods.
    
    This is the main entry point that other scripts can import.
    It uses both pdfplumber and PyPDF2 for maximum coverage.
    """
    if isinstance(pdf_path, str):
        pdf_path = Path(pdf_path)
    
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    # Extract text using advanced methods
    text = extract_text_from_pdf_advanced(pdf_path)
    
    # Parse transactions from the extracted text
    df = parse_transactions_advanced(text)
    
    return df

def process_multiple_pdfs(pdf_files: list) -> pd.DataFrame:
    """Process multiple PDF files and combine results."""
    all_transactions = []
    
    for pdf_file in pdf_files:
        if os.path.exists(pdf_file):
            print(f"\n=== Processing {pdf_file} ===")
            try:
                text = extract_text_from_pdf_advanced(Path(pdf_file))
                df = parse_transactions_advanced(text)
                df['source_file'] = pdf_file
                all_transactions.append(df)
                print(f"Extracted {len(df)} transactions from {pdf_file}")
            except Exception as e:
                print(f"Error processing {pdf_file}: {e}")
        else:
            print(f"File not found: {pdf_file}")
    
    if all_transactions:
        combined_df = pd.concat(all_transactions, ignore_index=True)
        # Remove duplicates based on date, description, and amount
        combined_df = combined_df.drop_duplicates(subset=['date', 'description', 'debit', 'credit'])
        return combined_df
    else:
        return pd.DataFrame()

def save_to_csv_and_db(df: pd.DataFrame, csv_path: Path, db_path: Path):
    """Save extracted transactions to CSV and SQLite DB."""
    if df.empty:
        print("No transactions to save")
        return
    
    df.to_csv(csv_path, index=False)
    print(f"Saved {len(df)} transactions to CSV: {csv_path}")
    
    conn = sqlite3.connect(db_path)
    df.to_sql("transactions", conn, if_exists="replace", index=False)
    conn.commit()
    conn.close()
    print(f"Saved {len(df)} transactions to SQLite DB: {db_path}")

def main():
    """Main entry point for enhanced PDF processing."""
    print("=== ENHANCED BANK STATEMENT PARSER ===")
    
    # Check for PDF files
    pdf_files = []
    for pattern in ["*.pdf", "AccountStatement*.pdf", "Statement*.pdf"]:
        pdf_files.extend(glob.glob(pattern))
    
    if not pdf_files:
        pdf_files = PDF_FILES
    
    print(f"Found PDF files: {pdf_files}")
    
    # Process all PDFs
    df = process_multiple_pdfs(pdf_files)
    
    if not df.empty:
        # Convert dates
        df["date_iso"] = pd.to_datetime(df["date"], errors="coerce").dt.date
        
        # Save results
        save_to_csv_and_db(df, Path(CSV_FILE), Path(DB_FILE))
        
        print(f"\n=== SUMMARY ===")
        print(f"Total transactions extracted: {len(df)}")
        print(f"Date range: {df['date'].min()} to {df['date'].max()}")
        print(f"Total debits: {df['debit'].sum():.2f}")
        print(f"Total credits: {df['credit'].sum():.2f}")
        
        # Show sample transactions
        print(f"\n=== SAMPLE TRANSACTIONS ===")
        for i, row in df.head(5).iterrows():
            print(f"{i+1}. {row['date']} - {row['description'][:50]}... - {row['debit'] or row['credit']}")
    else:
        print("No transactions found in any PDF files")

if __name__ == "__main__":
    main()
