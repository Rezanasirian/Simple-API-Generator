from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from services.APIQueryBuilder import APIQueryBuilder
from services.database import query_executor
from services.logger import setup_logging
from services.connection_configs import DatabaseType
from typing import Dict, Any, List, Set
import json

# Constants
COLUMN_SET: List[str] = ['acct_no', 'customer_no']
CAST_TYPES: Set[str] = {'int', 'varchar(20)'}
IGNORE_IF_OPTIONS: Set[str] = {'All', '-3'}
OPERATORS: Set[str] = {'=', '<=', '>=', 'in', '<', '>'}
CAST_OPTIONS: Set[str] = {'int', 'varchar'}

# Blueprint definition
API_Edit_np = Blueprint('API_Edit', __name__)
API_apiCondition_np = Blueprint('API_Edit', __name__)
logging = setup_logging()


def get_database_tables(db_config: Dict[str, Any]) -> List[str]:
    """
    Fetch tables/collections from the configured database.

    Args:
        db_config: Database configuration dictionary

    Returns:
        List of table/collection names
    """
    try:
        db_type = db_config.get('type', 'trino')
        if db_type == DatabaseType.MONGODB.value:
            # Fetch collections from MongoDB
            database = db_config.get('database', 'banking')
            db = query_executor.mongo_db.get_database(database)
            print(db.list_collection_names())
            return db.list_collection_names()
        #
        # elif db_type == DatabaseType.TRINO.value:
        #     # Fetch tables from Trino
        #     catalog = db_config.get('catalog', 'hive')
        #     schema = db_config.get('schema', 'agridw')
        #     query = f"SHOW TABLES FROM {catalog}.{schema}"
        #     results = query_executor.execute_query(query)
        #     return [row[0] for row in results]
        #
        # elif db_type == DatabaseType.MYSQL.value:
        #     # Fetch tables from MySQL
        #     database = db_config.get('database', 'banking')
        #     query = f"SHOW TABLES FROM {database}"
        #     results = query_executor.execute_query(query)
        #     return [row[0] for row in results]



        else:
            logging.error(f"Unsupported database type: {db_type}")
            return []

    except Exception as e:
        logging.error(f"Error fetching tables: {str(e)}")
        return []


def get_table_columns(db_config: Dict[str, Any], table_name: str) -> List[str]:
    """
    Fetch columns from the specified table.

    Args:
        db_config: Database configuration dictionary
        table_name: Name of the table/collection

    Returns:
        List of column names
    """
    try:
        db_type = db_config.get('type', 'trino')

        if db_type == DatabaseType.TRINO.value:
            catalog = db_config.get('catalog', 'hive')
            schema = db_config.get('schema', 'agridw')
            query = f"SHOW COLUMNS FROM {catalog}.{schema}.{table_name}"
            results = query_executor.execute_query(query)
            return [row[0] for row in results]

        elif db_type == DatabaseType.MYSQL.value:
            database = db_config.get('database', 'banking')
            query = f"SHOW COLUMNS FROM {database}.{table_name}"
            results = query_executor.execute_query(query)
            return [row[0] for row in results]

        elif db_type == DatabaseType.MONGODB.value:
            # For MongoDB, we'll get a sample document to determine fields
            database = db_config.get('database', 'banking')
            collection = query_executor.mongo_db.get_collection(database, table_name)
            sample = collection.find_one()
            if sample:
                return list(sample.keys())
            return []

        else:
            logging.error(f"Unsupported database type: {db_type}")
            return []

    except Exception as e:
        logging.error(f"Error fetching columns: {str(e)}")
        return []


@API_Edit_np.route("/edit_api/<key>", methods=['GET', 'POST'])
def edit_api(key: str) -> Any:
    """
    Handle API editing functionality.

    Args:
        key: The API key/name to edit

    Returns:
        Rendered template or JSON response
    """
    try:
        api = APIQueryBuilder('config/ApiDoc.json')
        api_prop = api.get_api_prop(key)

        # Get database configuration
        db_config = api_prop.get('database', {})

        # Fetch tables/collections based on database type
        table_list = get_database_tables(db_config)

        # Get columns for the current table
        current_table = db_config.get('table', '')
        column_list = get_table_columns(db_config, current_table) if current_table else []

        return render_template(
            "index2.html",
            tableList=table_list,
            colName=column_list,
            api_prop=api_prop,
            API_Name=key,
            TableName=current_table,
            Operator=OPERATORS,
            Column=column_list,
            Cast=CAST_TYPES,
            IgnoreIf=IGNORE_IF_OPTIONS,
            OrderBy=api_prop.get('OrderBy', ''),
            OrderType=api_prop.get('OrderType', 'ASC'),
            LastUpdateTableName=api_prop.get('LastUpdateTableName', ''),
            castOptions=CAST_OPTIONS,
            conditions=api_prop.get('Conditions', []),
            back_to_list=True,
            Page_name=key,
            database_type=db_config.get('type', 'trino')
        )

    except Exception as e:
        logging.error(f"Error in edit_api {key}: {str(e)}")
        flash(f"An error occurred: {str(e)}", 'danger')
        return redirect(url_for('main.dashboard'))


@API_Edit_np.route("/get_columns/<table_name>", methods=['GET'])
def get_columns(table_name: str) -> jsonify:
    """
    API endpoint to fetch columns for a specific table.

    Args:
        table_name: Name of the table/collection

    Returns:
        JSON response with column list
    """
    try:
        api = APIQueryBuilder('config/ApiDoc.json')
        api_prop = api.get_api_prop(request.args.get('api_name', ''))
        db_config = api_prop.get('database', {})

        columns = get_table_columns(db_config, table_name)
        return jsonify({'columns': columns})

    except Exception as e:
        logging.error(f"Error fetching columns for {table_name}: {str(e)}")
        return jsonify({'error': str(e)}), 500


def update_api_properties(key: str, data: Dict, api: APIQueryBuilder, api_prop: Dict) -> jsonify:
    """
    Update API properties from JSON data.

    Args:
        key: The API key/name
        data: The JSON data containing new properties
        api: The APIQueryBuilder instance
        api_prop: The current API properties

    Returns:
        JSON response
    """
    try:
        api_details = {
            "TableName": data.get("tableName"),
            "OrderBy": data.get("orderBy"),
            "OrderType": data.get("orderType"),
            "LastUpdateTableName": data.get("lastUpdateTable"),
            "description": data.get("description"),
            "Conditions": api_prop.get('Conditions', {})
        }

        api.update_api(key, api_details)
        return jsonify({'message': 'API properties updated successfully'})

    except Exception as e:
        logging.error(f"Error in update_api_properties {key}: {str(e)}")
        return jsonify({'error': str(e)}), 500


def save_api_properties(key: str, request: request, api: APIQueryBuilder, api_prop: Dict) -> None:
    """
    Save API properties from form data.

    Args:
        key: The API key/name
        request: The Flask request object
        api: The APIQueryBuilder instance
        api_prop: The current API properties
    """
    try:
        api_details = {
            "TableName": request.form.get("TableName"),
            "OrderBy": request.form.get("OrderBy"),
            "OrderType": request.form.get("OrderType"),
            "LastUpdateTableName": request.form.get("LastUpdateTableName"),
            "Conditions": api_prop.get('Conditions', {})
        }
        api.update_api(key, api_details)
    except Exception as e:
        logging.error(f"Error in save_api_properties {key}: {str(e)}")
        raise

