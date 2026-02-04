import pdfplumber
import logging
from .models import JobContext, PdfType

logger = logging.getLogger(__name__)

class ClassifierShim:
    """
    Stage 2: PDF Type Detection
    """
    TEXT_THRESHOLD = 50  # chars per page
    IMAGE_THRESHOLD = 0.5 # image area ratio? or just count. Let's use count for now or text len.

    def detect_type(self, ctx: JobContext) -> PdfType:
        if ctx.file_path.lower().endswith('.xlsx') or ctx.file_path.lower().endswith('.xls'):
            return PdfType.EXCEL
        if ctx.file_path.lower().endswith('.txt'):
            return PdfType.TXT
            
        try:
            total_text_len = 0
            total_pages_checked = 0
            max_pages_to_check = 3 # Check first 3 pages to save time
            
            with pdfplumber.open(ctx.file_path, password=ctx.password) as pdf:
                for i, page in enumerate(pdf.pages):
                    if i >= max_pages_to_check:
                        break
                    
                    text = page.extract_text() or ""
                    total_text_len += len(text.strip())
                    total_pages_checked += 1
            
            avg_text_len = total_text_len / max(1, total_pages_checked)
            
            logger.info(f"Classifier stats: Avg Text Len={avg_text_len}")

            if avg_text_len > self.TEXT_THRESHOLD:
                return PdfType.TEXT
            elif avg_text_len > 0:
                return PdfType.MIXED
            else:
                return PdfType.SCANNED

        except Exception as e:
            logger.error(f"Classification failed: {e}")
            # Fallback to MIXED for safety so OCR runs
            return PdfType.MIXED

