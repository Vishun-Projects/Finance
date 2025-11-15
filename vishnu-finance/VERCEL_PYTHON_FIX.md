# Vercel Python Parsing Fix

## Issue
PDF parsing fails on Vercel with error: "Failed to parse PDF. Please ensure it's a valid bank statement. All parsing methods (Python serverless, local Python, and Node.js fallback) failed."

## Root Causes
1. **Path Resolution**: The `tools` directory might not be accessible in Vercel's serverless environment
2. **Import Failures**: Python modules in `tools/parsers/` might not be found
3. **Dependencies**: Python dependencies might not be installed correctly

## Fixes Applied

### 1. Improved Path Resolution (`api/parse-pdf-python/index.py`)
- Added multiple fallback paths for finding the `tools` directory
- Tries `/var/task/tools`, relative paths, and current working directory
- Adds both `tools` and `tools/parsers` to `sys.path`

### 2. Better Error Handling
- All imports now have try/except blocks with detailed error logging
- Functions check if imports succeeded before using them
- Added debug logging to stderr (visible in Vercel logs)

### 3. Graceful Degradation
- If imports fail, the function still returns a proper error response
- Node.js fallback parser should still work if Python fails

## Debugging Steps

1. **Check Vercel Function Logs**:
   - Go to Vercel Dashboard → Your Project → Functions
   - Click on the failed function
   - Check the logs for Python import errors

2. **Verify Tools Directory is Included**:
   - The `tools` directory must be in the deployment
   - Check if `.vercelignore` is excluding it

3. **Verify Requirements.txt**:
   - `requirements.txt` should be in the project root
   - Vercel should automatically install dependencies

4. **Check Python Runtime**:
   - Vercel should auto-detect Python files in `api/` directory
   - No explicit runtime needed in `vercel.json` (removed to avoid errors)

## Next Steps if Still Failing

1. **Check Vercel Logs**: Look for the debug messages we added:
   - "Python sys.path: ..."
   - "Tools dir: ..."
   - "Successfully imported ..." or "Failed to import ..."

2. **Verify Tools Directory Structure**:
   ```
   tools/
     parsers/
       __init__.py
       bank_detector.py
       ...
     bank_statement_parser.py
     accurate_parser.py
     ...
   ```

3. **Alternative: Bundle Tools with Function**:
   - Copy `tools` directory into each `api/*-python/` directory
   - Or create a shared package structure

4. **Use Node.js Fallback**:
   - The Node.js parser should work as a fallback
   - Check if it's being called when Python fails

## Current Configuration

- `vercel.json`: No runtime specified (auto-detect)
- `requirements.txt`: In project root
- Python functions: In `api/parse-*-python/index.py`
- Tools directory: Should be included in deployment

## Testing

After deployment, test with a PDF upload and check:
1. Vercel function logs for Python errors
2. Network tab for the `/api/parse-pdf-python` request
3. Whether Node.js fallback is being used

