"""
Unified Vercel Python Serverless Function for Parsing
Standardized BaseHTTPRequestHandler for maximum compatibility.
"""
from http.server import BaseHTTPRequestHandler
import json
import sys
import os
from pathlib import Path
import importlib.util

# Add api directory to path
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

PDF_HANDLER_PATH = ROOT_DIR / "parse-pdf-python" / "index.py"

def _load_module_from_path(module_name: str, path: Path):
    spec = importlib.util.spec_from_file_location(module_name, str(path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load spec for {module_name} from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body_raw = self.rfile.read(content_length).decode('utf-8')
            incoming = json.loads(body_raw)
            
            req_type = (incoming.get("type") or "").strip().lower()
            payload = incoming.get("payload") or {}

            if req_type != "pdf":
                self._send_error(400, "Invalid type. Only 'pdf' is currently supported.")
                return

            if "pdf_data" not in payload:
                self._send_error(400, "Missing 'pdf_data' in payload")
                return

            # Prepare downstream request
            downstream_payload = {
                "pdf_data": payload.get("pdf_data"),
                "bank": (payload.get("bank") or "").lower(),
            }
            downstream_req = {"body": json.dumps(downstream_payload)}

            # Load and call the specific handler
            pdf_module = _load_module_from_path("parser_pdf_active", PDF_HANDLER_PATH)
            response = pdf_module.handler(downstream_req)
            
            # Forward the response from the module
            status_code = response.get("statusCode", 200)
            headers = response.get("headers", {"Content-Type": "application/json"})
            body = response.get("body", "{}")

            self.send_response(status_code)
            for key, value in headers.items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(body.encode('utf-8'))

        except Exception as e:
            import traceback
            traceback.print_exc(file=sys.stderr)
            self._send_error(500, f"Unified parser failed: {str(e)}")

    def _send_error(self, status_code, message):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode('utf-8'))

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "Parser service is running"}).encode('utf-8'))
