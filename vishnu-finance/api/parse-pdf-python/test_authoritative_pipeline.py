import os
import sys
import json
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
# Set our pipeline to DEBUG
logging.getLogger('pipeline').setLevel(logging.DEBUG)
# Silence verbose libs
logging.getLogger('pdfminer').setLevel(logging.WARNING)
logging.getLogger('pdfplumber').setLevel(logging.WARNING)

# Add current dir to path
sys.path.append(os.getcwd())

from pipeline.manager import PipelineManager

def test_mah_b_parsing():
    # Use the sample file provided in the user's previous logs if possible, 
    # but since I don't have the literal file path on the system, 
    # I'll rely on the user's report or check the uploads dir.
    
    uploads_dir = Path(r"C:\Users\VISHNU~1.VIS\AppData\Local\Temp\pdf-uploads")
    recent_files = sorted(uploads_dir.glob("statement_*.pdf"), key=os.path.getmtime, reverse=True)
    
    if not recent_files:
        print("No recent statement files found in uploads dir.")
        return

    file_path = recent_files[0]
    print(f"Testing with most recent file: {file_path}")
    
    manager = PipelineManager()
    result = manager.run_pipeline(str(file_path), statement_id="test_verification", max_pages=5)
    
    if result["status"] == "success":
        txns = result["transactions"]
        print(f"SUCCESS: Extracted {len(txns)} transactions")
        
        # Check first and last balance
        if txns:
            try:
                print(f"First Txn Balance: {txns[0]['balance']}")
                print(f"Last Txn Balance: {txns[-1]['balance']}")
            except KeyError:
                 print("Balance not found in transactions")
            
        validation = result.get("metadata", {}).get("validation", {})
        print(f"Validation Valid: {validation.get('valid')}")
        print(f"Mismatches: {validation.get('mismatch_count', 'N/A')}")
        
        # Print sample
        for t in txns[:10]:
             amt = t.get('credit', 0) - t.get('debit', 0)
             date = t.get('date', 'N/A')
             bal = t.get('balance', 0.0)
             desc = t.get('description', '')[:40]
             print(f"{date} | {amt:>10.2f} | {bal:>10.2f} | {desc}")
    else:
        print(f"FAILED: {result.get('error')}")

if __name__ == "__main__":
    test_mah_b_parsing()
