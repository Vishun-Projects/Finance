import json
import os
import logging
from datetime import datetime
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

DIAGNOSTIC_DIR = os.path.join(os.path.dirname(__file__), "diagnostics")

def log_suspicious_extraction(statement_id: str, raw_desc: str, extracted: Optional[str], score: float, bank: str):
    """
    Logs rows where the parser was unsure of the result.
    This helps the agent 'learn' from new/breaking formats.
    """
    if not os.path.exists(DIAGNOSTIC_DIR):
        os.makedirs(DIAGNOSTIC_DIR)
    
    log_path = os.path.join(DIAGNOSTIC_DIR, "failures.jsonl")
    
    entry = {
        "timestamp": datetime.now().isoformat(),
        "statement_id": statement_id,
        "bank": bank,
        "raw_description": raw_desc,
        "extracted_entity": extracted,
        "confidence_score": round(score, 3)
    }
    
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logger.error(f"Failed to write diagnostic log: {e}")

def get_failure_summary() -> List[Dict[str, Any]]:
    """Reads the failures for diagnostic review"""
    log_path = os.path.join(DIAGNOSTIC_DIR, "failures.jsonl")
    if not os.path.exists(log_path):
        return []
    
    failures = []
    with open(log_path, "r") as f:
        for line in f:
            if line.strip():
                failures.append(json.loads(line))
    return failures
