import logging
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

class StructuredLogger:
    """
    Structured logger for financial parsing that outputs JSON-formatted logs
    with context about the file, bank, and parsing stage.
    """
    
    def __init__(self, name: str = "financial_parser"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        
        # Avoid adding multiple handlers if they already exist
        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stderr)
            formatter = logging.Formatter('%(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            
        self.context: Dict[str, Any] = {}

    def set_context(self, **kwargs):
        """Set global context for all subsequent logs."""
        self.context.update(kwargs)

    def clear_context(self):
        """Clear global context."""
        self.context = {}

    def _format_log(self, level: str, event: str, data: Optional[Dict[str, Any]] = None) -> str:
        """Format log entry as JSON."""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "event": event,
            **self.context
        }
        
        if data:
            log_entry.update(data)
            
        return json.dumps(log_entry)

    def debug(self, event: str, data: Optional[Dict[str, Any]] = None):
        """Log debug event."""
        self.logger.debug(self._format_log("DEBUG", event, data))

    def info(self, event: str, data: Optional[Dict[str, Any]] = None):
        """Log info event."""
        self.logger.info(self._format_log("INFO", event, data))

    def warning(self, event: str, data: Optional[Dict[str, Any]] = None):
        """Log warning event."""
        self.logger.warning(self._format_log("WARNING", event, data))

    def error(self, event: str, error: Optional[Exception] = None, data: Optional[Dict[str, Any]] = None):
        """Log error event."""
        log_data = data or {}
        if error:
            log_data["error"] = str(error)
            log_data["error_type"] = type(error).__name__
            
        self.logger.error(self._format_log("ERROR", event, log_data))

# Global instance
logger = StructuredLogger()
