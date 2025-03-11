from flask import Blueprint, request, jsonify
from services.database import query_executor, DatabaseConnectionError
from utils.encoder import newEncoder
from utils.helper_functions import GenerateDictOfRows
from utils.construct_query import query_constructor
from utils.update_query import update_query
from typing import Dict, Any, Optional, List, Union
from services.logger import setup_logging
from services.connection_configs import DatabaseType
from functools import wraps

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
            return jsonify({"error": "Database connection failed"}), 503
        except ValueError as e:
            logger.error(f"Invalid input: {e}")
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            return jsonify({"error": "Internal server error"}), 500

    return decorated_function


def validate_request_data(data: Dict[str, Any]) -> Optional[str]:
    """Validate request data."""
    if not isinstance(data, dict):
        return "Invalid request format"
    return None


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
            # Parse and validate request data
            bodydata = request.get_data()
            bodydataJSON = request.get_json()

            error = validate_request_data(bodydataJSON)
            if error:
                return jsonify({"error": error}), 400

            # Get pagination parameters
            try:
                limit = max(1, min(100, int(request.args.get('limit', 100))))
                offset = max(0, int(request.args.get('offset', 0)))  # Changed to 0-based
            except ValueError:
                return jsonify({"error": "Invalid pagination parameters"}), 400

            # Get database configuration
            db_config = config.get('database', {})
            if not db_config:
                return jsonify({"error": "Missing database configuration"}), 500

            # Construct query
            query = query_constructor.construct_query(
                api_name=name,
                parameters=bodydataJSON,
                offset=offset,
                limit=limit
            )

            # Execute query
            results = execute_database_query(query, db_config)

            # Get total count
            total_count = get_row_count(query, db_config)

            # Get last update time if available
            # last_update = None
            # if config.get('LastUpdateTableName'):
            #     update_queries = update_query(name, bodydataJSON)
            #     if update_queries:
            #         last_update_result = execute_database_query(
            #             update_queries[0],
            #             db_config
            #         )
            #         if last_update_result:
            #             last_update = str(last_update_result[0][0])

            # Prepare response
            response_data = {
                "RowCount": str(total_count),
                # "LastUpdateDate": last_update,
                "database": {
                    "type": db_config.get('type'),
                    "table": db_config.get('table')
                },
                "Data": results,
                "query": query,
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "total": total_count
                }
            }

            logger.info(f"Successfully executed API {name}")
            return jsonify(response_data)

        except Exception as e:
            logger.error(f"Error in API {name}: {e}", exc_info=True)
            raise

    return bp
