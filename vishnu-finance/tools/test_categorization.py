"""
Test Script for Categorized Transaction Import
============================================
This script tests the new categorization functionality where:
- Credit transactions go to Income
- Debit transactions go to Expenses  
- Zero amounts are filtered out
"""

import pandas as pd

def test_categorization():
    """Test the categorization logic."""
    
    print("=== TRANSACTION CATEGORIZATION TEST ===")
    
    # Sample parsed transactions (as they would come from the API)
    sample_transactions = [
        {
            'date': '2025-08-30',
            'description': 'YESB0MCHUPI',
            'remarks': 'Snehal',
            'debit': '58.0',
            'credit': '0.0',
            'balance': '8250.52',
            'page': '1',
            'line': '21',
            'date_iso': '2025-08-30',
            'type': 'expense'
        },
        {
            'date': '2025-08-30',
            'description': 'BARB0BHABOM',
            'remarks': 'KASHMIRA',
            'debit': '0.0',
            'credit': '20.0',
            'balance': '6932.52',
            'page': '1',
            'line': '25',
            'date_iso': '2025-08-30',
            'type': 'income'
        },
        {
            'date': '2025-08-30',
            'description': 'ZERO_TRANSACTION',
            'remarks': '',
            'debit': '0.0',
            'credit': '0.0',
            'balance': '6932.52',
            'page': '1',
            'line': '26',
            'date_iso': '2025-08-30',
            'type': 'expense'
        }
    ]
    
    print(f"Total transactions to process: {len(sample_transactions)}")
    
    income_count = 0
    expense_count = 0
    skipped_count = 0
    
    for i, transaction in enumerate(sample_transactions):
        debit_amount = float(transaction['debit'])
        credit_amount = float(transaction['credit'])
        
        print(f"\n--- Transaction {i+1}: {transaction['description']} ---")
        print(f"Debit: {debit_amount}, Credit: {credit_amount}")
        
        # Skip zero amounts
        if debit_amount == 0 and credit_amount == 0:
            print("❌ SKIPPED: Zero amount transaction")
            skipped_count += 1
            continue
        
        # Categorize transaction
        if credit_amount > 0:
            print(f"✅ INCOME: {transaction['description']} - ₹{credit_amount}")
            income_count += 1
        else:
            print(f"✅ EXPENSE: {transaction['description']} - ₹{debit_amount}")
            expense_count += 1
    
    print(f"\n=== RESULTS ===")
    print(f"✅ Income entries: {income_count}")
    print(f"✅ Expense entries: {expense_count}")
    print(f"❌ Skipped (zero amounts): {skipped_count}")
    print(f"📊 Total processed: {income_count + expense_count}")

if __name__ == "__main__":
    test_categorization()
