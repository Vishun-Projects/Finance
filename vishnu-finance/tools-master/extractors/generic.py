from __future__ import annotations
from pathlib import Path
from typing import Any, Dict, List, Tuple
import sys
import importlib

from .base import BaseExtractor

class GenericExtractor(BaseExtractor):
	def extract(self, pdf_path: Path, bank_code: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any], Dict[str, Any]]:
		"""
		In-process reuse of legacy parsers (no subprocess). Supports both legacy/tools and tools paths.
		"""
		# Prefer legacy/tools; fallback to tools
		cwd = Path.cwd()
		legacy_tools = cwd / "legacy" / "tools"
		tools = cwd / "tools"
		added_paths = []
		for p in [legacy_tools, tools]:
			if p.exists():
				sp = str(p)
				if sp not in sys.path:
					sys.path.insert(0, sp)
					added_paths.append(sp)
		try:
			transactions: List[Dict[str, Any]] = []
			metadata: Dict[str, Any] = {}

			# Import legacy modules
			parse_bank_statement = None
			parse_bank_statement_accurately = None
			StatementMetadataExtractor = None

			try:
				parse_bank_statement = importlib.import_module("bank_statement_parser").parse_bank_statement  # type: ignore
			except Exception:
				pass
			try:
				parse_bank_statement_accurately = importlib.import_module("accurate_parser").parse_bank_statement_accurately  # type: ignore
			except Exception:
				pass
			try:
				try:
					StatementMetadataExtractor = importlib.import_module("parsers.statement_metadata").StatementMetadataExtractor  # type: ignore
				except Exception:
					StatementMetadataExtractor = importlib.import_module("statement_metadata").StatementMetadataExtractor  # type: ignore
			except Exception:
				StatementMetadataExtractor = None  # type: ignore

			df = None
			if bank_code and bank_code != "UNKNOWN" and parse_bank_statement:
				try:
					res = parse_bank_statement(str(pdf_path), bank_code)
					if isinstance(res, tuple):
						df, metadata = res
					else:
						df = res
				except Exception:
					df = None

			if (df is None or (hasattr(df, "empty") and df.empty)) and parse_bank_statement_accurately:
				try:
					tmp = parse_bank_statement_accurately(str(pdf_path))
					if tmp is not None and not tmp.empty:
						df = tmp
				except Exception:
					pass

			if metadata is None:
				metadata = {}

			if df is not None and hasattr(df, "to_dict"):
				# Normalize dates: if date_iso missing, derive from date
				try:
					import pandas as pd  # type: ignore
					# Optional AI-guided column mapping to stabilize odd tables
					try:
						from tools_master.ai.mapper import is_ai_enabled as mapper_enabled, infer_column_mapping  # type: ignore
					except Exception:
						mapper_enabled = lambda: False  # type: ignore
						infer_column_mapping = None  # type: ignore

					if mapper_enabled() and infer_column_mapping is not None:
						sample_rows = df.head(5).to_dict("records")
						colmap = infer_column_mapping(sample_rows, bank_code)
						# Create normalized columns when mapping exists
						def copy_if(src_key: str | None, dst_key: str):
							if src_key and src_key in df.columns and dst_key not in df.columns:
								df[dst_key] = df[src_key]
						copy_if(colmap.get("description"), "description")
						copy_if(colmap.get("debit"), "debit")
						copy_if(colmap.get("credit"), "credit")
						copy_if(colmap.get("balance"), "balance")
						# Date normalization preference: date_iso -> derive from mapped date if needed
						if "date_iso" not in df.columns:
							date_src = colmap.get("date_iso") or colmap.get("date")
							if date_src and date_src in df.columns:
								def normalize_date_ai(date_val):
									if pd.isna(date_val):
										return None
									try:
										parsed = pd.to_datetime(str(date_val).strip(), dayfirst=True, errors='coerce')
										if pd.notna(parsed):
											return parsed.strftime('%Y-%m-%d')
										return None
									except Exception:
										return None
								df["date_iso"] = df[date_src].apply(normalize_date_ai)

					if "date_iso" not in df.columns and "date" in df.columns:
						def normalize_date(date_val):
							if pd.isna(date_val):
								return None
							try:
								parsed = pd.to_datetime(str(date_val).strip(), dayfirst=True, errors='coerce')
								if pd.notna(parsed):
									# return Y-m-d
									return parsed.strftime('%Y-%m-%d')
								return None
							except Exception:
								return None
						df["date_iso"] = df["date"].apply(normalize_date)
					if "date_iso" in df.columns:
						df = df[df["date_iso"].notna()].copy()
				except Exception:
					pass

				transactions = df.to_dict("records")
			else:
				transactions = []

			debug = {
				"method": "master_generic_inprocess",
				"codeFiles": [
					"tools-master/extractors/generic.py",
					"legacy/tools/accurate_parser.py",
					"legacy/tools/bank_statement_parser.py",
				],
				"explanation": "Used master GenericExtractor importing legacy modules directly (no subprocess).",
			}
			return transactions, metadata or {}, debug
		finally:
			# We do not remove sys.path entries to avoid repeated adding; harmless.
			pass


