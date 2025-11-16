from pathlib import Path
from typing import Any, Dict, List, Tuple

class BaseExtractor:
	def extract(self, pdf_path: Path, bank_code: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any], Dict[str, Any]]:
		raise NotImplementedError


