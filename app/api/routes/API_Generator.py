from flask import Blueprint, request, jsonify
from app.services.database import query_executor, DatabaseConnectionError
from app.utils.encoder import newEncoder
from app.utils.helper_functions import GenerateDictOfRows
from app.utils.construct_query import query_constructor
from app.utils.update_query import update_query
from typing import Dict, Any, Optional, List, Union, Tuple
from app.services.logger import setup_logging
from app.services.connection_configs import DatabaseType
from functools import wraps
import re
import traceback

# Initialize logger
logger = setup_logging(__name__)


def handle_api_errors(f):
    """Decorator to handle API errors consistently."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except DatabaseConnectionError as e:
            logger.error(f"Database connection error: {e}")
            return jsonify({"error": "Database connection failed", "details": str(e)}), 503
        except ValueError as e:
            logger.error(f"Invalid input: {e}")
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            return jsonify({
                "error": "Internal server error", 
                "details": str(e),
                "trace": traceback.format_exc() if request.args.get('debug') == '1' else None
            }), 500

    return decorated_function


def validate_request_data(data: Dict[str, Any], api_config: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validate request data against API configuration.
    
    Args:
        data: Request data to validate
        api_config: API configuration from ApiDoc.json
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(data, dict):
        return False, "Invalid request format, expected JSON object"
    
    # Validate against defined conditions
    for condition_group in api_config.get('Conditions', []):
        for param_name, condition in condition_group.items():
            if param_name in data:
                # Check if parameter exists in request
                param_value = data[param_name]
                
                # Skip validation for ignored values
                if param_value == condition.get('IgnoreIf'):
                    continue
                
                # Check required fields
                if condition.get('required', False) and (param_value is None or param_value == ''):
                    return False, f"Parameter '{param_name}' is required"
                
                # Validate data type
                data_type = condition.get('data_type')
                if data_type:
                    if data_type == 'integer' and not isinstance(param_value, int):
                        try:
                            data[param_name] = int(param_value)
                        except (ValueError, TypeError):
                            return False, f"Parameter '{param_name}' must be an integer"
                    
                    elif data_type == 'string' and not isinstance(param_value, str):
                        data[param_name] = str(param_value)
                
                # Apply validation rules
                validation = condition.get('validation', {})
                if validation:
                    if 'min' in validation and param_value < validation['min']:
                        return False, f"Parameter '{param_name}' must be at least {validation['min']}"
                    
                    if 'max' in validation and param_value > validation['max']:
                        return False, f"Parameter '{param_name}' must be at most {validation['max']}"
                        
                    if 'min_length' in validation and len(str(param_value)) < validation['min_length']:
                        return False, f"Parameter '{param_name}' must be at least {validation['min_length']} characters"
                        
                    if 'max_length' in validation and len(str(param_value)) > validation['max_length']:
                        return False, f"Parameter '{param_name}' must be at most {validation['max_length']} characters"
                        
                    if 'pattern' in validation and not re.match(validation['pattern'], str(param_value)):
                        return False, f"Parameter '{param_name}' must match pattern {validation['pattern']}"
    
    return True, None


def execute_database_query(
        query: Union[str, Dict],
        db_config: Dict[str, Any],
        params: Optional[tuple] = None
) -> List[Dict[str, Any]]:
    """
    Execute query based on database type.

    Args:
        query: Query string or dict for MongoDB
        db_config: Database configuration
        params: Query parameters

    Returns:
        List of query results as dictionaries
    """
    db_type = db_config.get('type', 'trino')

    if db_type == DatabaseType.MONGODB.value:
        return query_executor.execute_query(
            query=query,
            database=db_config.get('database'),
            collection=db_config.get('table')
        )
    else:  # SQL databases (Trino, MySQL)
        return query_executor.execute_query(query=query, params=params)


def get_row_count(
        query: Union[str, Dict],
        db_config: Dict[str, Any]
) -> int:
    """
    Get total row count based on database type.

    Args:
        query: Query or filter criteria
        db_config: Database configuration

    Returns:
        Total number of rows
    """
    db_type = db_config.get('type', 'trino')

    if db_type == DatabaseType.MONGODB.value:
        collection = query_executor.mongo_db.get_collection(
            db_config['database'],
            db_config['table']
        )
        return collection.count_documents(query)
    else:
        count_query = f"SELECT COUNT(*) as count FROM {db_config['table']}"
        if isinstance(query, str) and 'WHERE' in query:
            count_query += ' ' + query[query.find('WHERE'):]
        results = query_executor.execute_query(count_query)
        return results[0][0] if results else 0


def format_response_data(results: List[Dict[str, Any]], api_config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Format response data based on API configuration.
    
    Args:
        results: Query results
        api_config: API configuration
        
    Returns:
        Formatted response data
    """
    response_config = api_config.get('response', {})
    fields = response_config.get('fields', [])
    transformations = response_config.get('transformations', {})
    
    # If no fields specified, return all fields
    if not fields:
        return results
    
    formatted_results = []
    for result in results:
        formatted_result = {}
        
        # Add specified fields
        for field in fields:
            if field in result:
                formatted_result[field] = result[field]
        
        # Apply transformations
        for new_field, transform_expr in transformations.items():
            # This is a simplified example - in production, you would use a proper expression evaluator
            if "CONCAT" in transform_expr:
                # Extract field names from CONCAT expression
                concat_fields = re.findall(r'([a-zA-Z_]+)', transform_expr)
                values = []
                for field in concat_fields:
                    if field in result:
                        values.append(str(result[field]))
                
                # Join values with the separator(s) specified in the expression
                separators = re.findall(r"'([^']*)'", transform_expr)
                if separators:
                    separator = separators[0]
                    formatted_result[new_field] = separator.join(values)
                else:
                    formatted_result[new_field] = ''.join(values)
        
        formatted_results.append(formatted_result)
    
    return formatted_results


def create_api_blueprint(name: str, config: Dict[str, Any]) -> Blueprint:
    """
    Create a blueprint for handling API requests.

    Args:
        name: API name
        config: API configuration

    Returns:
        Blueprint: Configured Flask blueprint
    """
    bp = Blueprint(name, __name__)

    @bp.route("/" + name, methods=['POST'])
    @handle_api_errors
    def handle_api():
        """Handle API requests."""
        try:
            # Parse request data
            body_data = request.get_data()
            body_data_json = request.get_json() or {}

            # Validate request data
            is_valid, error = validate_request_data(body_data_json, config)
            if not is_valid:
                return jsonify({"error": error}), 400

            # Get pagination parameters from request or configuration
            pagination_config = config.get('pagination', {})
            default_limit = pagination_config.get('default_limit', 100)
            max_limit = pagination_config.get('max_limit', 1000)
            
            try:
                limit = max(1, min(max_limit, int(request.args.get('limit', default_limit))))
                offset = max(0, int(request.args.get('offset', 0)))
            except ValueError:
                return jsonify({"error": "Invalid pagination parameters"}), 400

            # Get database configuration
            db_config = config.get('database', {})
            if not db_config:
                return jsonify({"error": "Missing database configuration"}), 500

            # Get ordering parameters
            ordering_config = config.get('ordering', {})
            default_order_field = ordering_config.get('default_field')
            default_order_direction = ordering_config.get('default_direction', 'ASC')
            
            order_by = request.args.get('order_by', default_order_field)
            order_direction = request.args.get('order_direction', default_order_direction).upper()
            
            if order_direction not in ['ASC', 'DESC']:
                order_direction = default_order_direction

            # Construct query
            query = query_constructor.construct_query(
                api_name=name,
                parameters=body_data_json,
                offset=offset,
                limit=limit,
                order_by=order_by,
                order_direction=order_direction
            )

            # Execute query
            results = execute_database_query(query, db_config)
            
            # Format response data based on configuration
            formatted_results = format_response_data(results, config)

            # Get total count
            total_count = get_row_count(query, db_config)

            # Prepare response
            response_data = {
                "api_name": name,
                "api_version": config.get('version', '1.0.0'),
                "total_records": total_count,
                "database": {
                    "type": db_config.get('type'),
                    "name": db_config.get('database'),
                    "table": db_config.get('table')
                },
                "data": formatted_results,
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "total": total_count,
                    "page": offset // limit + 1,
                    "total_pages": (total_count + limit - 1) // limit
                },
                "ordering": {
                    "field": order_by,
                    "direction": order_direction
                }
            }

            # Include query in debug mode
            if request.args.get('debug') == '1':
                response_data["query"] = query

            # Add cache headers if caching is enabled
            cache_config = config.get('cache', {})
            if cache_config.get('enabled', False):
                ttl = cache_config.get('ttl_seconds', 3600)
                response = jsonify(response_data)
                response.headers['Cache-Control'] = f'public, max-age={ttl}'
                return response

            logger.info(f"Successfully executed API {name}")
            return jsonify(response_data)

        except Exception as e:
            logger.error(f"Error in API {name}: {e}", exc_info=True)
            raise

    return bp
