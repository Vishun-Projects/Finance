from typing import Any, Dict, List, TypedDict

class ParseResult(TypedDict, total=False):
	success: bool
	transactions: List[Dict[str, Any]]
	count: int
	metadata: Dict[str, Any]
	debug: Dict[str, Any]


