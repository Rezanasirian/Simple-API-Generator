from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app.services.APIQueryBuilder import APIQueryBuilder
from app.services.database import query_executor, DatabaseConnectionError
from app.utils.construct_query import query_constructor
from app.utils.update_query import update_query
from app.services.logger import setup_logging
from typing import Dict, Any, List, Union, Optional
from functools import wraps
from app.middleware.metrics import track_api_calls

API_test_api_np = Blueprint('API_test_api', __name__)
logging = setup_logging()


def handle_api_errors(f):
    """Decorator to handle API errors consistently."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except DatabaseConnectionError as e:
            logging.error(f"Database connection error: {e}")
            return jsonify({"error": "Database connection failed"}), 503
        except ValueError as e:
            logging.error(f"Invalid input: {e}")
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logging.error(f"Unexpected error: {e}", exc_info=True)
            return jsonify({"error": "Internal server error"}), 500

    return decorated_function


@API_test_api_np.route("/test_api/<key>", methods=['GET'])
@track_api_calls(api_id='test_api_page')
def test_api(key: str):
    """Render the API test page."""
    try:
        api = APIQueryBuilder('config/ApiDoc.json')
        api_config = api.get_api_prop(key)
        return render_template("apiTest.html", key=key, api_config=api_config)
    except Exception as e:
        logging.error(f"Error loading test page: {e}")
        flash("Error loading API configuration", "danger")
        return redirect(url_for('main.dashboard'))


@API_test_api_np.route("/test_route", methods=['POST'])
@handle_api_errors
@track_api_calls(api_id='test_route')
def test_route():
    """Execute API test with provided parameters."""
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No parameters provided"}), 400

        # Get API name from request
        api_name = data.pop('apiName', None)
        if not api_name:
            return jsonify({"error": "API name not provided"}), 400

        # Load API configuration
        api = APIQueryBuilder('config/ApiDoc.json')
        api_config = api.get_api_prop(api_name)
        if not api_config:
            return jsonify({"error": f"API '{api_name}' not found"}), 404

        # Get database configuration
        db_config = api_config.get('database', {})

        if not db_config:
            return jsonify({"error": "Database configuration not found"}), 500

        # Get pagination parameters
        try:
            limit = max(1, min(100, int(request.args.get('limit', 100))))
            offset = max(0, int(request.args.get('offset', 0)))
        except ValueError:
            return jsonify({"error": "Invalid pagination parameters"}), 400

        # Construct query
        query = query_constructor.construct_query(
            api_name=api_name,
            parameters=data,
            offset=offset,
            limit=limit
        )
        print(query)
        # Execute query
        results = execute_database_query(query, db_config)

        # Get total count
        total_count = get_row_count(query, db_config)

        # Get last update time if available
        # last_update = None
        # if api_config.get('LastUpdateTableName'):
        #     update_queries = update_query(api_name, data)
        #     if update_queries:
        #         last_update_result = execute_database_query(
        #             update_queries[0],
        #             db_config
        #         )
        #         if last_update_result:
        #             last_update = str(last_update_result[0][0])

        # Prepare response
        response = {
            "success": True,
            "RowCount": str(total_count),
            # "LastUpdateDate": last_update,
            "database": {
                "type": db_config.get('type'),
                "table": db_config.get('table')
            },
            "Data": results,
            "query": query,
            "parameters": data,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total": total_count
            }
        }

        return jsonify(response)

    except Exception as e:
        logging.error(f"Error in test_route: {e}", exc_info=True)
        raise


def execute_database_query(
        query: Union[str, Dict],
        db_config: Dict[str, Any],
        params: Optional[tuple] = None
) -> List[Dict[str, Any]]:
    """Execute query based on database type."""
    db_type = db_config.get('type', 'trino')

    if db_type == 'mongodb':
        return query_executor.execute_query(
            query=query,
            database=db_config.get('database'),
            collection=db_config.get('table')
        )
    # else:  # SQL databases (Trino, MySQL)
    #     return query_executor.execute_query(query=query, params=params)


def get_row_count(
        query: Union[str, Dict],
        db_config: Dict[str, Any]
) -> int:
    """Get total row count based on database type."""
    db_type = db_config.get('type', 'trino')

    if db_type == 'mongodb':
        collection = query_executor.mongo_db.get_collection(
            db_config['name'],
            db_config['table']
        )
        return collection.count_documents(query)
    # else:
    #     count_query = f"SELECT COUNT(*) as count FROM {db_config['table']}"
    #     if isinstance(query, str) and 'WHERE' in query:
    #         count_query += ' ' + query[query.find('WHERE'):]
    #     results = query_executor.execute_query(count_query)
    #     return results[0][0] if results else 0


@API_test_api_np.route('/apiTest')
def apiTest():
    try:
        # Get API key from request
        key = request.args.get('key', '')
        
        # Get API configuration
        api = APIQueryBuilder('config/ApiDoc.json')
        api_config = {}
        
        if key:
            api_config = api.get_api_prop(key)
        
        return render_template("api/apiTest.html", key=key, api_config=api_config, active_page='api_test')
    except Exception as e:
        logging.error(f"Error in apiTest route: {e}")
        return render_template("shared/error.html", error=str(e))

