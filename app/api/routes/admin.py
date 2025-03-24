from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify
from app.middleware.auth import admin_required
from app.services.user_manager import UserManager
from app.services.metrics_tracker import MetricsTracker
from app.services.logger import setup_logging
import json

Admin = Blueprint('admin', __name__, url_prefix='/admin')
logger = setup_logging()
user_manager = UserManager()
metrics_tracker = MetricsTracker()

@Admin.route('/')
@admin_required
def index():
    """Admin dashboard homepage"""
    # Get overall metrics
    daily_metrics = metrics_tracker.get_daily_usage_metrics(days=30)
    api_metrics = metrics_tracker.get_all_api_metrics(days=30)
    
    # Get total user count
    total_users = len(user_manager.get_all_users())
    
    # Get active APIs
    active_apis = len(api_metrics)
    
    # Calculate statistics
    total_calls = daily_metrics.get('total_calls', 0)
    error_rate = 0
    if total_calls > 0:
        error_rate = daily_metrics.get('failed_calls', 0) / total_calls
    
    # Get recent error logs (last 10)
    recent_errors = []
    for api_id, api_data in metrics_tracker.metrics.get('errors', {}).items():
        for date, date_data in api_data.items():
            for error in date_data.get('details', [])[:10]:
                error_info = {
                    'api_id': api_id,
                    'timestamp': error.get('timestamp'),
                    'error': error.get('error')
                }
                recent_errors.append(error_info)
    
    # Sort by timestamp, most recent first
    recent_errors.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    recent_errors = recent_errors[:10]  # Get top 10 errors
    
    return render_template('admin/dashboard.html', 
                           total_users=total_users,
                           active_apis=active_apis,
                           total_calls=total_calls,
                           error_rate=error_rate,
                           recent_errors=recent_errors,
                           daily_metrics=daily_metrics)

@Admin.route('/users')
@admin_required
def users():
    """Admin user management page"""
    users_list = user_manager.get_all_users()
    return render_template('admin/users.html', users=users_list)

@Admin.route('/users/create', methods=['GET', 'POST'])
@admin_required
def create_user():
    """Create a new user"""
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        role = request.form.get('role', 'user')
        
        # Validate form data
        if not all([username, email, password]):
            flash('Username, email, and password are required.', 'warning')
            return render_template('admin/create_user.html')
        
        try:
            user = user_manager.create_user(username, email, password, role)
            logger.info(f"Admin created new user: {username} with role: {role}")
            flash(f'User {username} created successfully.', 'success')
            return redirect(url_for('admin.users'))
        except ValueError as e:
            flash(str(e), 'danger')
    
    return render_template('admin/create_user.html')

@Admin.route('/users/<user_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_user(user_id):
    """Edit a user"""
    user = user_manager.get_user_by_id(user_id)
    if not user:
        flash('User not found.', 'danger')
        return redirect(url_for('admin.users'))
    
    if request.method == 'POST':
        data = {}
        
        username = request.form.get('username')
        if username:
            data['username'] = username
            
        email = request.form.get('email')
        if email:
            data['email'] = email
            
        role = request.form.get('role')
        if role:
            data['role'] = role
            
        is_active = 'is_active' in request.form
        data['is_active'] = is_active
        
        password = request.form.get('password')
        if password:
            data['password'] = password
        
        try:
            user = user_manager.update_user(user_id, data)
            logger.info(f"Admin updated user: {user.username}")
            flash(f'User {user.username} updated successfully.', 'success')
            return redirect(url_for('admin.users'))
        except ValueError as e:
            flash(str(e), 'danger')
    
    # Get user metrics
    user_metrics = metrics_tracker.get_user_metrics(user_id, days=30)
    
    return render_template('admin/edit_user.html', user=user, metrics=user_metrics)

@Admin.route('/users/<user_id>/delete', methods=['POST'])
@admin_required
def delete_user(user_id):
    """Delete a user"""
    user = user_manager.get_user_by_id(user_id)
    if not user:
        flash('User not found.', 'danger')
        return redirect(url_for('admin.users'))
    
    try:
        username = user.username
        user_manager.delete_user(user_id)
        logger.info(f"Admin deleted user: {username}")
        flash(f'User {username} deleted successfully.', 'success')
    except ValueError as e:
        flash(str(e), 'danger')
    
    return redirect(url_for('admin.users'))

@Admin.route('/metrics')
@admin_required
def metrics():
    """Admin metrics dashboard"""
    # Get period parameter (default: 30 days)
    period = request.args.get('period', '30')
    try:
        days = int(period)
    except ValueError:
        days = 30
    
    # Get overall metrics
    daily_metrics = metrics_tracker.get_daily_usage_metrics(days=days)
    api_metrics = metrics_tracker.get_all_api_metrics(days=days)
    
    # Prepare data for charts
    dates = sorted(daily_metrics.get('daily_data', {}).keys())
    api_calls = []
    success_calls = []
    error_calls = []
    
    for date in dates:
        data = daily_metrics.get('daily_data', {}).get(date, {})
        api_calls.append(data.get('total_calls', 0))
        success_calls.append(data.get('successful_calls', 0))
        error_calls.append(data.get('failed_calls', 0))
    
    # Prepare API performance data
    api_performance = []
    for api_id, metrics_data in api_metrics.items():
        api_performance.append({
            'api_id': api_id,
            'total_calls': metrics_data.get('total_calls', 0),
            'avg_response_time': metrics_data.get('average_response_time', 0),
            'error_rate': metrics_data.get('error_rate', 0)
        })
    
    # Sort by total calls (descending)
    api_performance.sort(key=lambda x: x['total_calls'], reverse=True)
    
    return render_template('admin/metrics.html', 
                           days=days,
                           api_metrics=api_metrics,
                           daily_metrics=daily_metrics,
                           dates=json.dumps(dates),
                           api_calls=json.dumps(api_calls),
                           success_calls=json.dumps(success_calls),
                           error_calls=json.dumps(error_calls),
                           api_performance=api_performance)

@Admin.route('/metrics/api/<api_id>')
@admin_required
def api_metrics(api_id):
    """View metrics for a specific API"""
    # Get period parameter (default: 30 days)
    period = request.args.get('period', '30')
    try:
        days = int(period)
    except ValueError:
        days = 30
    
    # Get API metrics
    api_metrics = metrics_tracker.get_api_metrics(api_id, days=days)
    
    # Check if API exists
    if api_metrics.get('total_calls', None) is None:
        flash(f"API '{api_id}' not found or has no metrics.", 'warning')
        return redirect(url_for('admin.metrics'))
    
    # Prepare data for charts
    dates = sorted(api_metrics.get('daily_calls', {}).keys())
    calls = []
    response_times = []
    
    for date in dates:
        calls.append(api_metrics.get('daily_calls', {}).get(date, 0))
        response_times.append(api_metrics.get('daily_response_times', {}).get(date, 0))
    
    # Get error details
    error_details = []
    for date, date_data in metrics_tracker.metrics.get('errors', {}).get(api_id, {}).items():
        for error in date_data.get('details', []):
            error_info = {
                'timestamp': error.get('timestamp'),
                'error': error.get('error')
            }
            error_details.append(error_info)
    
    # Sort by timestamp, most recent first
    error_details.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    return render_template('admin/api_metrics.html',
                           api_id=api_id,
                           days=days,
                           metrics=api_metrics,
                           dates=json.dumps(dates),
                           calls=json.dumps(calls),
                           response_times=json.dumps(response_times),
                           error_details=error_details)

@Admin.route('/settings')
@admin_required
def settings():
    """Admin settings page"""
    return render_template('admin/settings.html')

@Admin.route('/logs')
@admin_required
def logs():
    """View application logs"""
    # This is a simple implementation - in a real app, you'd want more robust log viewing
    log_file = 'logs/app.log'
    
    try:
        with open(log_file, 'r') as f:
            log_content = f.readlines()
        
        # Show most recent logs first (last 100 lines)
        log_content.reverse()
        log_content = log_content[:100]
    except Exception as e:
        log_content = [f"Error reading log file: {str(e)}"]
    
    return render_template('admin/logs.html', logs=log_content) 