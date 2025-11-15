"""
Final Accurate Bank Statement Parser
-----------------------------------
Precise parser that correctly identifies debits and credits based on the actual
bank statement format.

Supports PDF statements from multiple Indian banks including:
- Axis Bank (UTIB), Yes Bank (YESB), Kotak Mahindra Bank (KKBK)
- HDFC Bank (HDFC), Jio Payments Bank (JIOP)
- SBI (State Bank of India - SBIN)
- Indian Bank (IDIB)
"""

import re
import sqlite3
import pandas as pd
from pathlib import Path
import pdfplumber

def extract_store_and_commodity(description):
    """Extract store name and commodity from transaction description."""
    store = None
    commodity = None
    clean_description = description
    
    # Pattern to match: TRANSACTION_CODE/Store Name /other_info /commodity
    # Example: YESB0PTMUPI/Sangam Stationery Stores /XXXXX /pens
    
    # First, try to extract store name (text after first slash, before next slash or UPI/code)
    store_match = re.search(r'^[A-Z0-9]+/([^/]+?)(?:\s*/\s*(?:[A-Z0-9@]+|UPI|BRANCH)|$)', description)
    if store_match:
        store = store_match.group(1).strip()
        # Clean up store name
        store = re.sub(r'\s+', ' ', store).strip()
    
    # Extract commodity - look for meaningful words, prioritize actual commodities over technical codes
    commodity_patterns = [
        # Pattern 1: XXXXX /something /UPI /numbers /commodity
        r'/\s*XXXXX\s*/\s*[^/]+\s*/\s*UPI\s*/\s*[0-9]+\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)',
        # Pattern 2: XXXXX /something /commodity /BRANCH
        r'/\s*XXXXX\s*/\s*[^/]+\s*/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*(?:BRANCH|@))',
        # Pattern 3: Direct commodity before UPI/BRANCH
        r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*/\s*(?:UPI|BRANCH|paytmqr|@))',
        # Pattern 4: Commodity at the end
        r'/\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s*$)',
    ]
    
    for pattern in commodity_patterns:
        commodity_match = re.search(pattern, description)
        if commodity_match:
            candidate = commodity_match.group(1).strip()
            # Skip technical codes and meaningless words
            if candidate and len(candidate) > 1 and candidate not in ['XXXXX', 'UPI', 'BRANCH', 'ATM', 'SERVICE']:
                commodity = candidate
                break
    
    # Clean up description
    clean_description = description
    
    # Remove store name part
    if store:
        clean_description = re.sub(r'^[A-Z0-9]+/[^/]+', '', clean_description)
    
    # Remove commodity
    if commodity:
        clean_description = re.sub(r'/\s*' + re.escape(commodity) + r'(?:\s|$)', '', clean_description)
    
    # Remove UPI IDs, codes, and other technical info
    clean_description = re.sub(r'/\s*[A-Z0-9@]+', '', clean_description)  # Remove UPI IDs, codes
    clean_description = re.sub(r'/\s*UPI', '', clean_description)  # Remove UPI references
    clean_description = re.sub(r'/\s*BRANCH.*', '', clean_description)  # Remove branch info
    clean_description = re.sub(r'/\s*paytmqr.*', '', clean_description)  # Remove Paytm QR codes
    clean_description = re.sub(r'/\s*XXXXX', '', clean_description)  # Remove placeholder codes
    clean_description = re.sub(r'\s+', ' ', clean_description).strip()  # Clean whitespace
    
    return store, commodity, clean_description

def parse_bank_statement_accurately(pdf_path: Path) -> pd.DataFrame:
    """Parse bank statement with accurate debit/credit detection."""
    
    transactions = []
    
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text()
            if not text:
                continue
                
            lines = text.split('\n')
            
            # Buffer to handle multi-line transaction descriptions
            current_transaction_lines = []
            current_date = None
            
            for line_num, line in enumerate(lines):
                line = line.strip()
                if not line:
                    # If we have accumulated lines and hit an empty line, process the transaction
                    if current_transaction_lines and current_date:
                        full_description = ' '.join(current_transaction_lines)
                        # Process the accumulated transaction
                        amount_patterns = [
                            r'INR\s*([0-9,]+(?:\.[0-9]{2})?)\s*-\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)',
                            r'-\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)',
                        ]
                        
                        transaction_amount = None
                        balance = None
                        is_credit = False
                        
                        for pattern in amount_patterns:
                            match = re.search(pattern, full_description)
                            if match:
                                if pattern.startswith('INR'):
                                    transaction_amount = float(match.group(1).replace(',', ''))
                                    balance = float(match.group(2).replace(',', ''))
                                    is_credit = False
                                else:
                                    transaction_amount = float(match.group(1).replace(',', ''))
                                    balance = float(match.group(2).replace(',', ''))
                                    is_credit = True
                                break
                        
                        if transaction_amount is not None and balance is not None:
                            # Store raw description before processing
                            raw_description = full_description
                            
                            # Extract description
                            description = full_description
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
                            
                            # Extract store and commodity information
                            store, commodity, clean_description = extract_store_and_commodity(description)
                            
                            # Combine commodity with existing remarks
                            combined_remarks = remarks or ''
                            if commodity:
                                if combined_remarks:
                                    combined_remarks += f', {commodity}'
                                else:
                                    combined_remarks = commodity
                            
                            # Determine transaction type and amount
                            if is_credit:
                                transaction_type = 'income'
                                amount = transaction_amount
                                debit = 0.0
                                credit = transaction_amount
                            else:
                                transaction_type = 'expense'
                                amount = transaction_amount
                                debit = transaction_amount
                                credit = 0.0
                            
                            transaction = {
                                'date': current_date,
                                'description': clean_description,
                                'raw': raw_description,
                                'remarks': combined_remarks,
                                'amount': amount,
                                'type': transaction_type,
                                'debit': debit,
                                'credit': credit,
                                'balance': balance,
                                'page': page_num + 1,
                                'line': line_num + 1,
                                'store': store,
                                'commodity': commodity
                            }
                            
                            transactions.append(transaction)
                            print(f"Extracted: {current_date} - {clean_description[:40]:<40} - {'Credit' if is_credit else 'Debit'}: {transaction_amount:>8.2f}")
                    
                    # Reset for next transaction
                    current_transaction_lines = []
                    current_date = None
                    continue
                
                # Look for transaction lines with dates
                date_match = re.search(r'(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})', line)
                if date_match:
                    # If we already have accumulated lines, process that transaction first
                    if current_transaction_lines and current_date:
                        full_description = ' '.join(current_transaction_lines)
                        # Process the accumulated transaction
                        amount_patterns = [
                            r'INR\s*([0-9,]+(?:\.[0-9]{2})?)\s*-\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)',
                            r'-\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)',
                        ]
                        
                        transaction_amount = None
                        balance = None
                        is_credit = False
                        
                        for pattern in amount_patterns:
                            match = re.search(pattern, full_description)
                            if match:
                                if pattern.startswith('INR'):
                                    transaction_amount = float(match.group(1).replace(',', ''))
                                    balance = float(match.group(2).replace(',', ''))
                                    is_credit = False
                                else:
                                    transaction_amount = float(match.group(1).replace(',', ''))
                                    balance = float(match.group(2).replace(',', ''))
                                    is_credit = True
                                break
                        
                        if transaction_amount is not None and balance is not None:
                            raw_description = full_description
                            
                            description = full_description
                            description = re.sub(r'\d{1,2}\s+[A-Za-z]{3}\s+\d{4}', '', description)
                            description = re.sub(r'INR\s*[0-9,]+(?:\.[0-9]{2})?', '', description)
                            description = re.sub(r'[+-]', '', description)
                            description = re.sub(r'\s{2,}', ' ', description).strip()
                            
                            remarks = ''
                            remark_match = re.search(r'/([A-Za-z][A-Za-z0-9 _.-]{2,})$', description)
                            if remark_match:
                                remarks = remark_match.group(1)
                                description = description[:remark_match.start()].strip(" /")
                            
                            store, commodity, clean_description = extract_store_and_commodity(description)
                            
                            combined_remarks = remarks or ''
                            if commodity:
                                if combined_remarks:
                                    combined_remarks += f', {commodity}'
                                else:
                                    combined_remarks = commodity
                            
                            if is_credit:
                                transaction_type = 'income'
                                amount = transaction_amount
                                debit = 0.0
                                credit = transaction_amount
                            else:
                                transaction_type = 'expense'
                                amount = transaction_amount
                                debit = transaction_amount
                                credit = 0.0
                            
                            transaction = {
                                'date': current_date,
                                'description': clean_description,
                                'raw': raw_description,
                                'remarks': combined_remarks,
                                'amount': amount,
                                'type': transaction_type,
                                'debit': debit,
                                'credit': credit,
                                'balance': balance,
                                'page': page_num + 1,
                                'line': line_num + 1,
                                'store': store,
                                'commodity': commodity
                            }
                            
                            transactions.append(transaction)
                            print(f"Extracted: {current_date} - {clean_description[:40]:<40} - {'Credit' if is_credit else 'Debit'}: {transaction_amount:>8.2f}")
                    
                    # Start new transaction
                    current_date = date_match.group(1)
                    current_transaction_lines = [line]
                else:
                    # Accumulate lines for current transaction
                    if current_date:
                        current_transaction_lines.append(line)
                    
            # Process last transaction if exists
            if current_transaction_lines and current_date:
                full_description = ' '.join(current_transaction_lines)
                amount_patterns = [
                    r'INR\s*([0-9,]+(?:\.[0-9]{2})?)\s*-\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)',
                    r'-\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)\s*INR\s*([0-9,]+(?:\.[0-9]{2})?)',
                ]
                
                transaction_amount = None
                balance = None
                is_credit = False
                
                for pattern in amount_patterns:
                    match = re.search(pattern, full_description)
                    if match:
                        if pattern.startswith('INR'):
                            transaction_amount = float(match.group(1).replace(',', ''))
                            balance = float(match.group(2).replace(',', ''))
                            is_credit = False
                        else:
                            transaction_amount = float(match.group(1).replace(',', ''))
                            balance = float(match.group(2).replace(',', ''))
                            is_credit = True
                        break
                
                if transaction_amount is not None and balance is not None:
                    raw_description = full_description
                    
                    description = full_description
                    description = re.sub(r'\d{1,2}\s+[A-Za-z]{3}\s+\d{4}', '', description)
                    description = re.sub(r'INR\s*[0-9,]+(?:\.[0-9]{2})?', '', description)
                    description = re.sub(r'[+-]', '', description)
                    description = re.sub(r'\s{2,}', ' ', description).strip()
                    
                    remarks = ''
                    remark_match = re.search(r'/([A-Za-z][A-Za-z0-9 _.-]{2,})$', description)
                    if remark_match:
                        remarks = remark_match.group(1)
                        description = description[:remark_match.start()].strip(" /")
                    
                    store, commodity, clean_description = extract_store_and_commodity(description)
                    
                    combined_remarks = remarks or ''
                    if commodity:
                        if combined_remarks:
                            combined_remarks += f', {commodity}'
                        else:
                            combined_remarks = commodity
                    
                    if is_credit:
                        transaction_type = 'income'
                        amount = transaction_amount
                        debit = 0.0
                        credit = transaction_amount
                    else:
                        transaction_type = 'expense'
                        amount = transaction_amount
                        debit = transaction_amount
                        credit = 0.0
                    
                    transaction = {
                        'date': current_date,
                        'description': clean_description,
                        'raw': raw_description,
                        'remarks': combined_remarks,
                        'amount': amount,
                        'type': transaction_type,
                        'debit': debit,
                        'credit': credit,
                        'balance': balance,
                        'page': page_num + 1,
                        'line': line_num + 1,
                        'store': store,
                        'commodity': commodity
                    }
                    
                    transactions.append(transaction)
                    print(f"Extracted: {current_date} - {clean_description[:40]:<40} - {'Credit' if is_credit else 'Debit'}: {transaction_amount:>8.2f}")
    
    # Convert to DataFrame and ensure date_iso is properly formatted
    df = pd.DataFrame(transactions)
    
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
        # LENIENT: Don't filter out rows with invalid dates - store with flag
        # Set hasInvalidDate flag for transactions without valid date_iso
        initial_count = len(df)
        invalid_date_count = df['date_iso'].isna().sum()
        if invalid_date_count > 0:
            df['hasInvalidDate'] = df['date_iso'].isna()
            print(f"⚠️ {invalid_date_count} transactions with invalid dates (kept with hasInvalidDate flag)")
        else:
            df['hasInvalidDate'] = False
        print(f"After date validation: {len(df)} transactions (all kept, {invalid_date_count} with invalid dates)")
    
    return df

def create_multiple_statement_processor():
    """Create a system to process multiple statement files."""
    
    processor_code = '''
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
            print(f"\\n=== Processing {pdf_file} ===")
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
        
        print(f"\\n=== COMPLETE YEAR SUMMARY ===")
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
'''
    
    with open("process_all_statements.py", "w") as f:
        f.write(processor_code)
    
    print("Created process_all_statements.py for handling multiple files")

def main():
    """Main function."""
    pdf_path = Path("AccountStatement.pdf")
    
    if not pdf_path.exists():
        print(f"PDF file not found: {pdf_path}")
        return
    
    print("=== ACCURATE TRANSACTION EXTRACTION ===")
    
    df = parse_bank_statement_accurately(pdf_path)
    
    if not df.empty:
        # Convert dates
        df["date_iso"] = pd.to_datetime(df["date"], errors="coerce").dt.date
        
        # Save results
        df.to_csv("accurate_transactions.csv", index=False)
        
        print(f"\\n=== ACCURATE RESULTS ===")
        print(f"Total transactions: {len(df)}")
        print(f"Date range: {df['date'].min()} to {df['date'].max()}")
        print(f"Total debits: {df['debit'].sum():.2f}")
        print(f"Total credits: {df['credit'].sum():.2f}")
        print(f"Net balance change: {df['credit'].sum() - df['debit'].sum():.2f}")
        
        # Show breakdown
        print(f"\\n=== TRANSACTION BREAKDOWN ===")
        print(f"Debit transactions: {len(df[df['debit'] > 0])}")
        print(f"Credit transactions: {len(df[df['credit'] > 0])}")
        
        # Show sample
        print(f"\\n=== SAMPLE TRANSACTIONS ===")
        for i, row in df.head(15).iterrows():
            amount = row['credit'] if row['credit'] > 0 else row['debit']
            txn_type = 'Credit' if row['credit'] > 0 else 'Debit'
            print(f"{i+1:2d}. {row['date']} - {row['description'][:35]:<35} - {txn_type}: {amount:>8.2f}")
        
        # Create multi-file processor
        create_multiple_statement_processor()
        
    else:
        print("No transactions found")

if __name__ == "__main__":
    main()
