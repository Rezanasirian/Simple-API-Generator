from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required, current_user
from app.models import db, User, APICall
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
import platform
import flask
import time
import sys
import os

dashboard = Blueprint('dashboard', __name__)

# Store application start time for uptime calculation
app_start_time = time.time()


@dashboard.route('/dashboard')
@login_required
def dashboard_view():
    """Render the dashboard page."""
    # Calculate metrics for display
    total_calls = db.session.query(func.count(APICall.id)).scalar() or 0

    # Get time period for 30-day calculations
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    # Calculate success rate
    success_calls = db.session.query(func.count(APICall.id)).filter(
        APICall.is_success == True,
        APICall.timestamp >= thirty_days_ago
    ).scalar() or 0

    total_recent_calls = db.session.query(func.count(APICall.id)).filter(
        APICall.timestamp >= thirty_days_ago
    ).scalar() or 0

    success_rate = round((success_calls / total_recent_calls) * 100 if total_recent_calls > 0 else 0)

    # Get active APIs count
    from app.services.APIQueryBuilder import APIQueryBuilder
    api_query_builder = APIQueryBuilder('config/ApiDoc.json')
    api_configurations = api_query_builder._load_json()
    active_apis = len(api_configurations)

    # Get total users count
    total_users = User.query.count()

    # Get recent errors
    recent_errors = APICall.query.filter(
        APICall.is_success == False,
        APICall.timestamp >= thirty_days_ago
    ).order_by(
        APICall.timestamp.desc()
    ).limit(10).all()

    # Get system information for admin view
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    flask_version = flask.__version__
    server_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Calculate uptime
    uptime_seconds = time.time() - app_start_time
    days, remainder = divmod(uptime_seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, seconds = divmod(remainder, 60)
    uptime = f"{int(days)}d {int(hours)}h {int(minutes)}m {int(seconds)}s"

    # Prepare data for API usage over time chart
    api_usage_data = get_api_usage_data(30)

    # Prepare data for top APIs chart
    top_apis_data = get_top_apis_data()

    # Prepare data for status codes chart
    status_codes_data = get_status_codes_data()

    # Prepare data for response time by API chart
    response_time_data = get_response_time_data()

    return render_template(
        'dashboard/dashboard.html',
        total_calls=total_calls,
        success_rate=success_rate,
        active_apis=active_apis,
        total_users=total_users,
        recent_errors=recent_errors,
        python_version=python_version,
        flask_version=flask_version,
        server_time=server_time,
        uptime=uptime,
        api_usage_data=api_usage_data,
        top_apis_data=top_apis_data,
        status_codes_data=status_codes_data,
        response_time_data=response_time_data
    )


@dashboard.route('/dashboard/api-usage-data')
@login_required
def api_usage_data_endpoint():
    """API endpoint to get usage data for a specific time period."""
    days = int(request.args.get('period', 30))
    data = get_api_usage_data(days)
    return jsonify(data)


def get_api_usage_data(days):
    """Get API usage data for the specified number of days."""
    start_date = datetime.utcnow() - timedelta(days=days)

    # Query successful and failed calls per day
    results = db.session.query(
        func.date(APICall.timestamp).label('date'),
        func.sum(APICall.is_success.cast(db.Integer)).label('successful'),
        func.count(APICall.id).label('total')
    ).filter(
        APICall.timestamp >= start_date
    ).group_by(
        func.date(APICall.timestamp)
    ).order_by(
        func.date(APICall.timestamp)
    ).all()

    # Transform the results into the format needed by Chart.js
    successful_data = []
    failed_data = []

    for row in results:
        # Check if date is already a string or a datetime object
        if isinstance(row.date, str):
            date_str = row.date
        else:
            date_str = row.date.isoformat()

        successful_data.append({'x': date_str, 'y': row.successful})
        failed_data.append({'x': date_str, 'y': row.total - row.successful})

    return {
        'successful': successful_data,
        'failed': failed_data
    }


def get_top_apis_data():
    """Get data for the top APIs by usage."""
    # Get counts for top 5 APIs
    results = db.session.query(
        APICall.api_id,
        func.count(APICall.id).label('count')
    ).group_by(
        APICall.api_id
    ).order_by(
        desc('count')
    ).limit(5).all()

    labels = [row.api_id for row in results]
    values = [row.count for row in results]

    return {
        'labels': labels,
        'values': values
    }


def get_status_codes_data():
    """Get data for status code distribution."""
    # Group status codes into categories
    results = db.session.query(
        func.floor(APICall.status_code / 100).label('status_group'),
        func.count(APICall.id).label('count')
    ).group_by(
        'status_group'
    ).order_by(
        'status_group'
    ).all()

    # Map status code groups to labels
    status_labels = {
        2: '2xx (Success)',
        3: '3xx (Redirection)',
        4: '4xx (Client Error)',
        5: '5xx (Server Error)'
    }

    labels = []
    values = []

    for row in results:
        status_group = int(row.status_group)
        label = status_labels.get(status_group, f'{status_group}xx (Unknown)')
        labels.append(label)
        values.append(row.count)

    return {
        'labels': labels,
        'values': values
    }


def get_response_time_data():
    """Get average response time data by API."""
    # Get top 10 APIs by average response time
    results = db.session.query(
        APICall.api_id,
        func.avg(APICall.response_time).label('avg_time')
    ).group_by(
        APICall.api_id
    ).order_by(
        desc('avg_time')
    ).limit(10).all()

    labels = [row.api_id for row in results]
    # Convert to milliseconds and round
    values = [round(row.avg_time * 1000) for row in results]

    return {
        'labels': labels,
        'values': values
    }