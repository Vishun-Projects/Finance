from __future__ import annotations
from typing import Optional
import pandas as pd

def normalize_date_strict(date_val: str, dayfirst: bool = True) -> Optional[str]:
	try:
		if pd.isna(date_val):
			return None
	except Exception:
		pass
	try:
		parsed = pd.to_datetime(str(date_val).strip(), dayfirst=dayfirst, errors='coerce')
		if pd.notna(parsed):
			return parsed.strftime('%Y-%m-%d')
		return None
	except Exception:
		return None


