# Python Dependency Fix - Production Deployment Guide

## Overview
This document explains the multi-layered solution implemented to resolve Python dependency issues in Vercel serverless environments.

## Problem
- Vercel serverless functions don't have Python installed by default
- `exec('python ...')` commands fail with "python: command not found"
- Complex bank-specific parsers require Python libraries (pandas, PyPDF2, pdfplumber)

## Solution Architecture

### Three-Tier Fallback Strategy

1. **Primary: Python Serverless Functions** (Production)
   - Uses Vercel's Python 3.11 runtime
   - Proper serverless function handlers
   - Located in `api/parse-*-python/index.py`

2. **Secondary: Local Python Execution** (Development)
   - Falls back to local Python if serverless function unavailable
   - Uses `exec('python ...')` for local development
   - Maintains backward compatibility

3. **Tertiary: Node.js Fallback Parser** (Emergency Fallback)
   - Uses `pdf-parse` library for basic PDF parsing
   - Less accurate but ensures service availability
   - Only for PDF files (not Excel/Word)

## Files Created

### Python Serverless Functions
- `api/parse-pdf-python/index.py` - PDF parsing with bank detection
- `api/parse-file-python/index.py` - Multi-format file parsing
- `api/parse-bank-statement-python/index.py` - Bank statement parsing

### Node.js Fallback Parsers
- `src/lib/parsers/node-pdf-parser.ts` - Basic PDF text extraction
- `src/lib/parsers/bank-detector.ts` - Bank detection in TypeScript

### Configuration
- `vercel.json` - Python runtime configuration
- `requirements.txt` - Python dependencies for Vercel

## Files Modified

### API Routes (Three-Tier Fallback)
- `src/app/api/parse-pdf/route.ts`
- `src/app/api/parse-file/route.ts`
- `src/app/api/parse-bank-statement/route.ts`

## How It Works

### Production (Vercel)
1. Request comes to Next.js API route
2. Route tries to call Python serverless function via HTTP
3. Python function processes file using existing parsers
4. Returns JSON response
5. If Python function fails, falls back to Node.js parser (PDF only)

### Development (Local)
1. Request comes to Next.js API route
2. Route tries to call Python serverless function (may fail locally)
3. Falls back to local Python execution via `exec('python ...')`
4. If local Python fails, falls back to Node.js parser (PDF only)

## Environment Detection

The code automatically detects the environment:
- **Vercel Production**: Uses `process.env.VERCEL_URL`
- **Vercel Preview**: Uses `process.env.VERCEL`
- **Local Development**: Uses `http://localhost:3000`

## Important Notes

### Python Dependencies
- All Python dependencies are listed in `requirements.txt` at project root
- Vercel automatically installs these during deployment
- Ensure `tools/` directory is included in deployment (it should be by default)

### File System
- Python functions use `/tmp` directory (only writable location in Vercel)
- Temporary files are automatically cleaned up
- File size limit: 500 MB in `/tmp`

### Function Size
- Maximum uncompressed bundle: 250 MB
- Python dependencies may increase bundle size
- Monitor deployment size

### Performance
- Python functions may have cold starts (first invocation slower)
- Node.js fallback provides faster response but less accuracy
- Consider caching for frequently accessed files

## Testing

### Local Testing
```bash
# Test with Vercel CLI
vercel dev

# Test Python functions directly
curl -X POST http://localhost:3000/api/parse-pdf-python \
  -H "Content-Type: application/json" \
  -d '{"pdf_data": "<base64>", "bank": "sbi"}'
```

### Production Testing
1. Deploy to Vercel
2. Test PDF upload functionality
3. Check logs for which parser was used
4. Verify transaction extraction accuracy

## Troubleshooting

### Python Function Not Found
- Check `vercel.json` configuration
- Verify Python files are in `api/` directory
- Ensure `requirements.txt` exists at root

### Import Errors in Python
- Check `tools/` directory is included in deployment
- Verify Python path setup in function handlers
- Check `requirements.txt` has all dependencies

### Node.js Parser Issues
- Verify `pdf-parse` is installed: `npm install pdf-parse`
- Check file permissions for `/tmp` directory
- Review parser logs for extraction issues

## Deployment Checklist

- [ ] `vercel.json` configured with Python runtime
- [ ] `requirements.txt` includes all dependencies
- [ ] `tools/` directory included in deployment
- [ ] All three API routes updated with fallback logic
- [ ] Node.js parser files in `src/lib/parsers/`
- [ ] Test locally with `vercel dev`
- [ ] Deploy to Vercel and test production

## Performance Optimization

1. **Cold Start Mitigation**: Keep Python functions warm with periodic pings
2. **Caching**: Cache parsed results for identical files
3. **Bundle Size**: Exclude unnecessary files in `vercel.json`
4. **Timeout**: Set appropriate `maxDuration` (currently 180s)

## Monitoring

Monitor the following in production:
- Python function success rate
- Fallback to Node.js parser frequency
- Average parsing time
- Error rates by parser type
- File size distribution

## Future Improvements

1. **Async Processing**: Move heavy parsing to background jobs
2. **Caching Layer**: Cache parsed results in database
3. **Enhanced Node.js Parser**: Improve accuracy to match Python
4. **Streaming**: Process large files in chunks
5. **Cloud Storage**: Use S3/GCS for file storage instead of `/tmp`

