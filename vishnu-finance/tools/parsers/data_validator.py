"""
Data Validator
==============
Post-parse validation to ensure data integrity and completeness.
"""

import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime


class DataValidator:
    """Validates parsed transaction data for completeness and accuracy."""
    
    @staticmethod
    def validate_transactions(df: pd.DataFrame, bank_code: Optional[str] = None) -> Dict:
        """
        Validate transaction DataFrame for data integrity.
        
        Args:
            df: DataFrame with transactions
            bank_code: Bank code for bank-specific validation
            
        Returns:
            Dictionary with validation results:
            - valid: bool
            - errors: List of error messages
            - warnings: List of warning messages
            - stats: Dictionary with statistics
        """
        result = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'stats': {}
        }
        
        if df.empty:
            result['errors'].append("DataFrame is empty - no transactions extracted")
            result['valid'] = False
            return result
        
        # Collect statistics
        result['stats'] = {
            'total_transactions': len(df),
            'transactions_with_dates': df['date_iso'].notna().sum() if 'date_iso' in df.columns else 0,
            'transactions_with_amounts': ((df.get('debit', 0) != 0) | (df.get('credit', 0) != 0)).sum() if 'debit' in df.columns or 'credit' in df.columns else 0,
            'transactions_with_descriptions': df['description'].notna().sum() if 'description' in df.columns else 0,
        }
        
        # Validate required columns
        required_columns = ['date_iso', 'amount']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            result['errors'].append(f"Missing required columns: {missing_columns}")
            result['valid'] = False
        
        # Validate dates
        date_issues = DataValidator._validate_dates(df)
        if date_issues['errors']:
            result['errors'].extend(date_issues['errors'])
            result['valid'] = False
        if date_issues['warnings']:
            result['warnings'].extend(date_issues['warnings'])
        
        # Validate amounts
        amount_issues = DataValidator._validate_amounts(df)
        if amount_issues['errors']:
            result['errors'].extend(amount_issues['errors'])
            result['valid'] = False
        if amount_issues['warnings']:
            result['warnings'].extend(amount_issues['warnings'])
        
        # Validate balance continuity
        balance_issues = DataValidator._validate_balance_continuity(df)
        if balance_issues['errors']:
            result['errors'].extend(balance_issues['errors'])
        if balance_issues['warnings']:
            result['warnings'].extend(balance_issues['warnings'])
        
        # Validate transaction completeness
        completeness_issues = DataValidator._validate_completeness(df)
        if completeness_issues['errors']:
            result['errors'].extend(completeness_issues['errors'])
        if completeness_issues['warnings']:
            result['warnings'].extend(completeness_issues['warnings'])
        
        return result
    
    @staticmethod
    def _validate_dates(df: pd.DataFrame) -> Dict:
        """Validate date fields."""
        issues = {'errors': [], 'warnings': []}
        
        if 'date_iso' not in df.columns:
            issues['errors'].append("Missing 'date_iso' column")
            return issues
        
        # Check for missing dates
        missing_dates = df['date_iso'].isna().sum()
        if missing_dates > 0:
            issues['errors'].append(f"{missing_dates} transactions have missing dates")
        
        # Check for invalid date formats
        valid_dates = df['date_iso'].notna()
        if valid_dates.any():
            # Try to parse dates to check format
            parsed_dates = pd.to_datetime(df.loc[valid_dates, 'date_iso'], errors='coerce')
            invalid_dates = parsed_dates.isna().sum()
            if invalid_dates > 0:
                issues['errors'].append(f"{invalid_dates} transactions have invalid date formats")
        
        # Check for chronological order (warnings only, not errors)
        if valid_dates.sum() > 1:
            try:
                valid_df = df.loc[valid_dates].copy()
                parsed_dates = pd.to_datetime(valid_df['date_iso'], errors='coerce')
                if parsed_dates.notna().sum() > 1:
                    # Reset index for comparison
                    parsed_dates = parsed_dates.reset_index(drop=True)
                    sorted_dates = parsed_dates.sort_values().reset_index(drop=True)
                    
                    # Compare element-wise
                    if not parsed_dates.equals(sorted_dates):
                        # Count out-of-order transactions by comparing values
                        out_of_order = 0
                        for i in range(len(parsed_dates)):
                            if parsed_dates.iloc[i] != sorted_dates.iloc[i]:
                                out_of_order += 1
                        
                        if out_of_order > 0:
                            issues['warnings'].append(
                                f"{out_of_order} transactions are out of chronological order "
                                "(may be valid due to processing delays)"
                            )
            except Exception:
                # Skip chronological validation if there's an error
                pass
        
        return issues
    
    @staticmethod
    def _validate_amounts(df: pd.DataFrame) -> Dict:
        """Validate amount fields."""
        issues = {'errors': [], 'warnings': []}
        
        has_debit = 'debit' in df.columns
        has_credit = 'credit' in df.columns
        has_amount = 'amount' in df.columns
        
        if not (has_debit or has_credit or has_amount):
            issues['errors'].append("Missing amount columns (debit, credit, or amount)")
            return issues
        
        # Check for transactions with zero amounts
        if has_debit and has_credit:
            zero_amounts = ((df['debit'] == 0) & (df['credit'] == 0)).sum()
            if zero_amounts > 0:
                issues['errors'].append(f"{zero_amounts} transactions have zero amounts (both debit and credit are 0)")
            
            # Check for transactions with both debit and credit non-zero
            both_nonzero = ((df['debit'] > 0) & (df['credit'] > 0)).sum()
            if both_nonzero > 0:
                issues['errors'].append(f"{both_nonzero} transactions have both debit and credit non-zero")
            
            # Check for negative amounts
            negative_debits = (df['debit'] < 0).sum()
            negative_credits = (df['credit'] < 0).sum()
            if negative_debits > 0:
                issues['warnings'].append(f"{negative_debits} transactions have negative debit amounts")
            if negative_credits > 0:
                issues['warnings'].append(f"{negative_credits} transactions have negative credit amounts")
        
        # Check for very large amounts (potential parsing errors)
        if has_amount:
            very_large = (df['amount'].abs() > 1e10).sum()
            if very_large > 0:
                issues['warnings'].append(f"{very_large} transactions have unusually large amounts (may be parsing errors)")
        
        return issues
    
    @staticmethod
    def _validate_balance_continuity(df: pd.DataFrame, tolerance: float = 0.01) -> Dict:
        """Validate balance continuity across transactions."""
        issues = {'errors': [], 'warnings': []}
        
        if 'balance' not in df.columns:
            return issues  # No balance column, skip validation
        
        # Sort by date for proper sequence
        if 'date_iso' in df.columns:
            df_sorted = df.sort_values('date_iso').copy()
        else:
            df_sorted = df.copy()
        
        # Check balance reconciliation
        balance_errors = 0
        balance_warnings = 0
        
        for i in range(1, len(df_sorted)):
            prev_balance = df_sorted.iloc[i-1]['balance']
            curr_balance = df_sorted.iloc[i]['balance']
            
            if pd.isna(prev_balance) or pd.isna(curr_balance):
                continue
            
            debit = df_sorted.iloc[i].get('debit', 0) or 0
            credit = df_sorted.iloc[i].get('credit', 0) or 0
            
            expected_balance = prev_balance + credit - debit
            difference = abs(curr_balance - expected_balance)
            
            if difference > tolerance:
                if difference > 1.0:  # Large difference - error
                    balance_errors += 1
                else:  # Small difference - warning (rounding)
                    balance_warnings += 1
        
        if balance_errors > 0:
            issues['errors'].append(
                f"{balance_errors} transactions have balance reconciliation errors "
                "(balance doesn't match previous balance + credit - debit)"
            )
        if balance_warnings > 0:
            issues['warnings'].append(
                f"{balance_warnings} transactions have minor balance discrepancies "
                "(likely due to rounding)"
            )
        
        return issues
    
    @staticmethod
    def _validate_completeness(df: pd.DataFrame) -> Dict:
        """Validate transaction completeness."""
        issues = {'errors': [], 'warnings': []}
        
        # Check for missing descriptions
        if 'description' in df.columns:
            missing_desc = df['description'].isna().sum()
            empty_desc = (df['description'] == '').sum() if df['description'].dtype == 'object' else 0
            total_missing = missing_desc + empty_desc
            
            if total_missing > 0:
                issues['warnings'].append(f"{total_missing} transactions have missing or empty descriptions")
        
        # Check for missing references
        if 'reference' in df.columns:
            missing_ref = df['reference'].isna().sum()
            if missing_ref > 0:
                issues['warnings'].append(f"{missing_ref} transactions have missing reference numbers")
        
        # Check for missing bank codes
        if 'bankCode' in df.columns:
            missing_bank = df['bankCode'].isna().sum()
            if missing_bank > 0:
                issues['warnings'].append(f"{missing_bank} transactions have missing bank codes")
        
        return issues
    
    @staticmethod
    def generate_validation_report(validation_result: Dict) -> str:
        """
        Generate human-readable validation report.
        
        Args:
            validation_result: Result from validate_transactions()
            
        Returns:
            Formatted report string
        """
        lines = []
        lines.append("=" * 60)
        lines.append("DATA VALIDATION REPORT")
        lines.append("=" * 60)
        lines.append("")
        
        # Statistics
        stats = validation_result.get('stats', {})
        lines.append("STATISTICS:")
        for key, value in stats.items():
            lines.append(f"  {key.replace('_', ' ').title()}: {value}")
        lines.append("")
        
        # Errors
        errors = validation_result.get('errors', [])
        if errors:
            lines.append("ERRORS:")
            for error in errors:
                lines.append(f"  ❌ {error}")
            lines.append("")
        else:
            lines.append("✅ No errors found")
            lines.append("")
        
        # Warnings
        warnings = validation_result.get('warnings', [])
        if warnings:
            lines.append("WARNINGS:")
            for warning in warnings:
                lines.append(f"  ⚠️  {warning}")
            lines.append("")
        else:
            lines.append("✅ No warnings")
            lines.append("")
        
        # Overall status
        if validation_result.get('valid', False):
            lines.append("STATUS: ✅ VALID")
        else:
            lines.append("STATUS: ❌ INVALID")
        
        lines.append("=" * 60)
        
        return "\n".join(lines)


def validate_data(df: pd.DataFrame, bank_code: Optional[str] = None) -> Dict:
    """
    Convenience function for data validation.
    
    Args:
        df: DataFrame with transactions
        bank_code: Bank code for bank-specific validation
        
    Returns:
        Validation result dictionary
    """
    return DataValidator.validate_transactions(df, bank_code)

