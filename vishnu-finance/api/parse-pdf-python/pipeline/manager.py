import logging
import traceback
from typing import Optional, Dict, Any, List

from .models import JobContext, PdfType
from .security import SecurityShim
from .classifier import ClassifierShim
from .extractor import ExtractorShim
from .sanitizer import SanitizerShim
from .layout import LayoutShim
from .bank_detection import BankDetectorShim
from .mapping import MapperShim
from .candidates import CandidatesShim
from .inference import InferenceEngineShim
from .normalization import NormalizationShim
from .validator import ValidatorShim
from .persistence import PersistenceShim

logger = logging.getLogger(__name__)

class PipelineManager:
    """
    Orchestrates the 14-stage parsing pipeline.
    """
    
    def __init__(self):
        # Initialize stages
        self.security = SecurityShim()
        self.classifier = ClassifierShim()
        self.extractor = ExtractorShim()
        self.sanitizer = SanitizerShim()
        self.layout = LayoutShim()
        self.bank_detector = BankDetectorShim()
        self.mapper = MapperShim()
        self.candidates = CandidatesShim()
        self.inference = InferenceEngineShim()
        self.normalization = NormalizationShim()
        self.validator = ValidatorShim()
        self.persistence = PersistenceShim()

    def run_pipeline(self, file_path: str, statement_id: str, password: Optional[str] = None, bank_profiles: Optional[List[Dict[str, Any]]] = None, max_pages: Optional[int] = None) -> Dict[str, Any]:
        """
        Main entry point for the authoritative 14-stage pipeline.
        """
        # STAGE 0: Job Initialization
        ctx = JobContext(statement_id=statement_id, file_path=file_path, password=password, bank_profiles=bank_profiles)
        logger.info(f"Starting Stage 0: Job Initialization for {statement_id}")

        try:
            # STAGE 1: PDF Integrity & Security Checks
            if not self.security.check_integrity(ctx):
                logger.error(f"Stage 1 Failed: {statement_id}")
                return self.persistence.create_failure_response("Security check failed")

            # STAGE 2: PDF TYPE DETECTION
            ctx.pdf_type = self.classifier.detect_type(ctx)
            logger.info(f"Stage 2 Finish: Detected {ctx.pdf_type}")

            # STAGE 3: PAGE-LEVEL EXTRACTION (LOOP)
            self.extractor.extract_pages(ctx, max_pages=max_pages)
            logger.info("Stage 3 Finish: Page Artifacts created")

            # STAGE 4: NUMERAL SANITY FILTER
            self.sanitizer.sanitize_numerals(ctx)
            
            # STAGE 5: LAYOUT ANALYSIS (ROW & COLUMN DETECTION)
            self.layout.analyze_layout(ctx)

            # STAGE 6: BANK DETECTION
            self.bank_detector.detect_bank(ctx)
            
            # STAGE 7: COLUMN SEMANTIC MAPPING
            mapping = self.mapper.map_columns(ctx)
            
            # STAGE 8: RAW TRANSACTION CANDIDATE GENERATION
            if mapping:
                candidates_list = self.candidates.generate_candidates(ctx, mapping)
            else:
                logger.warning("Stage 7 yielded no mapping. Skipping Stage 8 spatial extraction.")
                candidates_list = []
            
            # STAGE 9: SEMANTIC INFERENCE ENGINE (CORE IP)
            # Implements "Balance-Driven Truth"
            transactions = self.inference.process_transactions(ctx, candidates_list)
            
            # STAGE 11: SEMANTIC NORMALIZATION (Heuristic/AI Cleanup)
            transactions = self.normalization.normalize_transactions(ctx, transactions)
            
            # STAGE 10: RECONCILIATION & VALIDATION GATE
            # The Firewall.
            validation_result = self.validator.validate(transactions)
            
            # STAGE 11: PARTIAL & FAILURE HANDLING
            if not validation_result.get('valid') and transactions:
                logger.warning(f"Stage 10 triggered Stage 11: Partial success for {statement_id}")
                # We still continue to persistence, but Stage 12 will mark it as partial
            
            # STAGE 12-14: PERSISTENCE, POST-PROCESSING & RAG
            return self.persistence.save_and_format(ctx, transactions, validation_result, candidates=candidates_list)

        except Exception as e:
            err_msg = str(e)
            if "NEEDS_PASSWORD" in err_msg:
                return {"status": "needs_password", "error": err_msg}
            logger.error(f"Pipeline crashed during execution: {traceback.format_exc()}")
            return self.persistence.create_failure_response(f"Internal Pipeline Error: {err_msg}")

