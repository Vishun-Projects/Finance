from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
from pathlib import Path
import json
import base64

# Add the parse-pdf-python directory to path
current_dir = Path(__file__).parent.parent / "api" / "parse-pdf-python"
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(current_dir / 'parsers'))

# Import the handler from index.py
import index
print(f"DEBUG: index module imported from: {index.__file__}")
from index import handler

app = FastAPI()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Python PDF Parser Microservice is running"}

@app.post("/api/parser")
async def parse_pdf(request: Request):
    """
    Expose the Vercel handler as a FastAPI endpoint.
    Expected format: 
    {
        "type": "pdf",
        "payload": {
            "pdf_data": "base64...",
            "bank": "hint",
            "bank_profiles": [...]
        }
    }
    """
    try:
        data = await request.json()
        
        # Extract payload as the handler expects it in the body
        payload = data.get("payload", {})
        
        # Call the Vercel handler
        # The handler expects an object with a 'json' method or dictionary
        response = handler({"body": json.dumps(payload)})
        
        # If the response is a dictionary with statusCode and body
        if isinstance(response, dict) and "statusCode" in response:
            status_code = response.get("statusCode", 200)
            body = response.get("body", "{}")
            
            # If body is a string, parse it
            if isinstance(body, str):
                body = json.loads(body)
            
            if status_code != 200:
                raise HTTPException(status_code=status_code, detail=body.get("error", "Failed to parse PDF"))
            
            return body
            
        return response
    except Exception as e:
        import traceback
        print(f"Error in FastAPI wrapper: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
