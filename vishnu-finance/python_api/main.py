import json
import os
import sys
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Ensure the root directory of the python_api is in the PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent
sys.path.append(str(ROOT_DIR))

# Import the unified serverless handler
from index import handler as unified_handler

app = FastAPI(title="Vishnu Finance - Unified Python Parser Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "python-parser-microservice"}

@app.post("/api/parser")
@app.post("/api/parse-pdf-python")
@app.post("/api/parse-bank-statement-python")
async def parse_endpoint(request: Request):
    """
    HTTP endpoint that intercepts the request and safely passes it to the underlying 
    unified Vercel function pattern without spawning isolated processes.
    """
    try:
        body_dict = await request.json()
    except Exception:
        body_dict = {}

    # Mock the Vercel request object shape
    mock_request = {
        "body": json.dumps(body_dict, default=str)
    }

    try:
        result = unified_handler(mock_request)
        
        status_code = result.get("statusCode", 200)
        body_str = result.get("body", "{}")
        
        # Ensure we return clean JSON, not stringified JSON inside a string body
        parsed_body = json.loads(body_str) if isinstance(body_str, str) else body_str
        
        return JSONResponse(status_code=status_code, content=parsed_body)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500, 
            content={"error": "Internal Microservice Error", "details": str(e)}
        )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    # Run the uvicorn server locally
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
