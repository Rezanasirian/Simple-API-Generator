from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app.services.APIQueryBuilder import APIQueryBuilder
from app.services.logger import setup_logging
from app.services.database import query_executor, DatabaseConnectionError
from app.services.connection_configs import DatabaseType
from config.database import DatabaseConfig
import json
import traceback
from typing import Dict, Any, List, Optional, Union
import os

API_ApiList = Blueprint('API_ApiList', __name__)
logger = setup_logging()

@API_ApiList.route('/apiList')
@login_required
def apiList():
    """
    Render the API list page with all available APIs.
    
    Returns:
        Rendered template with API list and database information
    """
    try:
        request_id = id(request)
        # Add cache-control headers to prevent duplicate requests
        response = None
        
        api = APIQueryBuilder('config/ApiDoc.json')
        api_list = api.API_list()

        api_configs = {}
        
        for api_name in api_list:
            config = api.get_api_prop(api_name)
            # Format the API configuration for the frontend - handle all potential structures
            
            # First prepare the database information
            db_info = {
                'type': '',
                'name': '',
                'table': ''
            }
            
            # Handle different potential database structures
            if 'database' in config and isinstance(config['database'], dict):
                db_info.update({
                    'type': config['database'].get('type', ''),
                    'name': config['database'].get('name', ''),
                    'table': config['database'].get('table', '')
                })
            
            # Legacy or alternative field names
            if 'TableName' in config and not db_info['table']:
                db_info['table'] = config['TableName']
                
            if 'DatabaseType' in config and not db_info['type']:
                db_info['type'] = config['DatabaseType']
            
            # Build the complete API config
            api_configs[api_name] = {
                'name': config.get('name', api_name),
                'displayName': config.get('displayName', config.get('name', api_name)),
                'version': config.get('version', '1.0.0'),
                'description': config.get('description', ''),
                'database': db_info,
                'LastUpdateTableName': config.get('LastUpdateTableName', '')
            }
            
            logger.info(f"API {api_name} config: {list(api_configs[api_name].keys())}")
        
        # # Debug print of actual data
        # logger.info(f"API List Data Type: {type(api_list)}")
        # logger.info(f"API Configs Data Type: {type(api_configs)}")
        
        # Ensure we have valid data
        if not api_list:
            api_list = []
        if not api_configs:
            api_configs = {}
            
        # Get current database configuration
        db_config = DatabaseConfig.get_config()
        db_types = DatabaseConfig.get_database_types()
            
        logger.info(f"Rendering template with {len(api_list)} APIs - Request ID: {request_id}")
        
        # Create response and add cache control headers
        response = render_template("api/apiList.html",
                                  api_list=api_list,
                                  api_configs=api_configs,
                                  db_config=db_config,
                                  db_types=db_types,
                                  active_page='api_list')
        return response
    except Exception as e:
        logger.error(f"Error in apiList route: {e}", exc_info=True)
        return render_template("shared/error.html", error=str(e))

@API_ApiList.route('/api_details', methods=['GET'])
def get_api_details():
    """
    Get details for all APIs.
    
    Returns:
        JSON response with API details
    """
    try:
        request_id = id(request)

        # Create response with cache headers
        from flask import make_response
        
        api = APIQueryBuilder('config/ApiDoc.json')
        api_configs = api._load_json()

        # Format API details for frontend
        formatted_apis = []
        for api_id, config in api_configs.items():
            # First prepare the database information
            db_info = {
                'type': '',
                'name': '',
                'table': ''
            }
            
            # Handle different potential database structures
            if 'database' in config and isinstance(config['database'], dict):
                db_info.update({
                    'type': config['database'].get('type', ''),
                    'name': config['database'].get('name', ''),
                    'table': config['database'].get('table', '')
                })
            
            # Legacy or alternative field names
            if 'TableName' in config and not db_info['table']:
                db_info['table'] = config['TableName']
                
            if 'DatabaseType' in config and not db_info['type']:
                db_info['type'] = config['DatabaseType']
                
            formatted_apis.append({
                'id': api_id,
                'name': config.get('name', api_id),
                'displayName': config.get('displayName', config.get('name', api_id)),
                'description': config.get('description', ''),
                'version': config.get('version', '1.0.0'),
                'database': db_info,
                'lastUpdateTable': config.get('LastUpdateTableName', '')
            })
        
        logger.info(f"Returning {len(formatted_apis)} formatted APIs - Request ID: {request_id}")
        
        # Create response with cache control headers
        response = make_response(jsonify(formatted_apis))
        # response.headers['Cache-Control'] = 'private, max-age=300'  # Cache for 5 minutes
        return response
    except Exception as e:
        logger.error(f"Error getting API details: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@API_ApiList.route('/api_details/<api_id>', methods=['GET'])
def get_single_api_detail(api_id: str):
    """
    Get details for a specific API.
    
    Args:
        api_id: ID of the API to retrieve
        
    Returns:
        JSON response with API details
    """
    try:
        api = APIQueryBuilder('config/ApiDoc.json')
        api_configs = api._load_json()
        
        if api_id not in api_configs:
            return jsonify({'error': f"API '{api_id}' not found"}), 404
        
        return jsonify(api_configs[api_id])
    except Exception as e:
        logger.error(f"Error getting API details for {api_id}: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@API_ApiList.route('/update_api', methods=['POST'])
def update_api():
    """
    Update or create an API configuration.
    
    Returns:
        JSON response with success status
    """
    try:
        api_data = request.get_json()
        
        if not api_data or 'id' not in api_data:
            return jsonify({'success': False, 'error': 'Invalid API data'}), 400
        
        api_id = api_data.get('id')
        
        api = APIQueryBuilder('config/ApiDoc.json')
        
        # Check if API exists
        api_configs = api._load_json()
        
        if api_id in api_configs:
            # Update existing API
            api.update_api(api_id, api_data)
            logger.info(f"Updated API {api_id}")
        else:
            # Create new API
            api.add_api(api_id, api_data)
            logger.info(f"Created API {api_id}")
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error updating API: {e}", exc_info=True)
        return jsonify({
            'success': False, 
            'error': str(e),
            'trace': traceback.format_exc()
        }), 500


@API_ApiList.route('/delete_api/<api_id>', methods=['DELETE'])
def delete_api(api_id: str):
    """
    Delete an API configuration.
    
    Args:
        api_id: ID of the API to delete
        
    Returns:
        JSON response with success status
    """
    try:
        api = APIQueryBuilder('config/ApiDoc.json')
        
        # Check if API exists
        api_configs = api._load_json()
        
        if api_id not in api_configs:
            return jsonify({'success': False, 'error': f"API '{api_id}' not found"}), 404
        
        # Delete API
        del api_configs[api_id]
        api._save_json(api_configs)
        
        logger.info(f"Deleted API {api_id}")
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error deleting API {api_id}: {e}", exc_info=True)
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500


@API_ApiList.route('/get_database_tables/<db_type>', methods=['GET'])
def get_database_tables(db_type: str):
    """
    Get list of tables/collections for a specific database type.
    
    Args:
        db_type: Type of database (mongodb, mysql, trino)
        
    Returns:
        JSON response with list of tables
    """
    try:
        database_name = request.args.get('database', '')
        
        if not database_name:
            return jsonify({'error': 'Database name required'}), 400
            
        if db_type == 'mongodb':
            # Connect to MongoDB and get collections
            try:
                collections = query_executor.mongo_db.get_database(database_name).list_collection_names()
                return jsonify(collections)
            except Exception as e:
                logger.error(f"Error getting MongoDB collections: {e}", exc_info=True)
                return jsonify({'error': f"Error connecting to MongoDB: {str(e)}"}), 500
                
        elif db_type == 'mysql':
            # Connect to MySQL and get tables
            try:
                query = f"SHOW TABLES FROM {database_name}"
                results = query_executor.execute_query(query)
                tables = [row[0] for row in results]
                return jsonify(tables)
            except Exception as e:
                logger.error(f"Error getting MySQL tables: {e}", exc_info=True)
                return jsonify({'error': f"Error connecting to MySQL: {str(e)}"}), 500
                
        elif db_type == 'trino':
            # Connect to Trino and get tables
            try:
                catalog = request.args.get('catalog', 'hive')
                schema = request.args.get('schema', database_name)
                query = f"SHOW TABLES FROM {catalog}.{schema}"
                results = query_executor.execute_query(query)
                tables = [row[0] for row in results]
                return jsonify(tables)
            except Exception as e:
                logger.error(f"Error getting Trino tables: {e}", exc_info=True)
                return jsonify({'error': f"Error connecting to Trino: {str(e)}"}), 500
                
        else:
            return jsonify({'error': f"Unsupported database type: {db_type}"}), 400
            
    except Exception as e:
        logger.error(f"Error getting database tables: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@API_ApiList.route('/get_table_columns', methods=['GET'])
def get_table_columns():
    """
    Get columns for a specific table.
    
    Returns:
        JSON response with list of columns
    """
    try:
        db_type = request.args.get('db_type', '')
        database = request.args.get('database', '')
        table = request.args.get('table', '')
        
        if not all([db_type, database, table]):
            return jsonify({'error': 'Missing required parameters'}), 400
            
        if db_type == 'mongodb':
            # Get sample document from MongoDB collection to determine fields
            try:
                collection = query_executor.mongo_db.get_database(database).get_collection(table)
                sample = collection.find_one()
                
                if not sample:
                    return jsonify([])
                    
                columns = list(sample.keys())
                # Remove MongoDB internal _id field
                if '_id' in columns:
                    columns.remove('_id')
                    
                return jsonify(columns)
            except Exception as e:
                logger.error(f"Error getting MongoDB fields: {e}", exc_info=True)
                return jsonify({'error': f"Error getting MongoDB fields: {str(e)}"}), 500
                
        elif db_type == 'mysql':
            # Get columns from MySQL table
            try:
                query = f"SHOW COLUMNS FROM {database}.{table}"
                results = query_executor.execute_query(query)
                columns = [row[0] for row in results]
                return jsonify(columns)
            except Exception as e:
                logger.error(f"Error getting MySQL columns: {e}", exc_info=True)
                return jsonify({'error': f"Error getting MySQL columns: {str(e)}"}), 500
                
        elif db_type == 'trino':
            # Get columns from Trino table
            try:
                catalog = request.args.get('catalog', 'hive')
                schema = request.args.get('schema', database)
                query = f"DESCRIBE {catalog}.{schema}.{table}"
                results = query_executor.execute_query(query)
                columns = [row[0] for row in results]
                return jsonify(columns)
            except Exception as e:
                logger.error(f"Error getting Trino columns: {e}", exc_info=True)
                return jsonify({'error': f"Error getting Trino columns: {str(e)}"}), 500
                
        else:
            return jsonify({'error': f"Unsupported database type: {db_type}"}), 400
            
    except Exception as e:
        logger.error(f"Error getting table columns: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@API_ApiList.route('/debug/api_json')
def debug_api_json():
    """
    Debug endpoint to return raw API data as JSON.
    """
    try:
        logger.info("Starting debug_api_json route handler")
        api = APIQueryBuilder('config/ApiDoc.json')
        api_list = api.API_list()
        
        api_configs = {}
        for api_name in api_list:
            api_configs[api_name] = api.get_api_prop(api_name)
        
        return jsonify({
            'api_list': api_list,
            'api_configs': api_configs
        })
    except Exception as e:
        logger.error(f"Error in debug_api_json route: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@API_ApiList.route('/debug')
def debug_page():
    """
    Debug page for API system.
    """
    try:
        logger.info("Starting debug_page route handler")
        api = APIQueryBuilder('config/ApiDoc.json')
        api_list = api.API_list()
        logger.info(f"Found {len(api_list)} APIs for debug page")
        
        api_configs = {}
        for api_name in api_list:
            api_configs[api_name] = api.get_api_prop(api_name)
            
        # Get absolute path to config file
        api_config_path = os.path.abspath('config/ApiDoc.json')
            
        return render_template("api/debug_page.html",
                              api_list=api_list,
                              api_configs=api_configs,
                              api_config_path=api_config_path,
                              active_page='debug')
    except Exception as e:
        logger.error(f"Error in debug_page route: {e}", exc_info=True)
        return render_template("shared/error.html", error=str(e))

