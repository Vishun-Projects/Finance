import logging
from typing import List, Dict, Any
from .models import JobContext, PageArtifact, WordArtifact

logger = logging.getLogger(__name__)

class LayoutShim:
    """
    Stage 5: Layout Analysis (Row & Column Detection)
    """
    
    def analyze_layout(self, ctx: JobContext):
        """
        Clusters words into rows and identifies potential header rows.
        """
        logger.info("Starting Stage 5: Layout Analysis")
        for page in ctx.pages:
            # 1. Cluster words into rows
            rows = self._cluster_words_into_rows(page.words)
            page.lines = rows
            
            # 2. Identify header row (Candidate for Stage 7)
            # We don't finalize mapping here, but we can look for "anchor" rows
            logger.info(f"Page {page.page_no}: Detected {len(rows)} rows")
            
        ctx.stats['layout_analysis_complete'] = True

    def _cluster_words_into_rows(self, words: List[WordArtifact]) -> List[List[WordArtifact]]:
        if not words:
            return []

        # Sort by Y0 (process top to bottom)
        sorted_words = sorted(words, key=lambda w: w.bbox.y0)
        
        rows = []
        if not sorted_words:
            return []
            
        current_row = [sorted_words[0]]
        
        for w in sorted_words[1:]:
            prev_w = current_row[-1]
            
            # Use a dynamic tolerance based on character height if possible, 
            # otherwise fallback to a small constant.
            char_height = prev_w.bbox.y1 - prev_w.bbox.y0
            y_tolerance = max(char_height * 0.5, 3.0) 
            
            # Check vertical proximity of centers to be even more robust
            curr_center = (w.bbox.y0 + w.bbox.y1) / 2
            prev_center = (prev_w.bbox.y0 + prev_w.bbox.y1) / 2
            
            if abs(curr_center - prev_center) <= y_tolerance:
                current_row.append(w)
            else:
                current_row.sort(key=lambda w: w.bbox.x0)
                rows.append(current_row)
                current_row = [w]
                
        if current_row:
            current_row.sort(key=lambda w: w.bbox.x0)
            rows.append(current_row)
            
        return rows
