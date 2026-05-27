import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

import pdfplumber
import requests

from ..models import FinalTransaction
from ..validator import ValidatorShim
from ..normalization import NormalizationShim
from ..inference import InferenceEngineShim

logger = logging.getLogger(__name__)


class GeminiFallbackParser:
    """Last-resort structured extraction using Gemini from PDF/OCR text."""

    def parse(
        self,
        file_path: str,
        password: Optional[str] = None,
        bank_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return {"status": "failed", "error": "GOOGLE_API_KEY not configured", "transactions": []}

        text = self._extract_text(file_path, password)
        if not text or len(text.strip()) < 50:
            return {"status": "failed", "error": "Insufficient text for Gemini extraction", "transactions": []}

        prompt = f"""Extract ALL bank transactions from this Indian bank statement text.
Return ONLY a JSON array. Each item must have:
date (DD/MM/YYYY or ISO), description, debit (number or 0), credit (number or 0), balance (number if available).

Bank hint: {bank_code or "unknown"}

Statement text:
{text[:120000]}
"""

        try:
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"gemini-2.0-flash-exp:generateContent?key={api_key}"
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 8192,
                },
            }
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            body = response.json()
            raw = body["candidates"][0]["content"]["parts"][0]["text"]
            match = re.search(r"\[[\s\S]*\]", raw)
            if not match:
                return {"status": "failed", "error": "Gemini returned no JSON array", "transactions": []}
            rows = json.loads(match.group(0))
        except Exception as exc:
            logger.warning("Gemini fallback failed: %s", exc)
            return {"status": "failed", "error": str(exc), "transactions": []}

        inference = InferenceEngineShim()
        transactions: List[FinalTransaction] = []
        prev_balance: Optional[float] = None

        for row in rows:
            if not isinstance(row, dict):
                continue
            date_raw = str(row.get("date") or "").strip()
            desc = str(row.get("description") or "").strip()
            debit = float(row.get("debit") or 0)
            credit = float(row.get("credit") or 0)
            balance_val = row.get("balance")
            balance = float(balance_val) if balance_val is not None else None

            if not date_raw or (debit == 0 and credit == 0):
                continue

            iso_date = inference._normalize_date(date_raw)
            if prev_balance is not None and balance is not None:
                delta = round(balance - prev_balance, 2)
                if delta > 0.009:
                    credit = delta
                    debit = 0.0
                elif delta < -0.009:
                    debit = abs(delta)
                    credit = 0.0

            txn = FinalTransaction(
                date=date_raw,
                date_iso=iso_date,
                description=desc,
                debit=debit,
                credit=credit,
                balance=balance if balance is not None else (prev_balance or 0.0),
                confidence=0.7,
                bankCode=bank_code,
                reasons=["gemini_fallback"],
            )
            transactions.append(txn)
            if balance is not None:
                prev_balance = balance

        if not transactions:
            return {"status": "success", "transactions": [], "metadata": {"parserMethod": "gemini_fallback"}}

        normalizer = NormalizationShim()
        ctx_like = type("Ctx", (), {"bank_code": bank_code, "account_holder_name": None, "metadata": {}})()
        transactions = normalizer.normalize_transactions(ctx_like, transactions)
        validation = ValidatorShim().validate(transactions)

        if not validation.get("reconciled") and validation.get("mismatch_count", 0) > 3:
            return {
                "status": "failed",
                "error": "Gemini extraction failed reconciliation",
                "transactions": [],
                "metadata": {"validation": validation, "parserMethod": "gemini_fallback"},
            }

        return {
            "status": "success",
            "transactions": [
                {
                    "date": t.date,
                    "date_iso": t.date_iso,
                    "description": t.description,
                    "debit": t.debit,
                    "credit": t.credit,
                    "balance": t.balance,
                    "confidence": t.confidence,
                    "bankCode": t.bankCode,
                    "store": t.store,
                    "personName": t.personName,
                    "commodity": t.commodity,
                    "upiId": t.upiId,
                    "reasons": t.reasons,
                }
                for t in transactions
            ],
            "metadata": {"validation": validation, "parserMethod": "gemini_fallback"},
            "bank": bank_code or "Unknown",
        }

    def _extract_text(self, file_path: str, password: Optional[str]) -> str:
        chunks: List[str] = []
        try:
            with pdfplumber.open(file_path, password=password or None) as pdf:
                for page in pdf.pages:
                    chunks.append(page.extract_text() or "")
        except Exception:
            pass

        text = "\n".join(chunks).strip()
        if text:
            return text

        try:
            import pdf2image
            import pytesseract

            images = pdf2image.convert_from_path(file_path, dpi=150, userpw=password or None)
            ocr_chunks = [pytesseract.image_to_string(img) for img in images]
            return "\n".join(ocr_chunks)
        except Exception:
            return text
