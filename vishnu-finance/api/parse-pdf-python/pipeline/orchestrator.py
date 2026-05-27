import logging
from typing import Any, Dict, List, Optional

from .manager import PipelineManager
from .fallbacks.scoring import compute_parse_score
from .fallbacks.table_fallback import TableFallbackParser
from .fallbacks.ocr_fallback import OcrFallbackParser
from .fallbacks.gemini_fallback import GeminiFallbackParser

logger = logging.getLogger(__name__)


class ParseOrchestrator:
    """
    Runs primary pipeline and StmtForge-inspired fallbacks.
    Picks the result with the highest reconciliation score.
    """

    ACCEPTABLE_SCORE = 1000.0

    def __init__(self):
        self.pipeline = PipelineManager()
        self.table_fallback = TableFallbackParser()
        self.ocr_fallback = OcrFallbackParser()
        self.gemini_fallback = GeminiFallbackParser()

    def parse(
        self,
        file_path: str,
        statement_id: str,
        password: Optional[str] = None,
        bank_profiles: Optional[List[Dict[str, Any]]] = None,
        bank_code: Optional[str] = None,
        max_pages: Optional[int] = None,
    ) -> Dict[str, Any]:
        attempts: List[tuple[str, Dict[str, Any]]] = []

        primary = self.pipeline.run_pipeline(
            file_path,
            statement_id=statement_id,
            password=password,
            bank_profiles=bank_profiles,
            bank_code=bank_code,
            max_pages=max_pages,
        )
        if primary.get("status") == "needs_password":
            return primary

        primary.setdefault("metadata", {})["parserMethod"] = "primary"
        attempts.append(("primary", primary))

        best_name, best_result = self._best_attempt(attempts)
        if compute_parse_score(best_result) >= self.ACCEPTABLE_SCORE:
            return self._finalize(best_name, best_result)

        logger.info("Primary pipeline score insufficient; trying table fallback")
        table_result = self.table_fallback.parse(file_path, password=password, bank_code=bank_code or best_result.get("bank"))
        attempts.append(("table_fallback", table_result))

        best_name, best_result = self._best_attempt(attempts)
        if compute_parse_score(best_result) >= self.ACCEPTABLE_SCORE:
            return self._finalize(best_name, best_result)

        logger.info("Trying OCR fallback")
        ocr_result = self.ocr_fallback.run_pipeline_with_ocr(
            self.pipeline,
            file_path=file_path,
            statement_id=f"{statement_id}_ocr",
            password=password,
            bank_profiles=bank_profiles,
            bank_code=bank_code or best_result.get("bank"),
        )
        if ocr_result.get("status") != "failed":
            attempts.append(("ocr_fallback", ocr_result))

        best_name, best_result = self._best_attempt(attempts)
        if compute_parse_score(best_result) >= self.ACCEPTABLE_SCORE:
            return self._finalize(best_name, best_result)

        logger.info("Trying Gemini fallback")
        gemini_result = self.gemini_fallback.parse(
            file_path,
            password=password,
            bank_code=bank_code or best_result.get("bank"),
        )
        if gemini_result.get("status") != "failed":
            attempts.append(("gemini_fallback", gemini_result))

        best_name, best_result = self._best_attempt(attempts)
        return self._finalize(best_name, best_result)

    def _best_attempt(self, attempts: List[tuple[str, Dict[str, Any]]]) -> tuple[str, Dict[str, Any]]:
        ranked = sorted(
            attempts,
            key=lambda item: compute_parse_score(item[1]),
            reverse=True,
        )
        return ranked[0]

    def _finalize(self, parser_method: str, result: Dict[str, Any]) -> Dict[str, Any]:
        if result.get("status") == "failed":
            return result

        metadata = result.setdefault("metadata", {})
        metadata["parserMethod"] = parser_method
        metadata["parseScore"] = compute_parse_score(result)
        result["parserMethod"] = parser_method
        return result
