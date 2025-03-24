from functools import wraps
from flask import request, g
import time
from flask_login import current_user
from migrations.metrics_tracker import MetricsTracker
from app.services.logger import setup_logging

logger = setup_logging(__name__)

def track_api_calls(api_id):
    """Decorator to track API usage metrics"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # Record start time
            start_time = time.time()
            
            # Store API ID for access in the view
            g.api_id = api_id
            
            try:
                # Execute the view function
                response = f(*args, **kwargs)
                
                # Calculate response time
                response_time = time.time() - start_time
                
                # Track successful call
                MetricsTracker.track_api_call(
                    api_id=api_id,
                    user_id=current_user.id if not current_user.is_anonymous else None,
                    status_code=response.status_code,
                    response_time=response_time,
                    endpoint=request.path,
                    method=request.method,
                    is_success=response.status_code < 400,
                    error_message=None
                )
                
                logger.info(f"API call tracked: {api_id}, path: {request.path}, time: {response_time:.3f}s")
                return response
                
            except Exception as e:
                # Calculate response time even for errors
                response_time = time.time() - start_time
                
                # Track failed call
                MetricsTracker.track_api_call(
                    api_id=api_id,
                    user_id=current_user.id if not current_user.is_anonymous else None,
                    status_code=500,
                    response_time=response_time,
                    endpoint=request.path,
                    method=request.method,
                    is_success=False,
                    error_message=str(e)
                )
                
                logger.error(f"API call error: {api_id}, path: {request.path}, error: {str(e)}")
                # Re-raise the exception
                raise
                
        return wrapped
    return decorator 