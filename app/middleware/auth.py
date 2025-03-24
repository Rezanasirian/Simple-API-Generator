from functools import wraps
from flask import request, redirect, url_for, flash, current_app, session, g
from flask_login import current_user, login_required as flask_login_required
from app.services.logger import setup_logging

logger = setup_logging()

def admin_required(f):
    """
    Decorator for routes that require admin access
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('auth.login', next=request.url))
            
        if current_user.role != 'admin':
            flash('You do not have permission to access this page.', 'danger')
            logger.warning(f"Unauthorized access attempt to admin page by user: {current_user.username}")
            return redirect(url_for('main.index'))
            
        return f(*args, **kwargs)
    return decorated_function

def api_key_required(f):
    """
    Decorator for API routes that require API key authentication
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
        
        if not api_key:
            logger.warning("API request without API key")
            return {'error': 'API key is required'}, 401
            
        # Get API keys from configuration
        api_keys = current_app.config.get('API_KEYS', {})
        
        if api_key not in api_keys:
            logger.warning(f"API request with invalid API key: {api_key}")
            return {'error': 'Invalid API key'}, 401
            
        # Set the user ID for metrics tracking
        g.user_id = api_keys.get(api_key, {}).get('user_id')
        g.api_key = api_key
        
        return f(*args, **kwargs)
    return decorated_function

def track_user_activity(f):
    """
    Decorator to track user activity for metrics
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = None
        
        # Get user from different sources depending on context
        if hasattr(g, 'user_id'):
            user_id = g.user_id
        elif current_user.is_authenticated:
            user_id = current_user.id
            
        if user_id:
            g.metrics_user_id = user_id
            
        return f(*args, **kwargs)
    return decorated_function

def login_required(f):
    """
    Enhanced login_required decorator that redirects to login page.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('auth.login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function 