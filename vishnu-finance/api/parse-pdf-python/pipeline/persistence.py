import logging
from typing import List, Dict, Any
from .models import JobContext, FinalTransaction

logger = logging.getLogger(__name__)

class PersistenceShim:
    """
    Stage 12-14: Persistence & Output
    """
    
    def save_and_format(self, ctx: JobContext, transactions: List[FinalTransaction], validation: Dict[str, Any], candidates: List[Any] = None) -> Dict[str, Any]:
        logger.info("Formatting Final Output")
        
        # Convert transactions to list of dicts
        txn_list = []
        for t in transactions:
            txn_list.append({
                "date": t.date,
                "date_iso": t.date_iso,
                "description": t.description,
                "amount": t.credit if t.credit > 0 else -t.debit, # Standard signed amount
                "debit": t.debit,
                "credit": t.credit,
                "balance": t.balance,
                "confidence": t.confidence,
                "reasons": t.reasons,
                "bankCode": t.bankCode,
                "accountNumber": ctx.metadata.get("accountNumber"),
                "store": t.store,
                "personName": t.personName,
                "commodity": t.commodity
            })
            
        # Extract some raw rows for debugging/display
        raw_rows = []
        if ctx.pages:
            # Sample first page rows
            for row in ctx.pages[0].lines[:50]:
                raw_rows.append(" ".join([w.text for w in row]))

        return {
            "status": "success",
            "statement_id": ctx.statement_id,
            "bank": ctx.bank_code,
            "account_holder": ctx.account_holder_name,
            "metadata": {
                "pdf_type": str(ctx.pdf_type),
                "validation": validation,
                "page_count": len(ctx.pages),
                "raw_rows_sample": raw_rows,
                "raw_candidates": [vars(c) if hasattr(c, "__dict__") else c for c in (candidates or [])][:100],
                **ctx.metadata # Include all extracted heuristic metadata
            },
            "transactions": txn_list
        }

    def create_failure_response(self, error_msg: str) -> Dict[str, Any]:
        return {"status": "failed", "error": error_msg}

