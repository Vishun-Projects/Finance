from pathlib import Path
from typing import Tuple

def _read_head_text(pdf_path: Path, max_chars: int = 4000) -> str:
	try:
		# Simple best-effort: rely on legacy text extraction if available later.
		# Here we just return filename as placeholder for AI stub.
		return pdf_path.name
	except Exception:
		return pdf_path.name

def detect_bank(pdf_path: Path, bank_hint: str) -> Tuple[str, float, str]:
	"""
	Heuristic bank detection. Uses hint if provided, else tries lightweight detection.
	Returns (bank_code, confidence, reason).
	"""
	if bank_hint:
		return bank_hint.upper(), 0.7, "hint"

	# Minimal heuristic placeholder; real logic can OCR/read first page, IFSC, headers.
	# Keep generic to avoid heavy deps here.
	try:
		name = pdf_path.name.lower()
		for code, token in [
			("SBIN", "sbi"),
			("HDFC", "hdfc"),
			("ICIC", "icici"),
			("AXIS", "axis"),
			("KKBK", "kotak"),
			("MAHB", "maharashtra"),
			("IDIB", "indian bank"),
		]:
			if token in name:
				return code, 0.8, f"filename:{token}"
	except Exception:
		pass

	# Try AI classifier if configured
	try:
		from .ai.classifier import classify_bank_via_ai, is_ai_enabled  # type: ignore
		if is_ai_enabled():
			text = _read_head_text(pdf_path)
			code, conf, reason = classify_bank_via_ai(text)
			if conf >= 0.6:
				return code, conf, reason
	except Exception:
		pass

	return "UNKNOWN", 0.1, "fallback"


