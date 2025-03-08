from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from services.APIQueryBuilder import APIQueryBuilder
from services.logger import setup_logging
from typing import Dict, Any, List, Set
import json

# Constants
TABLE_LIST: Set[str] = {'Rpt_BOM_chq', 'Rpt_BOM_BORM', 'Rpt_BOM_Riz', 'Rpt_BOM_loan', 'Rpt_BOM_Riz1'}
COLUMN_SET: List[str] = ['acct_no', 'customer_no']
CAST_TYPES: Set[str] = {'int', 'varchar(20)'}
IGNORE_IF_OPTIONS: Set[str] = {'All', '-3'}
OPERATORS: Set[str] = {'=', '<=', '>=', 'in', '<', '>'}
CAST_OPTIONS: Set[str] = {'int', 'varchar'}

# Blueprint definition
API_Edit_np = Blueprint('API_Edit', __name__)
API_apiCondition_np = Blueprint('API_Edit', __name__)
logging = setup_logging()


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
        # Check user permissions
        # if current_user.role not in ['admin', 'user']:
        #     flash('Access denied!', 'danger')
        #     return redirect(url_for('main.dashboard'))

        api = APIQueryBuilder('config/ApiDoc.json')
        api_prop = api.get_api_prop(key)

        return render_template(
            "index2.html",
            tableList=list(TABLE_LIST),
            colName=COLUMN_SET,
            api_prop=api_prop,
            API_Name=key,
            TableName=api_prop['TableName'],
            Operator=OPERATORS,
            Column=COLUMN_SET,
            Cast=CAST_TYPES,
            IgnoreIf=IGNORE_IF_OPTIONS,
            OrderBy=api_prop['OrderBy'],
            OrderType=api_prop['OrderType'],
            LastUpdateTableName=api_prop['LastUpdateTableName'],
            castOptions=CAST_OPTIONS,
            conditions=api_prop.get('conditions', {}),
            back_to_list=True,
            Page_name=key
        )

    except Exception as e:
        logging.error(f"Error in edit_api {key}: {str(e)}")
        flash(f"An error occurred: {str(e)}", 'danger')
        return redirect(url_for('main.dashboard'))


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
            "conditions": api_prop.get('conditions', {})
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
            "conditions": api_prop.get('conditions', {})
        }
        api.update_api(key, api_details)
    except Exception as e:
        logging.error(f"Error in save_api_properties {key}: {str(e)}")
        raise

