import os
import sys
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logging.getLogger('pipeline').setLevel(logging.DEBUG)
logging.getLogger('pdfminer').setLevel(logging.WARNING)
logging.getLogger('pdfplumber').setLevel(logging.WARNING)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pipeline.orchestrator import ParseOrchestrator


def test_orchestrator(file_path: str):
    orchestrator = ParseOrchestrator()
    result = orchestrator.parse(
        file_path,
        statement_id=Path(file_path).stem,
        max_pages=None,
    )

    if result.get("status") == "needs_password":
        print("NEEDS_PASSWORD")
        return

    if result.get("status") != "success":
        print(f"FAILED: {result.get('error')}")
        return

    txns = result.get("transactions") or []
    print(f"Parser method: {result.get('parserMethod')}")
    print(f"SUCCESS: Extracted {len(txns)} transactions")

    validation = result.get("metadata", {}).get("validation", {})
    print(f"Validation valid: {validation.get('valid')}")
    print(f"Reconciled: {validation.get('reconciled')}")
    print(f"Mismatches: {validation.get('mismatch_count', 'N/A')}")

    for t in txns[:5]:
        amt = t.get('credit', 0) - t.get('debit', 0)
        print(f"{t.get('date', 'N/A')} | {amt:>10.2f} | {t.get('balance', 0.0):>10.2f} | {str(t.get('description', ''))[:40]}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_authoritative_pipeline.py <statement.pdf>")
        sys.exit(1)

    test_orchestrator(sys.argv[1])
