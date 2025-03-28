from flask import Flask, g, request
from flask_login import LoginManager
from flask_migrate import Migrate
from app.models import db, User

from app.api.routes.API_Generator import create_api_blueprint
from app.api.routes.apiPage import API_ApiList
from app.api.routes.api_docs import api_docs_bp
from app.dashboard import dashboard
from app.services.APIQueryBuilder import APIQueryBuilder
from app.auth import auth as auth_blueprint
from app.admin import admin as admin_blueprint
# from app.main import main as main_blueprint
from app.services.user_manager import UserManager
from migrations.metrics_tracker import MetricsTracker
from app.services.logger import setup_logging
import time
import os

# Setup logging
logger = setup_logging()

# Initialize metrics tracker
metrics_tracker = MetricsTracker()

# Initialize login manager
login_manager = LoginManager()


def create_app(config=None):
    """Create Flask application instance with the specified configuration."""
    app = Flask(__name__)

    # Set default configuration
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev_key_change_in_production'),
        ALLOW_REGISTRATION=os.environ.get('ALLOW_REGISTRATION', 'False').lower() == 'true',
        API_KEYS={},
        LOG_LEVEL=os.environ.get('LOG_LEVEL', 'INFO'),
        SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL', 'sqlite:///app.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False
    )

    # Load additional configuration if provided
    if config:
        app.config.from_mapping(config)

    # Initialize database
    db.init_app(app)
    migrate = Migrate(app, db)

    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
        # Create default admin user if it doesn't exist
        user_manager = UserManager()
        user_manager._create_default_admin()

    # Initialize LoginManager
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'

    # User loader callback
    @login_manager.user_loader
    def load_user(user_id):
        """Load user by ID for Flask-Login"""
        return User.query.get(int(user_id))

    # Register blueprints
    app.register_blueprint(API_ApiList, url_prefix='/api')
    # app.register_blueprint(API_test_api_np, url_prefix='/api')

    # Register API documentation blueprint
    app.register_blueprint(api_docs_bp, url_prefix='/api')

    # Register request builder blueprint
    # app.register_blueprint(request_builder_bp, url_prefix='/api/request-builder')

    # Register dashboard blueprint
    app.register_blueprint(dashboard)

    # Register auth, admin, and main blueprints if enabled
    app.register_blueprint(auth_blueprint)
    app.register_blueprint(admin_blueprint)

    # Load database configuration for connection string
    from config.database import DatabaseConfig
    db_config = DatabaseConfig.get_config()
    app.config['SQLALCHEMY_DATABASE_URI'] = db_config['uri']

    # Dynamically register API blueprints based on configuration
    api = APIQueryBuilder('config/ApiDoc.json')
    api_configurations = api._load_json()
    for api_name, config in api_configurations.items():
        bp = create_api_blueprint(api_name, config)
        app.register_blueprint(bp, url_prefix='/api')

    # Create main blueprint for index page
    from flask import Blueprint, redirect, url_for
    main = Blueprint('main', __name__)

    @main.route('/')
    def index():
        return redirect(url_for('dashboard.dashboard_view'))

    app.register_blueprint(main)

    # Middleware for metrics tracking
    @app.before_request
    def before_request():
        # Store start time for performance tracking
        g.start_time = time.time()

        # Skip metrics for static files
        if request.path.startswith('/static'):
            return

        # Get API ID from path
        path_parts = request.path.strip('/').split('/')
        if len(path_parts) >= 2 and path_parts[0] == 'api':
            g.api_id = path_parts[1]
        else:
            g.api_id = 'unknown'

        # Set user ID for metrics tracking (if available)
        from flask_login import current_user
        if current_user.is_authenticated:
            g.metrics_user_id = current_user.id

        # Mark that we need to track this request
        g.metrics_tracking = True

    @app.after_request
    def after_request(response):
        # Skip metrics for static files
        if request.path.startswith('/static'):
            return response

        # Complete metrics tracking
        if hasattr(g, 'metrics_tracking'):
            success = response.status_code < 400
            error = None

            if not success:
                error = f"HTTP {response.status_code}: {response.data.decode('utf-8', errors='replace')[:200]}"

            # Use track_api_call directly instead of complete_api_call
            metrics_tracker.track_api_call(
                api_id=getattr(g, 'api_id', 'unknown'),
                user_id=getattr(g, 'metrics_user_id', None),
                status_code=response.status_code,
                response_time=time.time() - getattr(g, 'start_time', time.time()),
                endpoint=request.path,
                method=request.method,
                is_success=success,
                error_message=error
            )

        return response

    return app


def register_error_handlers(app):
    """Register error handlers for common HTTP errors."""

    @app.errorhandler(404)
    def not_found_error(error):
        return {'error': 'Not Found', 'message': 'The requested URL was not found on the server.'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal Server Error', 'message': 'The server encountered an internal error.'}, 500

    @app.errorhandler(405)
    def method_not_allowed(error):
        return {'error': 'Method Not Allowed', 'message': 'The method is not allowed for the requested URL.'}, 405
