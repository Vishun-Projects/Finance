"""
Table-Based Bank Statement Parser
---------------------------------
Specialized parser for table-based bank statements that extracts ALL transactions
with proper formatting and structure.
"""

import re
import sqlite3
import pandas as pd
from pathlib import Path
import pdfplumber

def extract_table_transactions(pdf_path: Path) -> pd.DataFrame:
    """Extract transactions from table-based PDF statements."""
    
    transactions = []
    
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_num, page in enumerate(pdf.pages):
            print(f"Processing page {page_num + 1}")
            
            # Extract tables
            tables = page.extract_tables()
            
            for table_num, table in enumerate(tables):
                if not table:
                    continue
                    
                print(f"Found table {table_num + 1} with {len(table)} rows")
                
                # Process each row
                for row_num, row in enumerate(table):
                    if not row or len(row) < 3:
                        continue
                    
                    # Clean the row data
                    cleaned_row = [str(cell).strip() if cell else '' for cell in row]
                    
                    # Skip header rows
                    if any(header in ' '.join(cleaned_row).lower() for header in ['date', 'transaction', 'debit', 'credit', 'balance']):
                        continue
                    
                    # Look for date pattern in the row
                    row_text = ' '.join(cleaned_row)
                    date_match = re.search(r'(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})', row_text)
                    
                    if date_match:
                        date = date_match.group(1)
                        
                        # Extract amounts
                        amounts = re.findall(r'INR\s*([0-9,]+(?:\.[0-9]{2})?)', row_text)
                        amounts = [float(amt.replace(',', '')) for amt in amounts]
                        
                        if len(amounts) >= 2:
                            # Usually: transaction_amount, balance
                            transaction_amount = amounts[0]
                            balance = amounts[-1]
                            
                            # Determine if it's debit or credit
                            # Look for indicators in the row
                            is_credit = False
                            if '+' in row_text or 'credit' in row_text.lower():
                                is_credit = True
                            elif '-' in row_text or 'debit' in row_text.lower():
                                is_credit = False
                            else:
                                # Default: assume debit if no clear indicator
                                is_credit = False
                            
                            # Extract description
                            description = row_text
                            description = re.sub(r'\d{1,2}\s+[A-Za-z]{3}\s+\d{4}', '', description)
                            description = re.sub(r'INR\s*[0-9,]+(?:\.[0-9]{2})?', '', description)
                            description = re.sub(r'[+-]', '', description)
                            description = re.sub(r'\s{2,}', ' ', description).strip()
                            
                            # Extract remarks
                            remarks = ''
                            remark_match = re.search(r'/([A-Za-z][A-Za-z0-9 _.-]{2,})$', description)
                            if remark_match:
                                remarks = remark_match.group(1)
                                description = description[:remark_match.start()].strip(" /")
                            
                            transaction = {
                                'date': date,
                                'description': description,
                                'remarks': remarks,
                                'debit': 0.0 if is_credit else transaction_amount,
                                'credit': transaction_amount if is_credit else 0.0,
                                'balance': balance,
                                'page': page_num + 1,
                                'row': row_num + 1
                            }
                            
                            transactions.append(transaction)
                            print(f"Extracted: {date} - {description[:30]}... - {transaction_amount}")
    
    return pd.DataFrame(transactions)

def extract_line_by_line_transactions(pdf_path: Path) -> pd.DataFrame:
    """Extract transactions line by line from PDF text."""
    
    transactions = []
    
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text()
            if not text:
                continue
                
            lines = text.split('\n')
            
            for line_num, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue
                
                # Look for transaction lines
                date_match = re.search(r'(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})', line)
                if date_match:
                    date = date_match.group(1)
                    
                    # Extract amounts
                    amounts = re.findall(r'INR\s*([0-9,]+(?:\.[0-9]{2})?)', line)
                    amounts = [float(amt.replace(',', '')) for amt in amounts]
                    
                    if len(amounts) >= 2:
                        transaction_amount = amounts[0]
                        balance = amounts[-1]
                        
                        # Determine debit/credit
                        is_credit = '+' in line or 'credit' in line.lower()
                        
                        # Extract description
                        description = line
                        description = re.sub(r'\d{1,2}\s+[A-Za-z]{3}\s+\d{4}', '', description)
                        description = re.sub(r'INR\s*[0-9,]+(?:\.[0-9]{2})?', '', description)
                        description = re.sub(r'[+-]', '', description)
                        description = re.sub(r'\s{2,}', ' ', description).strip()
                        
                        # Extract remarks
                        remarks = ''
                        remark_match = re.search(r'/([A-Za-z][A-Za-z0-9 _.-]{2,})$', description)
                        if remark_match:
                            remarks = remark_match.group(1)
                            description = description[:remark_match.start()].strip(" /")
                        
                        transaction = {
                            'date': date,
                            'description': description,
                            'remarks': remarks,
                            'debit': 0.0 if is_credit else transaction_amount,
                            'credit': transaction_amount if is_credit else 0.0,
                            'balance': balance,
                            'page': page_num + 1,
                            'line': line_num + 1
                        }
                        
                        transactions.append(transaction)
    
    return pd.DataFrame(transactions)

def main():
    """Main function to extract all transactions."""
    pdf_path = Path("AccountStatement.pdf")
    
    if not pdf_path.exists():
        print(f"PDF file not found: {pdf_path}")
        return
    
    print("=== EXTRACTING ALL TRANSACTIONS ===")
    
    # Method 1: Table extraction
    print("\n--- Method 1: Table Extraction ---")
    df_table = extract_table_transactions(pdf_path)
    print(f"Table method found {len(df_table)} transactions")
    
    # Method 2: Line by line extraction
    print("\n--- Method 2: Line by Line Extraction ---")
    df_line = extract_line_by_line_transactions(pdf_path)
    print(f"Line method found {len(df_line)} transactions")
    
    # Combine and deduplicate
    all_transactions = []
    if not df_table.empty:
        df_table['method'] = 'table'
        all_transactions.append(df_table)
    if not df_line.empty:
        df_line['method'] = 'line'
        all_transactions.append(df_line)
    
    if all_transactions:
        combined_df = pd.concat(all_transactions, ignore_index=True)
        
        # Remove duplicates
        combined_df = combined_df.drop_duplicates(subset=['date', 'description', 'debit', 'credit'])
        
        # Convert dates
        combined_df["date_iso"] = pd.to_datetime(combined_df["date"], errors="coerce").dt.date
        
        # Save results
        combined_df.to_csv("complete_transactions.csv", index=False)
        
        print(f"\n=== FINAL RESULTS ===")
        print(f"Total unique transactions: {len(combined_df)}")
        print(f"Date range: {combined_df['date'].min()} to {combined_df['date'].max()}")
        print(f"Total debits: {combined_df['debit'].sum():.2f}")
        print(f"Total credits: {combined_df['credit'].sum():.2f}")
        
        # Show sample
        print(f"\n=== SAMPLE TRANSACTIONS ===")
        for i, row in combined_df.head(10).iterrows():
            amount = row['credit'] if row['credit'] > 0 else row['debit']
            print(f"{i+1:2d}. {row['date']} - {row['description'][:40]:<40} - {amount:>8.2f}")
    else:
        print("No transactions found")

if __name__ == "__main__":
    main()
