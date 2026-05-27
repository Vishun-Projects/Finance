import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import pdfplumber

from ..models import FinalTransaction
from ..validator import ValidatorShim
from ..normalization import NormalizationShim
from ..inference import InferenceEngineShim

logger = logging.getLogger(__name__)

DATE_RE = re.compile(
    r"(\d{1,2}[\s\/\-\.](?:\d{1,2}|[A-Z]{3,10})[\s\/\-\.]\d{2,4})",
    re.IGNORECASE,
)
AMOUNT_RE = re.compile(r"(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\.\d+)")


class TableFallbackParser:
    """Fallback using pdfplumber table extraction when spatial pipeline fails."""

    HEADER_MAP = {
        "date": ["DATE", "TXN DATE", "TRAN DATE", "VALUE DATE", "TRANSACTION DATE"],
        "description": ["NARRATION", "DESCRIPTION", "DETAILS", "PARTICULARS", "REMARKS"],
        "debit": ["DEBIT", "WITHDRAWAL", "DR", "DEBITS"],
        "credit": ["CREDIT", "DEPOSIT", "CR", "CREDITS"],
        "balance": ["BALANCE", "CLOSING BALANCE", "RUNNING BALANCE"],
    }

    NOISE_PATTERNS = [
        r"(?i)closing\s*balance\s*includes",
        r"(?i)contents\s*of\s*this\s*statement",
        r"(?i)registered\s*office",
        r"(?i)end\s+of\s+statement",
        r"(?i)statement\s*summary",
    ]

    def parse(
        self,
        file_path: str,
        password: Optional[str] = None,
        bank_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        transactions: List[FinalTransaction] = []
        metadata: Dict[str, Any] = {}

        try:
            with pdfplumber.open(file_path, password=password or None) as pdf:
                prev_balance: Optional[float] = None
                inference = InferenceEngineShim()

                for page_num, page in enumerate(pdf.pages):
                    tables = page.extract_tables() or []
                    for table in tables:
                        if not table or len(table) < 2:
                            continue

                        col_map = self._detect_columns(table[0])
                        if not col_map.get("date"):
                            continue

                        for row in table[1:]:
                            txn = self._parse_row(row, col_map, bank_code, prev_balance, inference)
                            if txn:
                                if self._is_noise(txn.description):
                                    continue
                                transactions.append(txn)
                                if txn.balance is not None:
                                    prev_balance = txn.balance

                if not transactions:
                    text_txns = self._parse_text_pages(pdf, bank_code)
                    transactions.extend(text_txns)

                if not transactions:
                    legacy_df = self._try_legacy_parser(file_path, bank_code)
                    if legacy_df is not None and not legacy_df.empty:
                        return self._from_legacy_dataframe(legacy_df, bank_code)

        except Exception as exc:
            logger.warning("Table fallback failed: %s", exc)
            return {"status": "failed", "error": str(exc), "transactions": [], "metadata": {}}

        if not transactions:
            return {"status": "success", "transactions": [], "metadata": {"parserMethod": "table_fallback"}}

        normalizer = NormalizationShim()
        ctx_like = type("Ctx", (), {"bank_code": bank_code, "account_holder_name": None, "metadata": metadata})()
        transactions = normalizer.normalize_transactions(ctx_like, transactions)

        validation = ValidatorShim().validate(transactions)
        metadata["validation"] = validation
        metadata["parserMethod"] = "table_fallback"

        return {
            "status": "success",
            "transactions": self._serialize(transactions),
            "metadata": metadata,
            "bank": bank_code or "Unknown",
        }

    def _detect_columns(self, header_row: List[Any]) -> Dict[str, int]:
        mapping: Dict[str, int] = {}
        for idx, cell in enumerate(header_row):
            if cell is None:
                continue
            upper = str(cell).upper().strip()
            for role, keywords in self.HEADER_MAP.items():
                if role in mapping:
                    continue
                if any(k in upper for k in keywords):
                    mapping[role] = idx
        return mapping

    def _parse_row(
        self,
        row: List[Any],
        col_map: Dict[str, int],
        bank_code: Optional[str],
        prev_balance: Optional[float],
        inference: InferenceEngineShim,
    ) -> Optional[FinalTransaction]:
        def cell(role: str) -> str:
            idx = col_map.get(role)
            if idx is None or idx >= len(row) or row[idx] is None:
                return ""
            return str(row[idx]).strip()

        date_raw = cell("date")
        if not date_raw or not DATE_RE.search(date_raw):
            return None

        desc = cell("description") or date_raw
        debit = self._to_float(cell("debit"))
        credit = self._to_float(cell("credit"))
        balance = self._to_float(cell("balance"))

        iso_date = inference._normalize_date(date_raw)
        inferred_debit = debit or 0.0
        inferred_credit = credit or 0.0

        if prev_balance is not None and balance is not None:
            delta = round(balance - prev_balance, 2)
            if delta > 0.009:
                inferred_credit = delta
                inferred_debit = 0.0
            elif delta < -0.009:
                inferred_debit = abs(delta)
                inferred_credit = 0.0

        if inferred_debit == 0 and inferred_credit == 0:
            return None

        return FinalTransaction(
            date=date_raw,
            date_iso=iso_date,
            description=desc,
            debit=inferred_debit,
            credit=inferred_credit,
            balance=balance if balance is not None else (prev_balance or 0.0),
            confidence=0.75,
            bankCode=bank_code,
            reasons=["table_fallback"],
        )

    def _try_legacy_parser(self, file_path: str, bank_code: Optional[str]):
        try:
            from .legacy_adapter import parse_with_legacy_bank_parser
            return parse_with_legacy_bank_parser(file_path, bank_code)
        except Exception as exc:
            logger.warning("Legacy parser fallback unavailable: %s", exc)
            return None

    def _from_legacy_dataframe(self, df, bank_code: Optional[str]) -> Dict[str, Any]:
        inference = InferenceEngineShim()
        transactions: List[FinalTransaction] = []
        for _, row in df.iterrows():
            date_raw = str(row.get("date") or row.get("date_iso") or "").strip()
            if not date_raw:
                continue
            debit = float(row.get("debit") or 0)
            credit = float(row.get("credit") or 0)
            if debit == 0 and credit == 0:
                continue
            desc = str(row.get("description") or row.get("narration") or "").strip()
            balance = row.get("balance")
            balance_val = float(balance) if balance is not None and str(balance) != "nan" else None
            transactions.append(
                FinalTransaction(
                    date=date_raw,
                    date_iso=inference._normalize_date(date_raw) or str(row.get("date_iso") or "")[:10] or None,
                    description=desc,
                    debit=debit,
                    credit=credit,
                    balance=balance_val or 0.0,
                    confidence=0.8,
                    bankCode=bank_code,
                    reasons=["legacy_bank_parser"],
                )
            )

        normalizer = NormalizationShim()
        ctx_like = type("Ctx", (), {"bank_code": bank_code, "account_holder_name": None, "metadata": {}})()
        transactions = normalizer.normalize_transactions(ctx_like, transactions)
        validation = ValidatorShim().validate(transactions)
        metadata = {"validation": validation, "parserMethod": "legacy_bank_parser"}
        return {
            "status": "success",
            "transactions": self._serialize(transactions),
            "metadata": metadata,
            "bank": bank_code or "Unknown",
        }

    def _parse_text_pages(self, pdf, bank_code: Optional[str]) -> List[FinalTransaction]:
        results: List[FinalTransaction] = []
        inference = InferenceEngineShim()
        prev_balance: Optional[float] = None

        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.splitlines():
                line = line.strip()
                if not line or self._is_noise(line):
                    continue
                date_match = DATE_RE.search(line)
                if not date_match:
                    continue
                amounts = [self._to_float(m.group(0)) for m in AMOUNT_RE.finditer(line)]
                amounts = [a for a in amounts if a is not None]
                if len(amounts) < 2:
                    continue
                balance = amounts[-1]
                amount = amounts[-2]
                date_raw = date_match.group(1)
                iso_date = inference._normalize_date(date_raw)
                inferred_debit = 0.0
                inferred_credit = 0.0
                if prev_balance is not None and balance is not None:
                    delta = round(balance - prev_balance, 2)
                    if delta > 0.009:
                        inferred_credit = delta
                    elif delta < -0.009:
                        inferred_debit = abs(delta)
                else:
                    inferred_debit = amount or 0.0

                if inferred_debit == 0 and inferred_credit == 0:
                    continue

                txn = FinalTransaction(
                    date=date_raw,
                    date_iso=iso_date,
                    description=line,
                    debit=inferred_debit,
                    credit=inferred_credit,
                    balance=balance or 0.0,
                    confidence=0.65,
                    bankCode=bank_code,
                    reasons=["table_text_fallback"],
                )
                results.append(txn)
                prev_balance = balance

        return results

    def _to_float(self, value: str) -> Optional[float]:
        if not value:
            return None
        try:
            cleaned = value.replace(",", "").replace("₹", "").strip()
            if cleaned in ("", "-", "—"):
                return None
            return float(cleaned)
        except ValueError:
            return None

    def _is_noise(self, text: str) -> bool:
        if not text:
            return True
        return any(re.search(p, text) for p in self.NOISE_PATTERNS)

    def _serialize(self, transactions: List[FinalTransaction]) -> List[Dict[str, Any]]:
        rows = []
        for t in transactions:
            rows.append(
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
            )
        return rows
