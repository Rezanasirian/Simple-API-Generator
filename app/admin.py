from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify, send_file
from flask_login import login_required, current_user
from werkzeug.security import generate_password_hash
from app.models import db, User
from app.forms import RegistrationForm
from app.services.user_manager import UserManager
from app.config.database import DatabaseConfig
import os
import json
import tempfile
import datetime
import shutil
from werkzeug.utils import secure_filename

admin = Blueprint('admin', __name__)

@admin.route('/admin')
@login_required
def admin_home():
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to view this page.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
        
    return redirect(url_for('auth.admin_dashboard'))

@admin.route('/admin/dashboard')
@login_required
def admin_dashboard():
    if current_user.role != 'admin':
        flash('Access denied. You need administrator privileges to view this page.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
        
    user_count = User.query.count()
    admins = User.query.filter_by(role='admin').count()
    return render_template('admin_dashboard.html', user_count=user_count, admins=admins)

@admin.route('/admin/database', methods=['GET'])
@login_required
def database_settings():
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to manage database settings.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
        
    # Get current database configuration
    config = DatabaseConfig.get_config()
    
    # Get available database types
    db_types = DatabaseConfig.get_database_types()
    
    # Get available backups
    backups = get_backups()
    
    return render_template('admin/database_settings.html', 
                          config=config, 
                          db_types=db_types,
                          backups=backups,
                          active_page='admin_database')

@admin.route('/admin/database/save', methods=['POST'])
@login_required
def save_database_settings():
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to manage database settings.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
    
    # Get form data
    db_type = request.form.get('db_type')
    
    # Create config dictionary
    config = {
        'db_type': db_type
    }
    
    # Add type-specific configuration
    if db_type == 'sqlite':
        config['sqlite_path'] = request.form.get('sqlite_path')
    elif db_type == 'mongodb':
        # If we're using the advanced MongoDB URI
        if request.form.get('mongo_uri'):
            config['mongo_uri'] = request.form.get('mongo_uri')
        
        # Add other MongoDB settings
        config['host'] = request.form.get('host')
        config['port'] = request.form.get('port')
        config['db_name'] = request.form.get('db_name')
        config['user'] = request.form.get('user')
        config['password'] = request.form.get('password')
        config['mongo_auth_source'] = request.form.get('mongo_auth_source')
        config['mongo_auth_mechanism'] = request.form.get('mongo_auth_mechanism')
    else:
        # SQL databases
        config['host'] = request.form.get('host')
        config['port'] = request.form.get('port')
        config['user'] = request.form.get('user')
        config['password'] = request.form.get('password')
        config['db_name'] = request.form.get('db_name')
    
    # Save configuration
    if DatabaseConfig.save_config(config):
        flash('Database configuration saved successfully. Application restart required for changes to take effect.', 'success')
    else:
        flash('Failed to save database configuration.', 'danger')
    
    return redirect(url_for('admin.database_settings'))

@admin.route('/admin/database/test', methods=['POST'])
@login_required
def test_database_connection():
    # Check if user is admin
    if not current_user.is_admin:
        return jsonify({'success': False, 'error': 'Access denied'})
    
    # Get form data
    db_type = request.form.get('db_type')
    
    # Create config dictionary based on db_type
    config = {
        'db_type': db_type
    }
    
    # Add type-specific configuration
    if db_type == 'sqlite':
        sqlite_path = request.form.get('sqlite_path')
        config['sqlite_path'] = sqlite_path
        
        # Test SQLite connection
        try:
            import sqlite3
            conn = sqlite3.connect(sqlite_path)
            conn.close()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})
            
    elif db_type == 'mongodb':
        # Check if we're using the URI directly
        mongo_uri = request.form.get('mongo_uri')
        if mongo_uri:
            # Test MongoDB connection with URI
            try:
                from pymongo import MongoClient
                client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
                client.server_info()  # Will raise an exception if connection fails
                client.close()
                return jsonify({'success': True})
            except Exception as e:
                return jsonify({'success': False, 'error': str(e)})
        
        # Otherwise build connection from parameters
        host = request.form.get('host')
        port = request.form.get('port')
        db_name = request.form.get('db_name')
        user = request.form.get('user')
        password = request.form.get('password')
        auth_source = request.form.get('mongo_auth_source')
        auth_mechanism = request.form.get('mongo_auth_mechanism')
        
        # Test MongoDB connection with parameters
        try:
            from pymongo import MongoClient
            
            if user and password:
                client = MongoClient(
                    host=host,
                    port=int(port),
                    username=user,
                    password=password,
                    authSource=auth_source,
                    authMechanism=auth_mechanism,
                    serverSelectionTimeoutMS=5000
                )
            else:
                client = MongoClient(
                    host=host,
                    port=int(port),
                    serverSelectionTimeoutMS=5000
                )
                
            client.server_info()  # Will raise an exception if connection fails
            client.close()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})
    else:
        # SQL databases
        host = request.form.get('host')
        port = request.form.get('port')
        user = request.form.get('user')
        password = request.form.get('password')
        db_name = request.form.get('db_name')
        
        # Create connection URI
        uri = DatabaseConfig.get_database_uri(
            db_type=db_type,
            host=host,
            port=port,
            user=user,
            password=password,
            db_name=db_name
        )
        
        # Test SQL connection
        try:
            from sqlalchemy import create_engine
            engine = create_engine(uri)
            connection = engine.connect()
            connection.close()
            engine.dispose()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})

@admin.route('/admin/database/migrate', methods=['POST'])
@login_required
def migrate_database():
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to migrate databases.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
    
    # This would be implemented based on your specific migration needs
    # For example, you might want to use a library like SQLAlchemy-Migrate or Alembic
    flash('Database migration functionality is not implemented yet.', 'info')
    return redirect(url_for('admin.database_settings'))

@admin.route('/admin/database/backup', methods=['POST'])
@login_required
def backup_database():
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to backup the database.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
    
    # Get database configuration
    config = DatabaseConfig.get_config()
    description = request.form.get('backup_description', '')
    include_config = 'include_config' in request.form
    
    try:
        # Create backup directory if it doesn't exist
        backup_dir = os.path.join(os.getcwd(), 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        # Generate backup filename
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"db_backup_{config['db_type']}_{timestamp}.zip"
        backup_path = os.path.join(backup_dir, backup_filename)
        
        # Create temporary directory for backup files
        with tempfile.TemporaryDirectory() as temp_dir:
            # Backup database based on type
            if config['db_type'] == 'sqlite':
                # For SQLite, just copy the file
                sqlite_path = config['sqlite_path']
                if os.path.exists(sqlite_path):
                    shutil.copy2(sqlite_path, os.path.join(temp_dir, os.path.basename(sqlite_path)))
                else:
                    flash('SQLite database file not found.', 'danger')
                    return redirect(url_for('admin.database_settings'))
            else:
                # TODO: Implement backup for other database types
                # This would involve using database-specific tools like mysqldump, pg_dump, etc.
                flash(f'Backup for {config["db_type"]} is not implemented yet.', 'warning')
                return redirect(url_for('admin.database_settings'))
            
            # Include config files if requested
            if include_config:
                config_dir = os.path.join(temp_dir, 'config')
                os.makedirs(config_dir, exist_ok=True)
                
                # Copy config files
                if os.path.exists('config/db_config.json'):
                    shutil.copy2('config/db_config.json', os.path.join(config_dir, 'db_config.json'))
                
                # Save backup metadata
                metadata = {
                    'description': description,
                    'date': datetime.datetime.now().isoformat(),
                    'db_type': config['db_type']
                }
                
                with open(os.path.join(temp_dir, 'backup_metadata.json'), 'w') as f:
                    json.dump(metadata, f)
            
            # Create zip archive
            shutil.make_archive(backup_path[:-4], 'zip', temp_dir)
        
        flash('Database backup created successfully.', 'success')
    except Exception as e:
        flash(f'Error creating backup: {str(e)}', 'danger')
    
    return redirect(url_for('admin.database_settings'))

@admin.route('/admin/database/restore', methods=['POST'])
@login_required
def restore_database():
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to restore the database.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
    
    backup_file = request.form.get('backup_file')
    if not backup_file:
        flash('No backup file selected.', 'danger')
        return redirect(url_for('admin.database_settings'))
    
    # Validate backup file
    backup_path = os.path.join(os.getcwd(), 'backups', secure_filename(backup_file))
    if not os.path.exists(backup_path):
        flash('Backup file not found.', 'danger')
        return redirect(url_for('admin.database_settings'))
    
    # TODO: Implement database restore
    flash('Database restore functionality is not implemented yet.', 'info')
    return redirect(url_for('admin.database_settings'))

@admin.route('/admin/database/backup/download/<filename>')
@login_required
def download_backup(filename):
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to download backups.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
    
    # Validate filename
    backup_path = os.path.join(os.getcwd(), 'backups', secure_filename(filename))
    if not os.path.exists(backup_path):
        flash('Backup file not found.', 'danger')
        return redirect(url_for('admin.database_settings'))
    
    return send_file(backup_path, as_attachment=True)

@admin.route('/admin/database/backup/delete', methods=['POST'])
@login_required
def delete_backup():
    # Check if user is admin
    if not current_user.is_admin:
        flash('Access denied. You need administrator privileges to delete backups.', 'danger')
        return redirect(url_for('API_ApiList.apiList'))
    
    backup_file = request.form.get('backup_file')
    if not backup_file:
        flash('No backup file specified.', 'danger')
        return redirect(url_for('admin.database_settings'))
    
    # Validate backup file
    backup_path = os.path.join(os.getcwd(), 'backups', secure_filename(backup_file))
    if not os.path.exists(backup_path):
        flash('Backup file not found.', 'danger')
        return redirect(url_for('admin.database_settings'))
    
    try:
        os.remove(backup_path)
        flash('Backup deleted successfully.', 'success')
    except Exception as e:
        flash(f'Error deleting backup: {str(e)}', 'danger')
    
    return redirect(url_for('admin.database_settings'))

def get_backups():
    """Get a list of available database backups"""
    backup_dir = os.path.join(os.getcwd(), 'backups')
    if not os.path.exists(backup_dir):
        return []
    
    backups = []
    for filename in os.listdir(backup_dir):
        if filename.startswith('db_backup_') and filename.endswith('.zip'):
            backup_path = os.path.join(backup_dir, filename)
            
            # Extract metadata if possible
            try:
                import zipfile
                with zipfile.ZipFile(backup_path, 'r') as zip_ref:
                    if 'backup_metadata.json' in zip_ref.namelist():
                        with zip_ref.open('backup_metadata.json') as f:
                            metadata = json.load(f)
                            
                            # Format date for display
                            date_str = metadata.get('date', '')
                            if date_str:
                                try:
                                    date_obj = datetime.datetime.fromisoformat(date_str)
                                    date_str = date_obj.strftime('%Y-%m-%d %H:%M:%S')
                                except:
                                    pass
                            
                            backups.append({
                                'filename': filename,
                                'date': date_str,
                                'description': metadata.get('description', ''),
                                'db_type': metadata.get('db_type', 'unknown'),
                                'size': f"{os.path.getsize(backup_path) / (1024 * 1024):.2f} MB"
                            })
                    else:
                        # If no metadata, use file stats
                        file_date = datetime.datetime.fromtimestamp(os.path.getmtime(backup_path))
                        
                        # Try to extract db_type from filename
                        parts = filename.split('_')
                        db_type = parts[2] if len(parts) > 2 else 'unknown'
                        
                        backups.append({
                            'filename': filename,
                            'date': file_date.strftime('%Y-%m-%d %H:%M:%S'),
                            'description': '',
                            'db_type': db_type,
                            'size': f"{os.path.getsize(backup_path) / (1024 * 1024):.2f} MB"
                        })
            except Exception as e:
                # If there's an error reading the zip, just use file stats
                file_date = datetime.datetime.fromtimestamp(os.path.getmtime(backup_path))
                backups.append({
                    'filename': filename,
                    'date': file_date.strftime('%Y-%m-%d %H:%M:%S'),
                    'description': f'Error reading metadata: {str(e)}',
                    'db_type': 'unknown',
                    'size': f"{os.path.getsize(backup_path) / (1024 * 1024):.2f} MB"
                })
    
    # Sort backups by date (newest first)
    backups.sort(key=lambda x: x['date'], reverse=True)
    
    return backups

@admin.route('/admin/register', methods=['GET', 'POST'])
@login_required
def admin_register():
    if current_user.role != 'admin':
        flash('Access denied!', 'danger')
        return redirect(url_for('main.dashboard'))
    form = RegistrationForm()
    if form.validate_on_submit():
        hashed_password = generate_password_hash(form.password.data, method='sha256')
        new_user = User(username=form.username.data, password=hashed_password, role=form.role.data)
        db.session.add(new_user)
        db.session.commit()
        flash('User created successfully!', 'success')
        return redirect(url_for('admin.admin_dashboard'))
    return render_template('admin_register.html', form=form)

@admin.route('/admin/delete/<int:user_id>')
@login_required
def delete_user(user_id):
    if current_user.role != 'admin':
        flash('Access denied!', 'danger')
        return redirect(url_for('main.dashboard'))
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    flash('User deleted successfully!', 'success')
    return redirect(url_for('admin.admin_dashboard'))
