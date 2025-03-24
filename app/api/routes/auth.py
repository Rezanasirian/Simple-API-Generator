from flask import Blueprint, request, render_template, redirect, url_for, flash, session, current_app
from flask_login import login_user, logout_user, current_user, login_required
from app.services.user_manager import UserManager
from app.services.logger import setup_logging
from app.services.metrics_tracker import MetricsTracker
from datetime import datetime
import uuid

Auth = Blueprint('auth', __name__)
logger = setup_logging()
user_manager = UserManager()
metrics_tracker = MetricsTracker()

@Auth.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login"""
    # Redirect if already logged in
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))

    # Handle login form submission
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = 'remember' in request.form
        
        if not username or not password:
            flash('Please enter both username and password.', 'warning')
            return render_template('auth/login.html')
        
        user = user_manager.authenticate_user(username, password)
        
        if user:
            login_user(user, remember=remember)
            
            # Log successful login
            logger.info(f"User {username} logged in")
            
            # Track login in metrics
            tracking = metrics_tracker.track_api_call("user_login", user_id=user.id)
            metrics_tracker.complete_api_call(tracking, success=True)
            
            # Redirect to next page or default
            next_page = request.args.get('next')
            if next_page and next_page.startswith('/'):
                return redirect(next_page)
            return redirect(url_for('main.index'))
        else:
            # Log failed login attempt
            logger.warning(f"Failed login attempt for username: {username}")
            
            # Track failed login in metrics
            tracking = metrics_tracker.track_api_call("user_login")
            metrics_tracker.complete_api_call(tracking, success=False, 
                                           error=f"Failed login attempt for: {username}")
            
            flash('Invalid username or password.', 'danger')
            
    return render_template('auth/login.html',active_page = 'login')

@Auth.route('/logout')
@login_required
def logout():
    """Handle user logout"""
    username = current_user.username
    user_id = current_user.id
    
    # Log user logout
    logger.info(f"User {username} logged out")
    
    # Track logout in metrics
    tracking = metrics_tracker.track_api_call("user_logout", user_id=user_id)
    
    # Perform logout
    logout_user()
    
    # Complete metrics tracking
    metrics_tracker.complete_api_call(tracking, success=True)
    
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))

@Auth.route('/register', methods=['GET', 'POST'])
def register():
    """Handle user registration"""
    # Redirect if already logged in
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    
    # Only allow registration if enabled in config
    if not current_app.config.get('ALLOW_REGISTRATION', False):
        flash('Registration is currently disabled.', 'warning')
        return redirect(url_for('auth.login'))
    
    # Handle registration form submission
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Validate form data
        if not all([username, email, password, confirm_password]):
            flash('All fields are required.', 'warning')
            return render_template('auth/register.html')
        
        if password != confirm_password:
            flash('Passwords do not match.', 'warning')
            return render_template('auth/register.html')
        
        # Attempt to create user
        try:
            user = user_manager.create_user(username, email, password)
            
            # Log successful registration
            logger.info(f"New user registered: {username}")
            
            # Track registration in metrics
            tracking = metrics_tracker.track_api_call("user_register", user_id=user.id)
            metrics_tracker.complete_api_call(tracking, success=True)
            
            # Log in the user
            login_user(user)
            
            flash('Registration successful! Welcome to API Generator.', 'success')
            return redirect(url_for('main.index'))
        except ValueError as e:
            # Log registration error
            logger.warning(f"Registration error: {str(e)}")
            
            # Track failed registration in metrics
            tracking = metrics_tracker.track_api_call("user_register")
            metrics_tracker.complete_api_call(tracking, success=False, error=str(e))
            
            flash(str(e), 'danger')
    
    return render_template('auth/register.html')

@Auth.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    """Handle user profile viewing and editing"""
    if request.method == 'POST':
        # Get form data
        data = {}
        
        if 'username' in request.form:
            data['username'] = request.form['username']
        
        if 'email' in request.form:
            data['email'] = request.form['email']
        
        # Handle password change if provided
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')
        
        if current_password and new_password and confirm_password:
            # Verify current password
            if not current_user.check_password(current_password):
                flash('Current password is incorrect.', 'danger')
                return redirect(url_for('auth.profile'))
            
            # Verify new passwords match
            if new_password != confirm_password:
                flash('New passwords do not match.', 'danger')
                return redirect(url_for('auth.profile'))
            
            # Set new password
            data['password'] = new_password
        
        # Update user profile
        try:
            user = user_manager.update_user(current_user.id, data)
            
            # Log profile update
            logger.info(f"User {user.username} updated profile")
            
            flash('Profile updated successfully.', 'success')
        except ValueError as e:
            flash(str(e), 'danger')
        
        return redirect(url_for('auth.profile'))
    
    # Get user metrics
    user_metrics = metrics_tracker.get_user_metrics(current_user.id, days=30)
    
    return render_template('auth/profile.html', user=current_user, metrics=user_metrics)

@Auth.route('/api-keys', methods=['GET', 'POST'])
@login_required
def api_keys():
    """Manage API keys for the current user"""
    # For this implementation, we'll store API keys in the user's session
    if 'api_keys' not in session:
        session['api_keys'] = {}
    
    if request.method == 'POST':
        # Generate a new API key
        key_name = request.form.get('key_name', 'Unnamed Key')
        api_key = str(uuid.uuid4())
        
        # Store the API key
        session['api_keys'][api_key] = {
            'name': key_name,
            'created': datetime.now().isoformat(),
            'user_id': current_user.id
        }
        
        # Update API keys in application config
        if 'API_KEYS' not in current_app.config:
            current_app.config['API_KEYS'] = {}
        
        current_app.config['API_KEYS'][api_key] = {
            'name': key_name,
            'user_id': current_user.id
        }
        
        flash('API key generated successfully.', 'success')
        return redirect(url_for('auth.api_keys'))
    
    # Handle key deletion
    key_to_delete = request.args.get('delete')
    if key_to_delete and key_to_delete in session['api_keys']:
        session['api_keys'].pop(key_to_delete)
        
        # Also remove from application config
        if key_to_delete in current_app.config.get('API_KEYS', {}):
            current_app.config['API_KEYS'].pop(key_to_delete)
        
        flash('API key deleted.', 'success')
        return redirect(url_for('auth.api_keys'))
    
    # User activity metrics
    user_metrics = metrics_tracker.get_user_metrics(current_user.id, days=30)
    
    return render_template('auth/api_keys.html', api_keys=session.get('api_keys', {}), metrics=user_metrics) 