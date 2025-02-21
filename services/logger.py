import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    
    logger = logging.getLogger(__name__)
    if not logger.handlers:  # Check if handlers already exist

        logger.setLevel(logging.INFO)
        handler = RotatingFileHandler('api.log', maxBytes=10000, backupCount=1)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.propagate = False
    return logger

