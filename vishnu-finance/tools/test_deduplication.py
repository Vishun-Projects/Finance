"""
Deduplication Test Script
-------------------------
Test script to demonstrate the duplicate detection functionality.
"""

import pandas as pd
from datetime import datetime

def test_deduplication():
    """Test the deduplication logic."""
    
    print("=== DEDUPLICATION TEST ===")
    
    # Simulate existing data
    existing_data = [
        {
            'id': '1',
            'title': 'YESB0MCHUPI',
            'amount': 58.0,
            'date': '2025-08-30',
            'description': 'UPI transaction',
            'category': 'Bank Statement'
        },
        {
            'id': '2', 
            'title': 'Salary Payment',
            'amount': 50000.0,
            'date': '2025-09-01',
            'description': 'Monthly salary',
            'category': 'Salary'
        }
    ]
    
    # Simulate new data to import
    new_data = [
        {
            'title': 'YESB0MCHUPI',  # Duplicate - same title, date, amount
            'amount': '58.0',
            'date': '2025-08-30',
            'description': 'UPI transaction',
            'category': 'Bank Statement'
        },
        {
            'title': 'Freelance Work',  # New entry
            'amount': '15000.0',
            'date': '2025-09-15',
            'description': 'Web development project',
            'category': 'Freelance'
        },
        {
            'title': 'Salary Payment',  # Duplicate - same title, date, amount
            'amount': '50000.0',
            'date': '2025-09-01',
            'description': 'Monthly salary',
            'category': 'Salary'
        }
    ]
    
    print(f"Existing records: {len(existing_data)}")
    print(f"New records to import: {len(new_data)}")
    
    success_count = 0
    duplicate_count = 0
    
    for new_record in new_data:
        # Check for duplicates using the same logic as the frontend
        is_duplicate = any(
            existing['date'] == new_record['date'] and
            abs(existing['amount'] - float(new_record['amount'])) < 0.01 and
            existing['title'].lower().trim() == new_record['title'].lower().strip()
            for existing in existing_data
        )
        
        if is_duplicate:
            duplicate_count += 1
            print(f"❌ DUPLICATE SKIPPED: {new_record['title']} - {new_record['date']} - ₹{new_record['amount']}")
        else:
            success_count += 1
            print(f"✅ NEW RECORD: {new_record['title']} - {new_record['date']} - ₹{new_record['amount']}")
            # Add to existing data to prevent duplicates in same batch
            existing_data.append({
                'id': f'temp_{success_count}',
                'title': new_record['title'],
                'amount': float(new_record['amount']),
                'date': new_record['date'],
                'description': new_record['description'],
                'category': new_record['category']
            })
    
    print(f"\n=== RESULTS ===")
    print(f"✅ Successfully imported: {success_count}")
    print(f"❌ Duplicates skipped: {duplicate_count}")
    print(f"📊 Total existing records: {len(existing_data)}")

if __name__ == "__main__":
    test_deduplication()
