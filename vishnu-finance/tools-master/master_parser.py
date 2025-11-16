import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import re
from datetime import datetime

# Robust imports to work when loaded as top-level module or package
try:
	from .bank_registry import detect_bank  # type: ignore
except Exception:
	try:
		from tools_master.bank_registry import detect_bank  # type: ignore
	except Exception:
		from bank_registry import detect_bank  # type: ignore

try:
	from .extractors.generic import GenericExtractor  # type: ignore
except Exception:
	try:
		from tools_master.extractors.generic import GenericExtractor  # type: ignore
	except Exception:
		from extractors.generic import GenericExtractor  # type: ignore

try:
	from .schemas import ParseResult  # type: ignore
except Exception:
	try:
		from tools_master.schemas import ParseResult  # type: ignore
	except Exception:
		from schemas import ParseResult  # type: ignore


def parse(pdf_path: Path, bank_hint: Optional[str] = None) -> ParseResult:
	"""
	Master entrypoint. Given a PDF path, detect bank, run the unified parser,
	and return normalized transactions, metadata and debug info.
	"""
	pdf_path = Path(pdf_path)
	if not pdf_path.exists():
		return {
			"success": True,
			"transactions": [],
			"count": 0,
			"metadata": {},
			"debug": {"error": f"PDF not found: {str(pdf_path)}"},
		}

	detected_code, confidence, reason = detect_bank(pdf_path, bank_hint or "")

	extractor = GenericExtractor()
	transactions, metadata, debug_parts = extractor.extract(pdf_path, detected_code)

	# Derive missing metadata (accountNumber, IFSC, opening/closing balance, totals)
	metadata = _derive_metadata(transactions, metadata or {}, detected_code)

	debug: Dict[str, Any] = {
		"method": debug_parts.get("method", "generic"),
		"detector": {"bank": detected_code, "confidence": confidence, "reason": reason},
		"codeFiles": debug_parts.get(
			"codeFiles",
			[
				"tools-master/extractors/generic.py",
				"tools/accurate_parser.py",
				"tools/bank_statement_parser.py",
			],
		),
		"explanation": debug_parts.get(
			"explanation",
			"Parsed via unified GenericExtractor with bank-aware rules and legacy fallbacks.",
		),
	}
	if "stdoutSnippet" in debug_parts:
		debug["stdoutSnippet"] = debug_parts["stdoutSnippet"]
	if "stderrSnippet" in debug_parts:
		debug["stderrSnippet"] = debug_parts["stderrSnippet"]

	return {
		"success": True,
		"transactions": transactions,
		"count": len(transactions),
		"metadata": metadata or {},
		"debug": debug,
	}

def _derive_metadata(transactions: List[Dict[str, Any]], meta: Dict[str, Any], bank_code: Optional[str]) -> Dict[str, Any]:
	"""
	Augment metadata if missing:
	- accountNumber: try from tx['accountNumber'] or regex in text fields
	- ifsc: regex [A-Z]{4}0[A-Z0-9]{6}
	- openingBalance / closingBalance: from first/last tx with 'balance'
	- totals, transactionCount, bankCode
	"""
	if not isinstance(meta, dict):
		meta = {}

	# Account number from transactions or text
	if not meta.get("accountNumber"):
		candidates: Dict[str, int] = {}
		for t in transactions:
			for key in ("accountNumber", "acctNo", "account_no"):
				val = t.get(key)
				if isinstance(val, str) and val.strip():
					normalized = re.sub(r"\D", "", val)
					if 9 <= len(normalized) <= 18:
						candidates[normalized] = candidates.get(normalized, 0) + 1
			# scan text fields
			for key in ("raw", "rawData", "description", "narration", "reference"):
				s = t.get(key)
				if not isinstance(s, str):
					continue
				for m in re.finditer(r"\b(\d{9,18})\b", s):
					num = m.group(1)
					candidates[num] = candidates.get(num, 0) + 1
		if candidates:
			# pick most frequent, tie-break by length descending
			best = max(candidates.items(), key=lambda kv: (kv[1], len(kv[0])))
			meta.setdefault("accountNumber", best[0])

	# IFSC code from text
	if not meta.get("ifsc"):
		ifsc_counts: Dict[str, int] = {}
		pat = re.compile(r"\b([A-Z]{4}0[0-9A-Z]{6})\b")
		for t in transactions:
			for key in ("raw", "rawData", "description", "narration", "reference"):
				s = t.get(key)
				if not isinstance(s, str):
					continue
				for m in pat.finditer(s):
					code = m.group(1)
					ifsc_counts[code] = int(ifsc_counts.get(code, 0)) + 1
		if ifsc_counts:
			best_ifsc = max(ifsc_counts.items(), key=lambda kv: kv[1])[0]
			meta.setdefault("ifsc", best_ifsc)

	# Totals and opening/closing balances
	total_debits = 0.0
	total_credits = 0.0
	txs_with_balance: List[Tuple[datetime, float, float, float]] = []  # (date, debit, credit, balance)

	for t in transactions:
		d = _to_float(t.get("debit") or t.get("debitAmount"))
		c = _to_float(t.get("credit") or t.get("creditAmount"))
		if d:
			total_debits += d
		if c:
			total_credits += c
		bal = _to_float(t.get("balance"))
		date = _to_date(t.get("date_iso") or t.get("date"))
		if bal is not None and date is not None:
			txs_with_balance.append((date, d or 0.0, c or 0.0, bal))

	if "totalDebits" not in meta:
		meta["totalDebits"] = round(total_debits, 2)
	if "totalCredits" not in meta:
		meta["totalCredits"] = round(total_credits, 2)
	if "transactionCount" not in meta:
		meta["transactionCount"] = len(transactions)
	if bank_code and "bankCode" not in meta:
		meta["bankCode"] = bank_code

	# Derive opening/closing from balances if missing
	if txs_with_balance:
		txs_with_balance.sort(key=lambda x: x[0])
		first_date, first_debit, first_credit, first_balance = txs_with_balance[0]
		last_date, last_debit, last_credit, last_balance = txs_with_balance[-1]
		if meta.get("openingBalance") in (None, "", 0):
		 # assume balance is post-transaction; opening = first_balance - (credit - debit)
			opening = first_balance - (first_credit - first_debit)
			meta["openingBalance"] = round(opening, 2)
		if meta.get("closingBalance") in (None, "", 0):
			meta["closingBalance"] = round(last_balance, 2)
		# statement period if missing
		if not meta.get("statementStartDate"):
			meta["statementStartDate"] = first_date.strftime("%Y-%m-%d")
		if not meta.get("statementEndDate"):
			meta["statementEndDate"] = last_date.strftime("%Y-%m-%d")

	return meta

def _to_float(v: Any) -> Optional[float]:
	try:
		if v is None or v == "":
			return None
		if isinstance(v, (int, float)):
			return float(v)
		# strip commas and currency symbols
		s = str(v).replace(",", "").strip()
		return float(s)
	except Exception:
		return None

def _to_date(v: Any) -> Optional[datetime]:
	if not v:
		return None
	if isinstance(v, datetime):
		return v
	s = str(v)
	for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d %b %Y", "%d %b, %Y", "%d %b %y"):
		try:
			return datetime.strptime(s, fmt)
		except Exception:
			continue
	# try pandas if available
	try:
		import pandas as pd  # type: import-error
		d = pd.to_datetime(s, errors="coerce", dayfirst=True)
		if pd.notnull(d):
			# convert to python datetime
			return d.to_pydatetime()
	except Exception:
		pass
	return None


