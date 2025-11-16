import base64
import json
import os
import sys
import traceback
from pathlib import Path
from datetime import datetime

# Ensure shared tools are importable
ROOT = Path(__file__).resolve().parents[2]  # .../vishnu-finance
TOOLS_DIR = ROOT / "tools"
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

# Prefer package-style imports so static analyzers (pyright) can resolve them
try:
    from tools.bank_statement_parser import parse_bank_statement as tools_parse_bank_statement  # type: ignore
except Exception:
    tools_parse_bank_statement = None  # type: ignore

try:
    from tools.accurate_parser import parse_bank_statement_accurately as tools_parse_bank_statement_accurately  # type: ignore
except Exception:
    tools_parse_bank_statement_accurately = None  # type: ignore

try:
    from tools.multi_format_parser import parse_file as tools_parse_file  # type: ignore
except Exception:
    tools_parse_file = None  # type: ignore

def _json_response(body: dict, status: int = 200):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }

def _now_iso():
    return datetime.utcnow().isoformat() + "Z"

def _append_log(logs: list, message: str, **kwargs):
    entry = {"t": _now_iso(), "message": message}
    entry.update({k: v for k, v in kwargs.items() if v is not None})
    logs.append(entry)

def _decode_base64_to_tempfile(data_b64: str, suffix: str) -> Path:
    raw = base64.b64decode(data_b64)
    tmp_dir = Path(os.getenv("TMPDIR") or "/tmp")
    tmp_dir.mkdir(parents=True, exist_ok=True)
    fp = tmp_dir / f"upload_{os.getpid()}_{id(raw)}{suffix}"
    with open(fp, "wb") as f:
        f.write(raw)
    return fp

def _parse_pdf(file_path: Path, bank_hint: str | None):
    # Try bank-specific first (tools/bank_statement_parser)
    try:
        parser = tools_parse_bank_statement
        if parser is None:
            raise RuntimeError("tools.bank_statement_parser not available")
        result = parser(file_path, bank_hint if bank_hint else None)
        if isinstance(result, tuple):
            df, metadata = result
        else:
            df, metadata = result, {}
        return df, (metadata or {})
    except Exception:
        df, metadata = None, {}

    # Fallback: accurate parser (tools/accurate_parser)
    try:
        accurate = tools_parse_bank_statement_accurately
        if accurate is None:
            raise RuntimeError("tools.accurate_parser not available")
        df2 = accurate(file_path)
        return df2, metadata or {}
    except Exception:
        return None, {}

def _parse_non_pdf(file_path: Path):
    # Use tools/multi_format_parser.py
    try:
        parser = tools_parse_file
        if parser is None:
            raise RuntimeError("tools.multi_format_parser not available")
        df = parser(file_path)
        return df
    except Exception:
        return None

def _df_to_result(df, metadata: dict | None = None, bank_type: str | None = None):
    if df is None:
        return {"success": True, "transactions": [], "count": 0, "metadata": metadata or {}, "bankType": bank_type or "UNKNOWN"}

    try:
        # Prefer strict date_iso if present
        import pandas as pd
        if "date_iso" in df.columns and not df["date_iso"].isna().all():
            pass
        elif "date" in df.columns:
            # Best-effort normalization
            df["date_iso"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime("%Y-%m-%d")

        # Filter invalid
        if "date_iso" in df.columns:
            df = df[df["date_iso"].notna()].copy()

        # Ensure JSON-serializable
        for col in df.columns:
            try:
                if hasattr(df[col], "dt"):
                    df[col] = df[col].dt.strftime("%Y-%m-%d")
            except Exception:
                pass

        transactions = json.loads(df.to_json(orient="records"))
        result = {
            "success": True,
            "transactions": transactions,
            "count": int(len(transactions)),
        }
        if metadata is not None:
            result["metadata"] = metadata
        if bank_type is not None:
            result["bankType"] = bank_type
        return result
    except Exception:
        return {"success": True, "transactions": [], "count": 0, "metadata": metadata or {}, "bankType": bank_type or "UNKNOWN"}

def handler(event, context=None):
    try:
        logs: list = []
        body_raw = event.get("body", "")
        if event.get("isBase64Encoded"):
            body_raw = base64.b64decode(body_raw).decode("utf-8")
        data = json.loads(body_raw or "{}")

        # Inputs
        mode = (data.get("mode") or "auto").lower()  # auto|pdf|file|bank
        bank = (data.get("bank") or data.get("bankType") or "").strip().upper() or None
        request_id = data.get("requestId")

        # The uploaded file can be provided in either `file_data` or `pdf_data`
        file_data_b64 = data.get("file_data") or data.get("pdf_data")
        file_type = (data.get("file_type") or "").lower()  # e.g., ".pdf", ".xlsx"

        if not file_data_b64:
            return _json_response({"error": "file_data (base64) is required", "debug": {"logs": logs}}, 400)

        # Infer type if not provided
        suffix = file_type if file_type in [".pdf", ".xls", ".xlsx", ".doc", ".docx", ".txt"] else ""
        if not suffix and mode == "pdf":
            suffix = ".pdf"
        if not suffix:
            # default to .pdf for safety if not specified
            suffix = ".pdf"

        fp = _decode_base64_to_tempfile(file_data_b64, suffix)

        try:
            if suffix == ".pdf" or mode == "pdf" or mode == "bank":
                df, metadata = _parse_pdf(fp, bank)
                # Extract bank from df if present
                bank_type = None
                try:
                    if df is not None and "bankCode" in df.columns and not df["bankCode"].isna().all():
                        bank_type = str(df["bankCode"].iloc[0])
                except Exception:
                    pass
                result = _df_to_result(df, metadata or {}, bank_type or bank or "UNKNOWN")
                return _json_response(result, 200)
            else:
                df = _parse_non_pdf(fp)
                result = _df_to_result(df)
                return _json_response(result, 200)
        finally:
            try:
                fp.unlink(missing_ok=True)
            except Exception:
                pass

    except Exception as e:
        return _json_response({"error": str(e)}, 500)

# Vercel Python entrypoint
def main(request):
    try:
        if request.method != "POST":
            return _json_response({"error": "Method not allowed"}, 405)
        event = {
            "body": request.get_data(as_text=True),
            "isBase64Encoded": False,
        }
        resp = handler(event, None)
        from flask import Response
        return Response(resp["body"], status=resp["statusCode"], mimetype=resp["headers"]["Content-Type"])
    except Exception as e:
        from flask import Response
        return Response(json.dumps({"error": str(e)}), status=500, mimetype="application/json")


