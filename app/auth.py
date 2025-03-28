from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from app.models import db, ApiKey
from app.forms import RegistrationForm, LoginForm
from app.services.user_manager import UserManager
from app.services.logger import setup_logging
import uuid
import datetime

logger = setup_logging(__name__)
auth = Blueprint('auth', __name__)

@auth.route('/register', methods=['GET', 'POST'])
@login_required
def register():
    # Check if user is admin
    if not current_user.is_authenticated or current_user.role != 'admin':
        flash('Only administrators can add new users', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
        
    form = RegistrationForm()
    if form.validate_on_submit():
        user_manager = UserManager()
        try:
            new_user = user_manager.create_user(
                username=form.username.data,
                password=form.password.data,
                role=form.role.data if hasattr(form, 'role') else "user"
            )
            logger.info(f"User registered successfully: {form.username.data}")
            flash(f'User {form.username.data} created successfully!', 'success')
            return redirect(url_for('API_ApiList.apiList'))
        except ValueError as e:
            logger.error(f"Registration error: {str(e)}")
            flash(str(e), 'danger')
    return render_template('auth/register.html', form=form, active_page='register')

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('API_ApiList.apiList'))
        
    form = LoginForm()
    logger.info(f"Login page accessed")
    
    if form.validate_on_submit():
        logger.info(f"Login form submitted with username: {form.username.data}")
        user_manager = UserManager()
        
        try:
            user = user_manager.authenticate_user(
                username=form.username.data,
                password=form.password.data
            )
            
            if user:
                logger.info(f"User authenticated successfully: {user.username}")
                login_user(user)
                flash(f'Welcome back, {user.username}!', 'success')
                
                # Check if there's a next parameter in the URL
                next_page = request.args.get('next')
                if next_page:
                    return redirect(next_page)
                return redirect(url_for('API_ApiList.apiList'))
            else:
                logger.warning(f"Failed login attempt for username: {form.username.data}")
                flash('Invalid username or password. Please try again.', 'danger')
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            flash('An error occurred during login. Please try again later.', 'danger')
    
    # If there are any form errors, log them
    if form.errors:
        logger.error(f"Form errors: {form.errors}")
        for field, errors in form.errors.items():
            for error in errors:
                flash(f"{field}: {error}", "danger")
        
    return render_template('auth/login.html', form=form, hide_nav=True)

@auth.route('/logout')
@login_required
def logout():
    username = current_user.username
    logout_user()
    logger.info(f"User logged out: {username}")
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('auth.login'))

@auth.route('/profile')
@login_required
def profile():
    logger.info(f"Profile page accessed by user: {current_user.username}")
    return render_template('auth/profile.html', active_page='profile')

@auth.route('/api-keys', methods=['GET'])
@login_required
def api_keys():
    """Display the API keys management page."""
    # Get user's API keys from database
    user_api_keys = []
    try:
        # Here you would fetch the user's API keys from your database
        # For now, showing a sample implementation
        user_api_keys = db.session.query(ApiKey).filter_by(user_id=current_user.id).all()
    except Exception as e:
        logger.error(f"Error fetching API keys: {str(e)}")
        flash('An error occurred while retrieving your API keys.', 'danger')
    
    # Get API usage statistics
    api_usage = {
        'total_calls': 0,
        'last_30_days': 0
    }
    
    try:
        # Here you would fetch actual metrics from your database
        # Replace with actual metrics when integrated with your metrics tracker
        pass
    except Exception as e:
        logger.error(f"Error fetching API usage stats: {str(e)}")
    
    return render_template('auth/api_keys.html', 
                          api_keys=user_api_keys,
                          api_usage=api_usage)

@auth.route('/api-keys/generate', methods=['POST'])
@login_required
def generate_api_key():
    """Generate a new API key for the user."""
    try:
        # Create a new API key
        api_key = str(uuid.uuid4())
        key_name = request.form.get('key_name', f"API Key - {datetime.datetime.now().strftime('%Y-%m-%d')}")
        
        # Here you would save the API key to your database
        # This is a placeholder - you need to implement the actual storage
        new_key = ApiKey(
            user_id=current_user.id,
            name=key_name,
            key=api_key,
            created_at=datetime.datetime.now()
        )
        db.session.add(new_key)
        db.session.commit()
        
        flash('New API key generated successfully.', 'success')
        return redirect(url_for('auth.api_keys'))
    except Exception as e:
        logger.error(f"Error generating API key: {str(e)}")
        flash('An error occurred while generating your API key.', 'danger')
        return redirect(url_for('auth.api_keys'))

@auth.route('/api-keys/delete/<int:key_id>', methods=['POST'])
@login_required
def delete_api_key(key_id):
    """Delete an API key."""
    try:
        # Find the key and verify it belongs to the current user
        api_key = db.session.query(ApiKey).filter_by(id=key_id, user_id=current_user.id).first()
        
        if not api_key:
            flash('API key not found or you do not have permission to delete it.', 'danger')
            return redirect(url_for('auth.api_keys'))
        
        # Delete the key
        db.session.delete(api_key)
        db.session.commit()
        
        flash('API key deleted successfully.', 'success')
    except Exception as e:
        logger.error(f"Error deleting API key: {str(e)}")
        flash('An error occurred while deleting your API key.', 'danger')
    
    return redirect(url_for('auth.api_keys'))

@auth.route('/admin/users')
@login_required
def admin_users():
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to view this page.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
    
    user_manager = UserManager()
    users = user_manager.get_all_users()
    logger.info(f"User management page accessed by admin: {current_user.username}")
    return render_template('admin/users.html', users=users, active_page='admin_users')

@auth.route('/admin/users/edit/<int:user_id>', methods=['GET', 'POST'])
@login_required
def edit_user(user_id):
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to edit users.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
    
    user_manager = UserManager()
    user = user_manager.get_user_by_id(user_id)
    
    if not user:
        flash('User not found.', 'danger')
        return redirect(url_for('auth.admin_users'))
    
    # For now, just redirect to the user management page
    # In a future implementation, we would create a form to edit users
    flash('User editing functionality is not implemented yet.', 'info')
    return redirect(url_for('auth.admin_users'))

@auth.route('/admin/users/delete/<int:user_id>', methods=['POST'])
@login_required
def delete_user(user_id):
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to delete users.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
    
    user_manager = UserManager()
    user = user_manager.get_user_by_id(user_id)
    
    if not user:
        flash('User not found.', 'danger')
        return redirect(url_for('auth.admin_users'))
    
    # Prevent admins from deleting themselves
    if user.id == current_user.id:
        flash('You cannot delete your own account.', 'danger')
        return redirect(url_for('auth.admin_users'))
    
    # For now, just redirect to the user management page
    # In a future implementation, we would actually delete the user
    flash('User deletion functionality is not implemented yet.', 'info')
    return redirect(url_for('auth.admin_users'))
