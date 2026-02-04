import logging
from typing import List, Dict, Any
from .models import FinalTransaction

logger = logging.getLogger(__name__)

class ValidatorShim:
    """
    Stage 10: Reconciliation & Validation Gate
    """
    
    def validate(self, transactions: List[FinalTransaction]) -> Dict[str, Any]:
        logger.info("Starting Stage 10: Reconciliation Gate")
        if not transactions:
            return {"valid": False, "reason": "No transactions extracted"}
            
        mismatches = []
        negatives = 0
        date_errors = 0
        
        # 1. Running Balance Consistency Check
        # Formula: Bal[i] = Bal[i-1] + Credit[i] - Debit[i]
        for i in range(1, len(transactions)):
            prev = transactions[i-1]
            curr = transactions[i]
            
            # Basic sequence check
            expected_bal = round(prev.balance + curr.credit - curr.debit, 2)
            actual_received = round(curr.balance, 2)
            
            if abs(expected_bal - actual_received) > 0.05: # Slight tolerance for rounding
                mismatches.append({
                    "index": i,
                    "date": curr.date,
                    "expected": expected_bal,
                    "actual": actual_received
                })
                logger.warning(f"Reconciliation mismatch at {curr.date}: Expected {expected_bal}, Got {actual_received}")

            # 2. Integrity: No negative amounts
            if curr.debit < 0 or curr.credit < 0:
                negatives += 1
            
            # 3. Integrity: Date sequence? (Banks often group by value date, not txn date, 
            # so we'll just log warnings rather than fail)

        # 4. Aggregate Calculation
        total_credits = sum(t.credit for t in transactions)
        total_debits = sum(t.debit for t in transactions)
        opening_bal = transactions[0].balance - transactions[0].credit + transactions[0].debit
        closing_bal = transactions[-1].balance
        
        reconciled = abs(round(opening_bal + total_credits - total_debits, 2) - round(closing_bal, 2)) < 0.1
        
        valid = len(mismatches) == 0 and reconciled
        
        return {
            "valid": valid,
            "reconciled": reconciled,
            "mismatch_count": len(mismatches),
            "mismatches": mismatches[:5], # top 5 for reporting
            "total_transactions": len(transactions),
            "total_credits": round(total_credits, 2),
            "total_debits": round(total_debits, 2),
            "opening_balance": round(opening_bal, 2),
            "closing_balance": round(closing_bal, 2),
            "integrity_errors": negatives + date_errors
        }

