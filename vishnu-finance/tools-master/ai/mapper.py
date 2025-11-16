from __future__ import annotations
from typing import Dict, Any
import os

def is_ai_enabled() -> bool:
	return bool(os.environ.get("OPENAI_API_KEY") or os.environ.get("AZURE_OPENAI_API_KEY"))

def infer_column_mapping(sample_rows: list[dict[str, Any]], bank_code: str) -> dict[str, str]:
	"""
	Stub that would ask an LLM to map columns to {date, date_iso, description, debit, credit, balance}.
	For now, apply simple heuristics on keys.
	"""
	keys = set()
	for r in sample_rows[:5]:
		keys.update(r.keys())
	keys_lower = {k.lower(): k for k in keys}

	def pick(*candidates: str) -> str | None:
		for c in candidates:
			if c in keys_lower:
				return keys_lower[c]
		return None

	return {
		"date": pick("date", "txn_date", "value_date"),
		"date_iso": pick("date_iso"),
		"description": pick("description", "narration", "details"),
		"debit": pick("debit", "withdrawal", "dr_amount", "amount_debited"),
		"credit": pick("credit", "deposit", "cr_amount", "amount_credited"),
		"balance": pick("balance", "closing_balance"),
	}


