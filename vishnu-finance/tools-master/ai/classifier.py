from __future__ import annotations
import os
from typing import Tuple

def is_ai_enabled() -> bool:
	api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AZURE_OPENAI_API_KEY")
	return bool(api_key)

def classify_bank_via_ai(sample_text: str) -> Tuple[str, float, str]:
	"""
	Return (bank_code, confidence, reason). Minimal stub that only runs when API key present.
	Implement your preferred LLM provider behind env flags.
	"""
	if not is_ai_enabled():
		return ("UNKNOWN", 0.0, "ai_disabled")

	# Placeholder: in real impl call your model with a strict system prompt.
	# For now, do a trivial heuristic on text to avoid blocking.
	upper = sample_text.upper()
	for code, token in [("SBIN", "STATE BANK OF INDIA"), ("HDFC", "HDFC"), ("ICIC", "ICICI"), ("AXIS", "AXIS BANK"),
	                    ("KKBK", "KOTAK"), ("MAHB", "BANK OF MAHARASHTRA"), ("IDIB", "INDIAN BANK")]:
		if token in upper:
			return (code, 0.9, f"ai_heuristic:{token}")
	return ("UNKNOWN", 0.3, "ai_uncertain")


