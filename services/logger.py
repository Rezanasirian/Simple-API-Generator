import logging
import os
from logging.handlers import RotatingFileHandler
from typing import Optional
from pathlib import Path


class LogConfig:
    """Configuration constants for logging."""
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
    DATE_FORMAT = '%Y-%m-%d %H:%M:%S'
    LOG_DIR = 'logs'
    LOG_FILE = 'api.log'
    MAX_BYTES = 10_000_000  # 10MB
    BACKUP_COUNT = 5
    DEFAULT_LEVEL = logging.INFO


def setup_logging(
        name: Optional[str] = None,
        level: int = LogConfig.DEFAULT_LEVEL,
        log_file: str = LogConfig.LOG_FILE
) -> logging.Logger:
    """
    Set up logging configuration with rotation and proper formatting.

    Args:
        name: Logger name (defaults to module name if None)
        level: Logging level
        log_file: Name of the log file

    Returns:
        logging.Logger: Configured logger instance
    """
    try:
        # Create logs directory if it doesn't exist
        log_dir = Path(LogConfig.LOG_DIR)
        log_dir.mkdir(exist_ok=True)

        # Get or create logger
        logger = logging.getLogger(name or __name__)

        # Only configure if no handlers exist
        if not logger.handlers:
            logger.setLevel(level)

            # Create log file path
            log_path = log_dir / log_file

            # Configure rotating file handler
            file_handler = RotatingFileHandler(
                filename=str(log_path),
                maxBytes=LogConfig.MAX_BYTES,
                backupCount=LogConfig.BACKUP_COUNT,
                encoding='utf-8'
            )

            # Configure console handler
            console_handler = logging.StreamHandler()

            # Create and set formatter
            formatter = logging.Formatter(
                fmt=LogConfig.LOG_FORMAT,
                datefmt=LogConfig.DATE_FORMAT
            )

            # Apply formatter to handlers
            file_handler.setFormatter(formatter)
            console_handler.setFormatter(formatter)

            # Add handlers to logger
            logger.addHandler(file_handler)
            logger.addHandler(console_handler)

            # Prevent propagation to root logger
            logger.propagate = False

            logger.debug("Logger initialized successfully")

        return logger

    except Exception as e:
        # Fallback to basic logging if setup fails
        basic_logger = logging.getLogger("fallback")
        basic_logger.setLevel(logging.ERROR)
        basic_logger.error(f"Failed to initialize logger: {e}")
        return basic_logger

