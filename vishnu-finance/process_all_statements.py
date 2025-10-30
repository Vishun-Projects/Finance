
import os
import glob
import pandas as pd
from pathlib import Path

def process_all_statements():
    """Process all PDF statements in the directory."""
    
    # Look for all PDF files
    pdf_files = glob.glob("*.pdf")
    pdf_files.extend(glob.glob("Statement*.pdf"))
    pdf_files.extend(glob.glob("AccountStatement*.pdf"))
    
    print(f"Found {len(pdf_files)} PDF files: {pdf_files}")
    
    all_transactions = []
    
    for pdf_file in pdf_files:
        if os.path.exists(pdf_file):
            print(f"\n=== Processing {pdf_file} ===")
            try:
                df = parse_bank_statement_accurately(Path(pdf_file))
                df['source_file'] = pdf_file
                all_transactions.append(df)
                print(f"Extracted {len(df)} transactions from {pdf_file}")
            except Exception as e:
                print(f"Error processing {pdf_file}: {e}")
    
    if all_transactions:
        combined_df = pd.concat(all_transactions, ignore_index=True)
        
        # Remove duplicates
        combined_df = combined_df.drop_duplicates(subset=['date', 'description', 'debit', 'credit'])
        
        # Convert dates
        combined_df["date_iso"] = pd.to_datetime(combined_df["date"], errors="coerce").dt.date
        
        # Save results
        combined_df.to_csv("all_year_transactions.csv", index=False)
        
        print(f"\n=== COMPLETE YEAR SUMMARY ===")
        print(f"Total unique transactions: {len(combined_df)}")
        print(f"Date range: {combined_df['date'].min()} to {combined_df['date'].max()}")
        print(f"Total debits: {combined_df['debit'].sum():.2f}")
        print(f"Total credits: {combined_df['credit'].sum():.2f}")
        print(f"Net balance change: {combined_df['credit'].sum() - combined_df['debit'].sum():.2f}")
        
        return combined_df
    else:
        print("No transactions found")
        return pd.DataFrame()

if __name__ == "__main__":
    process_all_statements()
