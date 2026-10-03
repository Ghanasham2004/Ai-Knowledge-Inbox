import logging
import sys
import re
from typing import Optional

# ANSI Color Codes
COLOR_RESET = "\033[0m"
COLOR_GRAY = "\033[90m"
COLOR_CYAN = "\033[36m"
COLOR_GREEN = "\033[32m"
COLOR_YELLOW = "\033[33m"
COLOR_RED = "\033[31m"
COLOR_BOLD_RED = "\033[1;31m"
COLOR_MAGENTA = "\033[1;35m"
COLOR_BLUE = "\033[1;34m"

# Sensitive Key Masking Regex Patterns
SENSITIVE_PATTERNS = [
    # Google API Keys (AIzaSy...)
    re.compile(r"(AIzaSy[a-zA-Z0-9_\-]{6})[a-zA-Z0-9_\-]{20,}", re.IGNORECASE),
    # Gemini Access Tokens (AQ....)
    re.compile(r"(AQ\.[a-zA-Z0-9_\-]{6})[a-zA-Z0-9_\-]{20,}", re.IGNORECASE),
    # Generic Tokens & Keys in key=val or json "key": "val"
    re.compile(r'(?i)(api[_-]?key|secret|token|password|authorization)\s*[:=]\s*["\']?([^"\'\s&]+)["\']?'),
    # Bearer tokens
    re.compile(r'(?i)bearer\s+([a-zA-Z0-9_\-\.]{15,})'),
]


class SensitiveDataFilter(logging.Filter):
    """Intercepts log records and redacts credentials/keys to prevent leaks."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self.mask_sensitive(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: self.mask_sensitive(v) if isinstance(v, str) else v for k, v in record.args.items()}
            elif isinstance(record.args, tuple):
                record.args = tuple(self.mask_sensitive(a) if isinstance(a, str) else a for a in record.args)
        return True

    @staticmethod
    def mask_sensitive(text: str) -> str:
        masked = text
        # Mask Google API Keys
        masked = SENSITIVE_PATTERNS[0].sub(r"\1...[REDACTED_API_KEY]", masked)
        masked = SENSITIVE_PATTERNS[1].sub(r"\1...[REDACTED_GEMINI_KEY]", masked)
        # Mask generic secrets: "apiKey": "xyz..." -> "apiKey": "[REDACTED]"
        masked = SENSITIVE_PATTERNS[2].sub(r'\1="[REDACTED]"', masked)
        # Mask Bearer tokens
        masked = SENSITIVE_PATTERNS[3].sub(r"Bearer [REDACTED_TOKEN]", masked)
        return masked


class ColoredFormatter(logging.Formatter):
    """
    Human-readable colorized formatter inspired by production microservices:
    - Gray timestamp
    - Colored Level badge
    - Magenta service tag
    - Green/Yellow/Red status codes
    """

    LEVEL_COLORS = {
        logging.DEBUG: COLOR_CYAN,
        logging.INFO: COLOR_GREEN,
        logging.WARNING: COLOR_YELLOW,
        logging.ERROR: COLOR_RED,
        logging.CRITICAL: COLOR_BOLD_RED,
    }

    def format(self, record: logging.LogRecord) -> str:
        # Timestamp
        asctime = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        timestamp_str = f"{COLOR_GRAY}{asctime}{COLOR_RESET}"

        # Level
        level_color = self.LEVEL_COLORS.get(record.levelno, COLOR_RESET)
        level_str = f"{level_color}{record.levelname:<7}{COLOR_RESET}"

        # Service Tag (from extra={'service': '...'} or logger name)
        service_tag = getattr(record, "service", record.name)
        service_str = f"{COLOR_MAGENTA}[{service_tag.upper()}]{COLOR_RESET}"

        # Colorize status codes in message if present (e.g. 200, 202, 404, 500)
        msg = record.getMessage()
        msg = re.sub(r"\b(2\d\d)\b", f"{COLOR_GREEN}\\1{COLOR_RESET}", msg)
        msg = re.sub(r"\b(3\d\d)\b", f"{COLOR_CYAN}\\1{COLOR_RESET}", msg)
        msg = re.sub(r"\b(4\d\d)\b", f"{COLOR_YELLOW}\\1{COLOR_RESET}", msg)
        msg = re.sub(r"\b(5\d\d)\b", f"{COLOR_BOLD_RED}\\1{COLOR_RESET}", msg)

        # File and line for debugging
        location = f"{COLOR_GRAY}{record.filename}:{record.lineno}{COLOR_RESET}"

        return f"{timestamp_str} | {level_str} | {service_str} {location} - {msg}"


def setup_logger(name: str = "APP") -> logging.Logger:
    logger_instance = logging.getLogger(name)
    if not logger_instance.handlers:
        logger_instance.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(ColoredFormatter())
        handler.addFilter(SensitiveDataFilter())
        logger_instance.addHandler(handler)
        logger_instance.propagate = False
    return logger_instance


def get_logger(service: str) -> logging.LoggerAdapter:
    """Returns a logger adapter with a specific service tag (e.g. RAG, INGEST, SCRAPER, DB)."""
    base_logger = setup_logger(service.lower())
    return logging.LoggerAdapter(base_logger, {"service": service})


logger = setup_logger("APP")
