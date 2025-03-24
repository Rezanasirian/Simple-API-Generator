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

@auth.route('/admin/dashboard')
@login_required
def admin_dashboard():
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to view this page.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
        
    logger.info(f"Admin dashboard accessed by admin: {current_user.username}")
    
    # Get parameters
    days = request.args.get('period', 30, type=int)
    
    try:
        # Import metrics tracker
        from migrations.metrics_tracker import MetricsTracker
        
        # Get metrics from database
        daily_metrics = MetricsTracker.get_daily_metrics(days)
        api_metrics = MetricsTracker.get_api_metrics(days)
        api_performance = MetricsTracker.get_api_performance(days)
        chart_data = MetricsTracker.get_chart_data(days)
        
        # If no data found, use mock data for initial display
        if not daily_metrics['daily_data'] or not api_performance:
            logger.warning("No metrics data found, using mock data for display")
            # Create mock daily metrics (same as before)
            daily_metrics = {
                'total_calls': 1250,
                'successful_calls': 1180,
                'failed_calls': 70,
                'daily_data': {
                    '2023-03-01': {'total_calls': 180, 'successful_calls': 170, 'failed_calls': 10},
                    '2023-03-02': {'total_calls': 210, 'successful_calls': 195, 'failed_calls': 15},
                    '2023-03-03': {'total_calls': 195, 'successful_calls': 190, 'failed_calls': 5},
                    '2023-03-04': {'total_calls': 220, 'successful_calls': 210, 'failed_calls': 10},
                    '2023-03-05': {'total_calls': 240, 'successful_calls': 225, 'failed_calls': 15},
                    '2023-03-06': {'total_calls': 205, 'successful_calls': 190, 'failed_calls': 15}
                }
            }
            
            # Mock API metrics
            api_metrics = {
                'api1': {'average_response_time': 0.3, 'calls': 450},
                'api2': {'average_response_time': 0.2, 'calls': 320},
                'api3': {'average_response_time': 0.5, 'calls': 280},
                'api4': {'average_response_time': 0.4, 'calls': 200}
            }
            
            # API performance summary
            api_performance = [
                {'api_id': 'api1', 'total_calls': 450, 'avg_response_time': 0.3, 'error_rate': 0.03},
                {'api_id': 'api2', 'total_calls': 320, 'avg_response_time': 0.2, 'error_rate': 0.02},
                {'api_id': 'api3', 'total_calls': 280, 'avg_response_time': 0.5, 'error_rate': 0.07},
                {'api_id': 'api4', 'total_calls': 200, 'avg_response_time': 0.4, 'error_rate': 0.05}
            ]
            
            # Data for charts
            chart_data = {
                'dates': ["Mar 1", "Mar 2", "Mar 3", "Mar 4", "Mar 5", "Mar 6"],
                'api_calls': [180, 210, 195, 220, 240, 205],
                'success_calls': [170, 195, 190, 210, 225, 190],
                'error_calls': [10, 15, 5, 10, 15, 15]
            }
    except Exception as e:
        logger.error(f"Error fetching metrics data: {str(e)}")
        flash('Error loading metrics data. Please try again later.', 'danger')
        # Create empty data if error occurs
        daily_metrics = {'total_calls': 0, 'successful_calls': 0, 'failed_calls': 0, 'daily_data': {}}
        api_metrics = {}
        api_performance = []
        chart_data = {'dates': [], 'api_calls': [], 'success_calls': [], 'error_calls': []}
    
    return render_template(
        'admin/metrics.html', 
        active_page='admin_dashboard',
        daily_metrics=daily_metrics,
        api_metrics=api_metrics,
        api_performance=api_performance,
        dates=chart_data['dates'],
        api_calls=chart_data['api_calls'],
        success_calls=chart_data['success_calls'],
        error_calls=chart_data['error_calls'],
        days=days
    )

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

@auth.route('/admin/api-metrics/<string:api_id>')
@login_required
def api_metrics(api_id):
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to view API metrics.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
    
    # Get parameters
    days = request.args.get('period', 30, type=int)
    
    try:
        # Import metrics tracker
        from migrations.metrics_tracker import MetricsTracker
        
        # Get metrics specific to this API
        daily_metrics = MetricsTracker.get_daily_metrics(days, api_id)
        chart_data = MetricsTracker.get_chart_data(days, api_id)
        
        # Get API performance for this API
        api_performance_list = MetricsTracker.get_api_performance(days)
        api_performance = [p for p in api_performance_list if p['api_id'] == api_id]
        
        if not api_performance:
            # Create a default performance entry if none exists
            api_performance = [{
                'api_id': api_id,
                'total_calls': daily_metrics['total_calls'],
                'avg_response_time': 0.0,
                'error_rate': 0.0
            }]
        
        # Create API metrics dictionary
        api_metrics = {
            api_id: {
                'average_response_time': api_performance[0]['avg_response_time'],
                'calls': api_performance[0]['total_calls']
            }
        }
        
        # Create API detail object
        api_detail = {
            'api_id': api_id,
            'name': f'API {api_id}',
            'avg_response_time': api_performance[0]['avg_response_time'],
            'total_calls': api_performance[0]['total_calls'],
            'error_rate': api_performance[0]['error_rate'],
        }
        
        # If no data found, use mock data for display
        if not daily_metrics['daily_data']:
            logger.warning(f"No metrics data found for API {api_id}, using mock data")
            # Create mock data (same as before)
            daily_metrics = {
                'total_calls': 450,
                'successful_calls': 435,
                'failed_calls': 15,
                'daily_data': {
                    '2023-03-01': {'total_calls': 70, 'successful_calls': 68, 'failed_calls': 2},
                    '2023-03-02': {'total_calls': 85, 'successful_calls': 82, 'failed_calls': 3},
                    '2023-03-03': {'total_calls': 75, 'successful_calls': 72, 'failed_calls': 3},
                    '2023-03-04': {'total_calls': 80, 'successful_calls': 78, 'failed_calls': 2},
                    '2023-03-05': {'total_calls': 90, 'successful_calls': 87, 'failed_calls': 3},
                    '2023-03-06': {'total_calls': 50, 'successful_calls': 48, 'failed_calls': 2}
                }
            }
            
            # API detail
            api_detail = {
                'api_id': api_id,
                'name': f'API {api_id.capitalize()}',
                'avg_response_time': 0.3,
                'total_calls': 450,
                'error_rate': 0.033,
                'peak_time': '2-4 PM',
                'common_errors': ['400 Bad Request', '429 Too Many Requests']
            }
            
            # Data for charts
            chart_data = {
                'dates': ["Mar 1", "Mar 2", "Mar 3", "Mar 4", "Mar 5", "Mar 6"],
                'api_calls': [70, 85, 75, 80, 90, 50],
                'success_calls': [68, 82, 72, 78, 87, 48],
                'error_calls': [2, 3, 3, 2, 3, 2]
            }
    except Exception as e:
        logger.error(f"Error fetching metrics data for API {api_id}: {str(e)}")
        flash(f'Error loading metrics data for API {api_id}. Please try again later.', 'danger')
        # Create empty data if error occurs
        daily_metrics = {'total_calls': 0, 'successful_calls': 0, 'failed_calls': 0, 'daily_data': {}}
        api_metrics = {}
        api_performance = []
        chart_data = {'dates': [], 'api_calls': [], 'success_calls': [], 'error_calls': []}
        api_detail = {'api_id': api_id, 'name': f'API {api_id}', 'total_calls': 0, 'error_rate': 0, 'avg_response_time': 0}
    
    # For now, use the same metrics template with specific data
    flash(f'Viewing metrics for API {api_id}', 'info')
    return render_template(
        'admin/metrics.html',
        active_page='admin_dashboard',
        api=api_detail,
        daily_metrics=daily_metrics,
        api_metrics=api_metrics,
        api_performance=api_performance,
        dates=chart_data['dates'],
        api_calls=chart_data['api_calls'],
        success_calls=chart_data['success_calls'],
        error_calls=chart_data['error_calls'],
        days=days
    )
