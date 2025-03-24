import logging
import os
import sys
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


def setup_logging(name=None, log_file='api.log', level=None):
    """
    Set up logging configuration.
    
    Args:
        name: Logger name (defaults to root logger)
        log_file: Path to log file
        level: Logging level (defaults to INFO)
        
    Returns:
        Configured logger instance
    """
    # Get logger
    logger = logging.getLogger(name)
    
    # Skip if logger is already configured
    if logger.handlers:
        return logger
        
    # Get log level from environment or use INFO as default
    if level is None:
        level_name = os.environ.get('LOG_LEVEL', 'INFO').upper()
        level = getattr(logging, level_name, logging.INFO)
        
    # Set log level
    logger.setLevel(level)
    
    # Create formatters
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_formatter = logging.Formatter(
        '%(levelname)s: %(message)s'
    )
    
    # Create file handler
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5
    )
    file_handler.setFormatter(file_formatter)
    file_handler.setLevel(level)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(console_formatter)
    console_handler.setLevel(level)
    
    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

