import logging
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class OcrFallbackParser:
    """
    OCR fallback for scanned/mixed PDFs.
    Converts OCR output into word artifacts and re-runs the spatial pipeline stages.
    """

    def run_pipeline_with_ocr(
        self,
        pipeline_manager,
        file_path: str,
        statement_id: str,
        password: Optional[str] = None,
        bank_profiles: Optional[List[Dict[str, Any]]] = None,
        bank_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            import pdf2image
            import pytesseract
            from PIL import Image
        except ImportError as exc:
            logger.warning("OCR dependencies unavailable: %s", exc)
            return {"status": "failed", "error": "OCR dependencies not installed", "transactions": []}

        try:
            images = pdf2image.convert_from_path(
                file_path,
                dpi=200,
                userpw=password or None,
            )
        except Exception as exc:
            logger.warning("OCR image conversion failed: %s", exc)
            return {"status": "failed", "error": str(exc), "transactions": []}

        ocr_pages = []
        for page_num, image in enumerate(images):
            try:
                data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            except Exception as exc:
                logger.warning("Tesseract failed on page %s: %s", page_num + 1, exc)
                continue

            words = []
            for i, text in enumerate(data.get("text", [])):
                text = (text or "").strip()
                if not text:
                    continue
                conf = float(data["conf"][i])
                if conf < 30:
                    continue
                words.append(
                    {
                        "text": text,
                        "x0": float(data["left"][i]),
                        "top": float(data["top"][i]),
                        "x1": float(data["left"][i] + data["width"][i]),
                        "bottom": float(data["top"][i] + data["height"][i]),
                        "confidence": conf / 100.0,
                    }
                )
            ocr_pages.append({"page_no": page_num + 1, "words": words})

        if not ocr_pages:
            return {"status": "failed", "error": "OCR produced no text", "transactions": []}

        result = pipeline_manager.run_pipeline_from_ocr_pages(
            file_path=file_path,
            statement_id=statement_id,
            ocr_pages=ocr_pages,
            password=password,
            bank_profiles=bank_profiles,
            bank_code=bank_code,
        )
        if result.get("status") == "success":
            metadata = result.setdefault("metadata", {})
            metadata["parserMethod"] = "ocr_fallback"
        return result
