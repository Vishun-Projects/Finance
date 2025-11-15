# Vercel Python Serverless Restructure

## Problem
PDF parsing was failing on Vercel because the `tools` directory wasn't accessible in the serverless environment. The Python functions couldn't import the parsers.

## Solution
Completely restructured all Python serverless functions to be self-contained with bundled parsers.

## Changes Made

### 1. Bundled Parsers into Each Function Directory
- **`api/parse-pdf-python/`**: Contains `index.py`, `bank_statement_parser.py`, `accurate_parser.py`, and `parsers/` subdirectory
- **`api/parse-bank-statement-python/`**: Same structure
- **`api/parse-file-python/`**: Same structure + `multi_format_parser.py`

### 2. Updated Import Paths
All parsers now use local imports:
- `from bank_statement_parser import parse_bank_statement`
- `from accurate_parser import parse_bank_statement_accurately`
- `from parsers.bank_detector import BankDetector` (with fallback to `from bank_detector import BankDetector`)

### 3. Fixed Import Handling
- Added try/except blocks for all imports
- Graceful fallback if imports fail
- Better error logging to stderr (visible in Vercel logs)

### 4. Updated Handler Functions
All three Python serverless functions now:
- Use local directory paths (`Path(__file__).parent`)
- Add current directory and `parsers/` subdirectory to `sys.path`
- Have comprehensive error handling
- Return proper Vercel response format

## File Structure

```
api/
├── parse-pdf-python/
│   ├── index.py (main handler)
│   ├── bank_statement_parser.py
│   ├── accurate_parser.py
│   └── parsers/
│       ├── __init__.py
│       ├── bank_detector.py
│       ├── base_parser.py
│       ├── sbi_parser.py
│       ├── indian_bank_parser.py
│       ├── kotak_bank_parser.py
│       ├── kotak_bank_parser_v2.py
│       ├── hdfc_bank_parser.py
│       ├── sbm_parser.py
│       ├── multi_bank_parser.py
│       ├── date_validator.py
│       ├── amount_validator.py
│       ├── statement_metadata.py
│       └── ai_parser.py
├── parse-bank-statement-python/
│   └── (same structure)
└── parse-file-python/
    └── (same structure + multi_format_parser.py)
```

## Testing

After deployment to Vercel:
1. Check function logs for import success messages (✓) or failures (✗)
2. Test PDF upload and verify parsing works
3. If still failing, check logs for specific import errors

## Benefits

1. **Self-contained**: Each function has everything it needs
2. **No external dependencies**: Doesn't rely on `tools/` directory
3. **Better error handling**: Clear error messages in logs
4. **Vercel-compatible**: Works with Vercel's serverless Python runtime

