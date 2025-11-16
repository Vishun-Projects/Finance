"""
Unified Vercel Python Serverless Function for Parsing
Dispatches to existing Python handlers based on `type`:
- pdf → api/parse-pdf-python/index.py
- file → api/parse-file-python/index.py
- bank-statement → api/parse-bank-statement-python/index.py
"""
import json
import sys
from pathlib import Path
import importlib.util
from typing import Any, Dict


ROOT_DIR = Path(__file__).resolve().parents[1]
PDF_HANDLER_PATH = ROOT_DIR / "parse-pdf-python" / "index.py"
FILE_HANDLER_PATH = ROOT_DIR / "parse-file-python" / "index.py"
BANK_HANDLER_PATH = ROOT_DIR / "parse-bank-statement-python" / "index.py"


def _load_module_from_path(module_name: str, path: Path):
    spec = importlib.util.spec_from_file_location(module_name, str(path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load spec for {module_name} from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[attr-defined]
    return module


def _parse_body(request: Any) -> Dict[str, Any]:
    if isinstance(request, dict):
        body_raw = request.get("body", "{}")
        return json.loads(body_raw) if isinstance(body_raw, str) else (body_raw or {})
    if hasattr(request, "json"):
        try:
            return request.json() or {}
        except Exception:
            pass
    if hasattr(request, "body"):
        try:
            if isinstance(request.body, str):
                return json.loads(request.body)
            return request.body or {}
        except Exception:
            return {}
    return {}


def _make_downstream_request_body(payload: Dict[str, Any]) -> Dict[str, Any]:
    # The downstream handlers expect a request-like dict with a 'body' string
    return {"body": json.dumps(payload, ensure_ascii=False, default=str)}


def handler(request):
    """
    Entry point for Vercel Python function: POST with JSON
    {
      "type": "pdf" | "file" | "bank-statement",
      "payload": { ... }  # see per-type mapping below
    }
    """
    try:
        incoming = _parse_body(request)
        req_type = (incoming.get("type") or "").strip().lower()
        payload = incoming.get("payload") or {}

        if req_type not in {"pdf", "file", "bank-statement"}:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Invalid type. Expected 'pdf' | 'file' | 'bank-statement'."}),
            }

        # Map unified contract → legacy handler payloads
        if req_type == "pdf":
            # Expecting: payload = { pdf_data, bank? }
            if "pdf_data" not in payload:
                return {
                    "statusCode": 400,
                    "headers": {"Content-Type": "application/json"},
                    "body": json.dumps({"error": "Missing 'pdf_data' in payload"}),
                }
            downstream_payload = {
                "pdf_data": payload.get("pdf_data"),
                "bank": (payload.get("bank") or "").lower(),
            }
            pdf_module = _load_module_from_path("parser_pdf_index", PDF_HANDLER_PATH)
            downstream_req = _make_downstream_request_body(downstream_payload)
            return pdf_module.handler(downstream_req)  # type: ignore[attr-defined]

        if req_type == "file":
            # Expecting: payload = { file_data, file_type }
            if "file_data" not in payload or "file_type" not in payload:
                return {
                    "statusCode": 400,
                    "headers": {"Content-Type": "application/json"},
                    "body": json.dumps({"error": "Missing 'file_data' or 'file_type' in payload"}),
                }
            downstream_payload = {
                "file_data": payload.get("file_data"),
                "file_type": payload.get("file_type"),
            }
            file_module = _load_module_from_path("parser_file_index", FILE_HANDLER_PATH)
            downstream_req = _make_downstream_request_body(downstream_payload)
            return file_module.handler(downstream_req)  # type: ignore[attr-defined]

        # bank-statement
        # Expecting: payload = { file_data, file_type, bankType? }
        if "file_data" not in payload or "file_type" not in payload:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Missing 'file_data' or 'file_type' in payload"}),
            }
        downstream_payload = {
            "file_data": payload.get("file_data"),
            "file_type": payload.get("file_type"),
            "bankType": payload.get("bankType") or "",
        }
        bank_module = _load_module_from_path("parser_bank_index", BANK_HANDLER_PATH)
        downstream_req = _make_downstream_request_body(downstream_payload)
        return bank_module.handler(downstream_req)  # type: ignore[attr-defined]

    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Unified parser failed", "details": str(e)}),
        }


