"""
Comprehensive Test Suite for All Bank Parsers
==============================================
Tests all parsers with provided PDFs and validates metadata extraction.
"""

import sys
from pathlib import Path
import pandas as pd
from typing import Dict, Optional

# Add tools directory to path
tools_dir = Path(__file__).parent
if str(tools_dir) not in sys.path:
    sys.path.insert(0, str(tools_dir))

from bank_statement_parser import parse_bank_statement

# Test PDF files
TEST_PDFS = {
    'Kotak Type 1': 'AccountStatement_01-Jul-2025_30-Sep-2025.pdf',
    'Kotak Type 2': '2025-11-02-12-56-59Sep-25_400081.pdf',
    'HDFC': 'Acct Statement_7094_01112025_21.42.06 - converted.pdf',
    'SBI': 'AccountStatement.pdf',  # Assuming this is SBI
    'IDIB': 'AccountStatement_28-10-2025 11_00_46.pdf',  # Assuming this is Indian Bank
}

def validate_transactions(df: pd.DataFrame, pdf_name: str) -> Dict:
    """Validate parsed transactions."""
    results = {
        'transaction_count': len(df),
        'has_dates': False,
        'has_amounts': False,
        'has_balance': False,
        'has_bank_code': False,
        'debit_sum': 0.0,
        'credit_sum': 0.0,
        'date_range': None,
        'errors': []
    }
    
    try:
        # Check if we have transactions
        if df.empty:
            results['errors'].append("No transactions found")
            return results
        
        # Check date handling
        if 'date_iso' in df.columns:
            results['has_dates'] = True
            # Get date range
            if df['date_iso'].notna().any():
                min_date = df['date_iso'].min()
                max_date = df['date_iso'].max()
                results['date_range'] = f"{min_date} to {max_date}"
        else:
            results['errors'].append("Missing date_iso column")
        
        # Check amounts
        if 'debit' in df.columns and 'credit' in df.columns:
            results['has_amounts'] = True
            results['debit_sum'] = float(df['debit'].sum())
            results['credit_sum'] = float(df['credit'].sum())
        else:
            results['errors'].append("Missing debit/credit columns")
        
        # Check balance
        if 'balance' in df.columns:
            results['has_balance'] = df['balance'].notna().any()
        
        # Check bank code
        if 'bankCode' in df.columns:
            results['has_bank_code'] = True
            results['bank_code'] = df['bankCode'].iloc[0] if not df['bankCode'].isna().all() else None
    
    except Exception as e:
        results['errors'].append(f"Validation error: {str(e)}")
    
    return results

def validate_metadata(metadata: Optional[Dict], pdf_name: str) -> Dict:
    """Validate extracted metadata."""
    results = {
        'has_metadata': False,
        'account_number': None,
        'opening_balance': None,
        'closing_balance': None,
        'statement_period': None,
        'transaction_count': None,
        'total_debits': None,
        'total_credits': None,
        'errors': [],
        'warnings': []
    }
    
    if not metadata:
        results['errors'].append("No metadata returned")
        return results
    
    results['has_metadata'] = True
    
    # Account number
    if 'accountNumber' in metadata:
        results['account_number'] = metadata['accountNumber']
    else:
        results['warnings'].append("Missing account number")
    
    # Balances
    if 'openingBalance' in metadata:
        results['opening_balance'] = metadata['openingBalance']
    else:
        results['warnings'].append("Missing opening balance")
    
    if 'closingBalance' in metadata:
        results['closing_balance'] = metadata['closingBalance']
    else:
        results['warnings'].append("Missing closing balance")
    
    # Validate balance calculation
    if results['opening_balance'] and results['total_debits'] and results['total_credits'] and results['closing_balance']:
        calculated_closing = results['opening_balance'] + results['total_credits'] - results['total_debits']
        diff = abs(calculated_closing - results['closing_balance'])
        if diff > 0.01:  # Allow small rounding differences
            results['errors'].append(
                f"Balance mismatch: Calculated {calculated_closing:.2f}, "
                f"Expected {results['closing_balance']:.2f} (diff: {diff:.2f})"
            )
    
    # Statement period
    if 'statementStartDate' in metadata and 'statementEndDate' in metadata:
        start = metadata['statementStartDate']
        end = metadata['statementEndDate']
        results['statement_period'] = f"{start} to {end}"
    else:
        results['warnings'].append("Missing statement period")
    
    # Transaction totals
    if 'transactionCount' in metadata:
        results['transaction_count'] = metadata['transactionCount']
    
    if 'totalDebits' in metadata:
        results['total_debits'] = metadata['totalDebits']
    
    if 'totalCredits' in metadata:
        results['total_credits'] = metadata['totalCredits']
    
    return results

def test_parser(pdf_path: Path, pdf_name: str):
    """Test a parser with a specific PDF."""
    print(f"\n{'='*80}")
    print(f"Testing: {pdf_name}")
    print(f"File: {pdf_path}")
    print(f"{'='*80}")
    
    if not pdf_path.exists():
        print(f"[ERROR] File not found: {pdf_path}")
        return
    
    try:
        # Parse the statement
        df, metadata = parse_bank_statement(pdf_path)
        
        # Validate transactions
        txn_results = validate_transactions(df, pdf_name)
        
        print(f"\nTransaction Results:")
        print(f"  [+] Transaction count: {txn_results['transaction_count']}")
        
        if txn_results['has_dates']:
            print(f"  [+] Date range: {txn_results['date_range']}")
        else:
            print(f"  [-] Dates missing or invalid")
        
        if txn_results['has_amounts']:
            print(f"  [+] Debits: Rs {txn_results['debit_sum']:,.2f}")
            print(f"  [+] Credits: Rs {txn_results['credit_sum']:,.2f}")
        else:
            print(f"  [-] Amounts missing")
        
        if txn_results['has_balance']:
            print(f"  [+] Balance field present")
        
        if txn_results['has_bank_code']:
            print(f"  [+] Bank code: {txn_results['bank_code']}")
        
        if txn_results['errors']:
            print(f"\n[ERROR] Transaction Errors:")
            for error in txn_results['errors']:
                print(f"    - {error}")
        
        # Validate metadata
        meta_results = validate_metadata(metadata, pdf_name)
        
        print(f"\nMetadata Results:")
        print(f"  [+] Metadata present: {meta_results['has_metadata']}")
        
        if meta_results['account_number']:
            print(f"  [+] Account number: {meta_results['account_number']}")
        else:
            print(f"  [!] Account number: Not found")
        
        if meta_results['opening_balance'] is not None:
            print(f"  [+] Opening balance: Rs {meta_results['opening_balance']:,.2f}")
        else:
            print(f"  [!] Opening balance: Not found")
        
        if meta_results['closing_balance'] is not None:
            print(f"  [+] Closing balance: Rs {meta_results['closing_balance']:,.2f}")
        else:
            print(f"  [!] Closing balance: Not found")
        
        if meta_results['statement_period']:
            print(f"  [+] Statement period: {meta_results['statement_period']}")
        else:
            print(f"  [!] Statement period: Not found")
        
        if meta_results['total_debits'] is not None:
            print(f"  [+] Total debits: Rs {meta_results['total_debits']:,.2f}")
        if meta_results['total_credits'] is not None:
            print(f"  [+] Total credits: Rs {meta_results['total_credits']:,.2f}")
        if meta_results['transaction_count'] is not None:
            print(f"  [+] Transaction count: {meta_results['transaction_count']}")
        
        if meta_results['errors']:
            print(f"\n[ERROR] Metadata Errors:")
            for error in meta_results['errors']:
                print(f"    - {error}")
        
        if meta_results['warnings']:
            print(f"\n[WARN] Metadata Warnings:")
            for warning in meta_results['warnings']:
                print(f"    - {warning}")
        
        # Overall result
        total_errors = len(txn_results['errors']) + len(meta_results['errors'])
        total_warnings = len(meta_results['warnings'])
        
        if total_errors == 0 and total_warnings == 0:
            print(f"\n[PASS] All validations passed")
        elif total_errors == 0:
            print(f"\n[PARTIAL PASS] {total_warnings} warnings")
        else:
            print(f"\n[FAIL] {total_errors} errors, {total_warnings} warnings")
        
    except Exception as e:
        print(f"\n[ERROR] Failed to parse {pdf_name}")
        print(f"    {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    """Run all tests."""
    print("="*80)
    print("BANK PARSER TEST SUITE")
    print("="*80)
    
    # Get base directory
    base_dir = Path(__file__).parent.parent
    
    # Test each PDF
    for pdf_name, filename in TEST_PDFS.items():
        pdf_path = base_dir / filename
        test_parser(pdf_path, pdf_name)
    
    print(f"\n{'='*80}")
    print("TEST SUMMARY")
    print(f"{'='*80}")
    print("All tests completed. Review individual results above.")

if __name__ == "__main__":
    main()

