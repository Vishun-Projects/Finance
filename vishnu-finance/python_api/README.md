## Unified Python Parser

- Single serverless endpoint: `api/parser/index.py`
- Dispatches by `type`: `pdf`, `file`, `bank-statement`

### Request

POST JSON:

```json
{
  "type": "pdf | file | bank-statement",
  "payload": { "... per type ..." }
}
```

Per type payloads:
- pdf: `{ "pdf_data": "<base64>", "bank": "hdfc|sbin|..." }`
- file: `{ "file_data": "<base64>", "file_type": ".pdf|.xls|.xlsx|.doc|.docx|.txt" }`
- bank-statement: `{ "file_data": "<base64>", "file_type": ".pdf|.xls|.xlsx", "bankType": "SBIN|HDFC|..." }`

### Response

Pass-through of existing handlers:

```json
{ "success": true, "transactions": [], "count": 0, "metadata": {} }
```

### Deployment

`vercel.json` restricts Python functions to `api/parser/**/*.py`.


