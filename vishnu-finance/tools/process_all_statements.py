"""
Multi-Statement Processor for Full Year Data
--------------------------------------------
Process multiple bank statement PDFs to extract ALL transactions for the entire year.
"""

import os
import glob
import pandas as pd
from pathlib import Path
import sqlite3
from accurate_parser import parse_bank_statement_accurately

def find_all_statement_files():
    """Find all PDF statement files in the directory."""
    
    patterns = [
        "*.pdf",
        "Statement*.pdf", 
        "AccountStatement*.pdf",
        "BankStatement*.pdf",
        "*Statement*.pdf"
    ]
    
    all_files = []
    for pattern in patterns:
        all_files.extend(glob.glob(pattern))
    
    # Remove duplicates and sort
    unique_files = list(set(all_files))
    unique_files.sort()
    
    return unique_files

def process_all_statements():
    """Process all PDF statements and combine results."""
    
    print("=== MULTI-STATEMENT PROCESSOR ===")
    
    # Find all PDF files
    pdf_files = find_all_statement_files()
    
    if not pdf_files:
        print("No PDF files found in the directory")
        return pd.DataFrame()
    
    print(f"Found {len(pdf_files)} PDF files:")
    for i, file in enumerate(pdf_files, 1):
        print(f"  {i}. {file}")
    
    all_transactions = []
    
    for pdf_file in pdf_files:
        if os.path.exists(pdf_file):
            print(f"\n=== Processing {pdf_file} ===")
            try:
                df = parse_bank_statement_accurately(Path(pdf_file))
                if not df.empty:
                    df['source_file'] = pdf_file
                    all_transactions.append(df)
                    print(f"✅ Extracted {len(df)} transactions from {pdf_file}")
                    
                    # Show summary
                    debits = df['debit'].sum()
                    credits = df['credit'].sum()
                    print(f"   Debits: ₹{debits:.2f}, Credits: ₹{credits:.2f}")
                else:
                    print(f"⚠️  No transactions found in {pdf_file}")
            except Exception as e:
                print(f"❌ Error processing {pdf_file}: {e}")
        else:
            print(f"❌ File not found: {pdf_file}")
    
    if all_transactions:
        # Combine all transactions
        combined_df = pd.concat(all_transactions, ignore_index=True)
        
        # Remove duplicates based on date, description, and amount
        print(f"\n=== DEDUPLICATION ===")
        print(f"Before deduplication: {len(combined_df)} transactions")
        
        combined_df = combined_df.drop_duplicates(subset=['date', 'description', 'debit', 'credit'])
        
        print(f"After deduplication: {len(combined_df)} transactions")
        
        # Convert dates
        combined_df["date_iso"] = pd.to_datetime(combined_df["date"], errors="coerce").dt.date
        
        # Sort by date
        combined_df = combined_df.sort_values('date_iso')
        
        # Save results
        combined_df.to_csv("complete_year_transactions.csv", index=False)
        
        # Save to SQLite
        conn = sqlite3.connect("complete_year_transactions.db")
        combined_df.to_sql("transactions", conn, if_exists="replace", index=False)
        conn.close()
        
        print(f"\n=== COMPLETE YEAR SUMMARY ===")
        print(f"📊 Total unique transactions: {len(combined_df)}")
        print(f"📅 Date range: {combined_df['date'].min()} to {combined_df['date'].max()}")
        print(f"💰 Total debits: ₹{combined_df['debit'].sum():,.2f}")
        print(f"💰 Total credits: ₹{combined_df['credit'].sum():,.2f}")
        print(f"📈 Net balance change: ₹{combined_df['credit'].sum() - combined_df['debit'].sum():,.2f}")
        
        print(f"\n=== TRANSACTION BREAKDOWN ===")
        print(f"💸 Debit transactions: {len(combined_df[combined_df['debit'] > 0])}")
        print(f"💵 Credit transactions: {len(combined_df[combined_df['credit'] > 0])}")
        
        # Monthly breakdown
        if not combined_df.empty:
            combined_df['month'] = pd.to_datetime(combined_df['date']).dt.to_period('M')
            monthly_summary = combined_df.groupby('month').agg({
                'debit': 'sum',
                'credit': 'sum',
                'date': 'count'
            }).round(2)
            monthly_summary.columns = ['Total_Debits', 'Total_Credits', 'Transaction_Count']
            monthly_summary['Net'] = monthly_summary['Total_Credits'] - monthly_summary['Total_Debits']
            
            print(f"\n=== MONTHLY BREAKDOWN ===")
            print(monthly_summary)
        
        # Show sample transactions
        print(f"\n=== SAMPLE TRANSACTIONS ===")
        for i, row in combined_df.head(20).iterrows():
            amount = row['credit'] if row['credit'] > 0 else row['debit']
            txn_type = 'Credit' if row['credit'] > 0 else 'Debit'
            print(f"{i+1:3d}. {row['date']} - {row['description'][:40]:<40} - {txn_type}: ₹{amount:>8.2f}")
        
        return combined_df
    else:
        print("❌ No transactions found in any PDF files")
        return pd.DataFrame()

def create_import_ready_data():
    """Create data ready for import into the income management system."""
    
    df = process_all_statements()
    
    if df.empty:
        return
    
    print(f"\n=== CREATING IMPORT-READY DATA ===")
    
    # Create income records (credits)
    income_records = df[df['credit'] > 0].copy()
    income_records['type'] = 'income'
    income_records['amount'] = income_records['credit']
    income_records['category'] = 'Bank Statement'
    income_records['payment_method'] = 'Bank Transfer'
    
    # Create expense records (debits)
    expense_records = df[df['debit'] > 0].copy()
    expense_records['type'] = 'expense'
    expense_records['amount'] = expense_records['debit']
    expense_records['category'] = 'Bank Statement'
    expense_records['payment_method'] = 'Bank Transfer'
    
    # Combine and format for import
    import_records = []
    
    for _, row in income_records.iterrows():
        import_records.append({
            'title': row['description'],
            'amount': row['amount'],
            'category': row['category'],
            'date': row['date_iso'],
            'description': row['description'],
            'payment_method': row['payment_method'],
            'notes': row['remarks'],
            'type': 'income'
        })
    
    for _, row in expense_records.iterrows():
        import_records.append({
            'title': row['description'],
            'amount': row['amount'],
            'category': 'Bank Statement Expense',
            'date': row['date_iso'],
            'description': row['description'],
            'payment_method': row['payment_method'],
            'notes': row['remarks'],
            'type': 'expense'
        })
    
    # Save import-ready data
    import_df = pd.DataFrame(import_records)
    import_df.to_csv("import_ready_transactions.csv", index=False)
    
    print(f"✅ Created import-ready data:")
    print(f"   📥 Income records: {len(income_records)}")
    print(f"   📤 Expense records: {len(expense_records)}")
    print(f"   📄 Total records: {len(import_records)}")
    print(f"   💾 Saved to: import_ready_transactions.csv")

if __name__ == "__main__":
    create_import_ready_data()
