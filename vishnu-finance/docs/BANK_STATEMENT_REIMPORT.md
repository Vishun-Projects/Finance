# Safe Bank Statement Re-import

Use this flow when you want to wipe transaction data and re-import PDFs **without deleting stored PDF files**.

## What to delete

- **Delete:** `transactions` and `account_statements` rows for your user (soft-delete via UI or hard delete in DB).
- **Do NOT delete:** files in Supabase bucket `bank-statements`, or local copies in `data/statements/`.

## Re-import steps

1. Delete existing transactions from the Transactions page (bulk delete) or clear account statement records if needed.
2. Keep PDFs in Supabase — they are not removed when transactions are deleted.
3. Re-upload each PDF from the Transactions page (drag/drop or file picker).
4. Review the parse preview:
   - **Parser method** badge (primary, table_fallback, ocr_fallback, gemini_fallback)
   - **Balance reconciled** status
   - Credits/debits comparison vs PDF metadata
5. Import only when reconciliation passes, or check **Import anyway** if you accept partial data.
6. Categorization runs automatically on import (inline or background for large statements).

## Duplicate handling

- Normal import uses `dedupHash` — re-import after deleting transactions will insert fresh rows.
- **Import anyway** sets `forceInsert: true` and skips duplicate checks (use after a full wipe).

## Parser fallback order

1. Primary 14-stage spatial pipeline (balance-driven inference)
2. Table extraction fallback (`pdfplumber.extract_tables`)
3. OCR fallback (Tesseract → layout pipeline)
4. Gemini structured extraction (last resort, validated)

## Local testing

```bash
# Terminal 1 — Next.js app
npm run dev

# Terminal 2 — Python parser (optional locally)
cd python_api && uvicorn main:app --host 127.0.0.1 --port 8000

# Terminal 3 — golden test runner (place PDFs in data/statements/)
node data/test_runner.js
```

## OCR setup (optional, for scanned PDFs)

Install Tesseract on your machine, then:

```bash
pip install pdf2image pytesseract Pillow
```

On Windows, ensure Tesseract is on PATH or set `TESSDATA_PREFIX` if needed.

## Account Aggregator (future)

Direct bank sync via India Account Aggregator requires FIU registration/partnership. PDF import remains the supported path for now.
