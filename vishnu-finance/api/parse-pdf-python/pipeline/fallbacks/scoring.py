from typing import Any, Dict


def compute_parse_score(result: Dict[str, Any]) -> float:
    """
    Higher is better. Prefer reconciled statements with more transactions.
    """
    if not result or result.get("status") == "failed":
        return -1.0

    if result.get("status") == "needs_password":
        return -2.0

    transactions = result.get("transactions") or []
    txn_count = len(transactions)
    if txn_count == 0:
        return 0.0

    validation = (result.get("metadata") or {}).get("validation") or {}
    valid = bool(validation.get("valid"))
    reconciled = bool(validation.get("reconciled"))
    mismatch_count = int(validation.get("mismatch_count") or 0)

    score = txn_count
    if reconciled:
        score += 500
    if valid:
        score += 1000
    score -= mismatch_count * 10

    return float(score)
