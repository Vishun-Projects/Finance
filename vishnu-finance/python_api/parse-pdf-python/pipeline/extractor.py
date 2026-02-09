import logging
import pdfplumber
import pdfminer
import pandas as pd
from typing import List, Optional
from .models import JobContext, PageArtifact, WordArtifact, BBox, PdfType

logger = logging.getLogger(__name__)

class ExtractorShim:
    """
    Stage 3: Page-Level Extraction
    """
    
    def extract_pages(self, ctx: JobContext, max_pages: Optional[int] = None):
        logger.info(f"Starting extraction for {ctx.file_path}")
        if max_pages:
            logger.info(f"Limiting extraction to first {max_pages} pages")
        
        try:
            if ctx.pdf_type == PdfType.EXCEL:
                self._extract_excel(ctx)
                return
            if ctx.pdf_type == PdfType.TXT:
                self._extract_txt(ctx)
                return

            with pdfplumber.open(ctx.file_path, password=ctx.password) as pdf:
                for i, page in enumerate(pdf.pages):
                    page_artifact = PageArtifact(page_no=i+1)
                    
                    # Store page dimensions for normalization if needed
                    page_width = page.width
                    page_height = page.height

                    # TEXT extraction
                    # x_tolerance=2, y_tolerance=2 usually good for table-like data
                    raw_words = page.extract_words(
                        x_tolerance=2, 
                        y_tolerance=2, 
                        keep_blank_chars=False
                    )
                    
                    for w in raw_words:
                        word_obj = WordArtifact(
                            text=w['text'],
                            bbox=BBox(
                                x0=float(w['x0']),
                                y0=float(w['top']), # pdfplumber uses 'top', we store as y0/y1 commonly or specific logic
                                x1=float(w['x1']),
                                y1=float(w['bottom'])
                            ),
                            confidence=1.0, # PDF text is 100% confident usually
                            page=i+1
                        )
                        page_artifact.words.append(word_obj)
                    
                    ctx.pages.append(page_artifact)
                    logger.info(f"Page {i+1} extracted: {len(page_artifact.words)} words")
                    
                    if max_pages and len(ctx.pages) >= max_pages:
                        logger.info(f"Reached max_pages limit ({max_pages}), stopping extraction.")
                        break
                    
        except (pdfminer.pdfpassword.PDFPasswordRequiredError, pdfminer.pdfpassword.PDFPasswordIncorrectError) as e:
            logger.error(f"Password error for {ctx.file_path}: {e}")
            # We raise a custom exception that the manager can catch
            raise ValueError(f"NEEDS_PASSWORD: {str(e)}")
        except Exception as e:
            logger.error(f"Extraction failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise e

    def _extract_excel(self, ctx: JobContext):
        try:
            # Read all sheets
            xls = pd.ExcelFile(ctx.file_path)
            for i, sheet_name in enumerate(xls.sheet_names):
                df = xyz = pd.read_excel(xls, sheet_name=sheet_name, header=None) # Read without header to get all rows
                
                # Convert DF to Words/Lines
                # We can simulate "words" by iterating cells.
                # BBox: X = col_idx * 100, Y = row_idx * 20
                
                page_artifact = PageArtifact(page_no=i+1)
                
                for row_idx, row in df.iterrows():
                    for col_idx, val in row.items():
                        if pd.isna(val):
                            continue
                        
                        text = str(val).strip()
                        if not text:
                            continue
                            
                        # Create artificial BBox
                        x0 = col_idx * 100.0
                        y0 = row_idx * 20.0
                        x1 = x0 + 90.0
                        y1 = y0 + 15.0
                        
                        word_obj = WordArtifact(
                            text=text,
                            bbox=BBox(x0=x0, y0=y0, x1=x1, y1=y1),
                            confidence=1.0,
                            page=i+1
                        )
                        page_artifact.words.append(word_obj)
                
                ctx.pages.append(page_artifact)
                logger.info(f"Sheet {sheet_name} extracted as Page {i+1}: {len(page_artifact.words)} words")
                
        except Exception as e:
            logger.error(f"Excel Extraction failed: {e}")

    def _extract_txt(self, ctx: JobContext):
        try:
            with open(ctx.file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                
            # Create single page artifact for now (or split every 50 lines)
            # Let's do single page for simplicity unless huge
            page_artifact = PageArtifact(page_no=1)
            
            for row_idx, line in enumerate(lines):
                text = line.strip()
                if not text:
                    continue
                
                # Split into words or keep as line?
                # Pipeline expects words for layout analysis mostly.
                # If we split by space:
                words = text.split()
                
                # Estimate X position based on character count from start of line?
                # Or just sequential.
                # TXT usually loses column alignment unless it's fixed width.
                # If fixed width, splitting by space destroys alignment info unless we process carefully.
                # Simple approach: space split.
                
                cursor_x = 0.0
                for w in words:
                    # Estimate width: char count * 8 pixels
                    width = len(w) * 8.0
                    
                    word_obj = WordArtifact(
                        text=w,
                        bbox=BBox(x0=cursor_x, y0=row_idx * 15.0, x1=cursor_x + width, y1=row_idx * 15.0 + 12.0),
                        confidence=1.0,
                        page=1
                    )
                    page_artifact.words.append(word_obj)
                    
                    cursor_x += width + 10.0 # space
            
            ctx.pages.append(page_artifact)
            logger.info(f"TXT extracted: {len(page_artifact.words)} words")
            
        except Exception as e:
            logger.error(f"TXT Extraction failed: {e}")



