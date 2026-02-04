import os
import logging
import PyPDF2
from .models import JobContext

logger = logging.getLogger(__name__)

class SecurityShim:
    """
    Stage 1: PDF Integrity & Security Checks
    """
    def check_integrity(self, ctx: JobContext) -> bool:
        logger.info(f"Checking integrity for {ctx.file_path}")
        
        # 1. Check file existence
        if not os.path.exists(ctx.file_path):
            logger.error(f"File not found: {ctx.file_path}")
            return False
            
        # 2. Check if file is empty
        if os.path.getsize(ctx.file_path) == 0:
            logger.error("File is empty")
            return False

        # 3. Verify PDF validity and password
        try:
            with open(ctx.file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                
                # Check encryption
                if reader.is_encrypted:
                    if ctx.password:
                        if not reader.decrypt(ctx.password):
                            logger.error("Failed to decrypt PDF with provided password")
                            return False
                    else:
                        logger.error("PDF is encrypted but no password provided")
                        return False
                
                # Count pages
                num_pages = len(reader.pages)
                if num_pages == 0:
                    logger.error("PDF has zero pages")
                    return False
                
                logger.info(f"PDF integrity verified. Pages: {num_pages}")
                return True

        except Exception as e:
            logger.error(f"PDF corruption detected: {e}")
            return False

