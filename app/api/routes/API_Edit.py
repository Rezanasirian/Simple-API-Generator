from flask import Blueprint, request, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from services.APIQueryBuilder import APIQueryBuilder
from services.logger import setup_logging

# Constants
TABLE_LIST = {'Rpt_BOM_chq', 'Rpt_BOM_BORM', 'Rpt_BOM_Riz', 'Rpt_BOM_loan', 'Rpt_BOM_Riz1'}
COLUMN_SET = ['acct_no', 'customer_no']
CAST_TYPES = {'int', 'varchar(20)'}
IGNORE_IF_OPTIONS = {'All', '-3'}
OPERATORS = {'=', '<=', '>=', 'in', '<', '>'}
CAST_OPTIONS = {'int', 'varchar'}

# Blueprint definition
API_Edit_np = Blueprint('API_Edit', __name__)
logging = setup_logging()

@API_Edit_np.route("/edit_api/<key>", methods=['GET', 'POST'])
# @login_required
def edit_api(key):
    # try:
        # if current_user.role != 'admin' and current_user.role != 'user':
        #     flash('Access denied!', 'danger')
        #     return redirect(url_for('main.dashboard'))

        api = APIQueryBuilder('config/ApiDoc.json')
        api_prop = api.get_api_prop(key)

        if request.method == "POST":
            handle_post_request(key, request, api, api_prop)
            api_prop = api.get_api_prop(key)

        return render_template("index2.html", tableList=list(TABLE_LIST),
                               colName=COLUMN_SET,
                               api_prop=api_prop,
                               API_Name=key,
                               TableName=api_prop['TableName'],
                               Operator=OPERATORS, Column=COLUMN_SET, Cast=CAST_TYPES, IgnoreIf=IGNORE_IF_OPTIONS,
                               OrderBy=api_prop['OrderBy'], OrderType=api_prop['OrderType'],
                               LastUpdateTableName=api_prop['LastUpdateTableName'],
                               castOptions=CAST_OPTIONS,
                               conditions=api_prop.get('conditions', {}),
                               back_to_list=True, Page_name=key)
    # except Exception as e:
    #     logging.error(f"Error in edit_api {key}: {e}")
    #     return render_template("error.html", error=str(e))

def handle_post_request(key, request, api, api_prop):
    try:
        action = request.form.get('submit')
        if action == 'Save API Properties':
            save_api_properties(key, request, api, api_prop)
        elif action in ['Add Condition', 'edit condition']:
            manage_conditions(key, request, api, api_prop)
    except Exception as e:
        logging.error(f"Error in handle_post_request {key}: {e}")
        raise

def save_api_properties(key, request, api, api_prop):
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
        logging.error(f"Error in save_api_properties {key}: {e}")
        raise

def manage_conditions(key, request, api, api_prop):
    try:
        get_parameter = request.form.get("Parameter")
        condition_details = construct_condition_details(request)
        api.update_condition(key, get_parameter, condition_details)
    except Exception as e:
        logging.error(f"Error in manage_conditions {key}: {e}")
        raise

def construct_condition_details(request):
    try:
        condition_details = {
            "operator": request.form.get("Operator"),
            "Name": request.form.get("Name"),
            "Column": request.form.get("Column"),
            "ignoreIf": request.form.get("IgnoreIf"),
            "transformations": {}
        }

        if request.form.get("castCheck"):
            condition_details["transformations"]["cast"] = request.form.get("castOptions")

        # Handling dynamic substrings 
        dynamicsubstring = []
        index = 1
        while True:
            dynamic_length = request.form.get(f"dynamicSubstringLength-{index}")
            if not dynamic_length:
                break
            start_index = request.form.get(f"substringStartDynamic-{index}")
            length = request.form.get(f"substringLengthDynamic-{index}")
            if start_index and length:
                dynamicsubstring.append({
                    "valuelength": dynamic_length,
                    "start": int(start_index),
                    "length": int(length)
                })
            index += 1
        if dynamicsubstring:
            condition_details["transformations"]["dynamicsubstring"] = dynamicsubstring

        if request.form.get("substringCheck"):
            condition_details["transformations"]["substring"] = [
                int(request.form.get("substringStart")),
                int(request.form.get("substringLength"))
            ]

        if request.form.get("replaceCheck"):
            condition_details["transformations"]["replace"] = [
                request.form.get("replaceOld"),
                request.form.get("replaceNew")
            ]

        if request.form.get("trimCheck"):
            condition_details["transformations"]["trim"] = True

        if request.form.get("sqlCode"):
            condition_details["sqlCommand"] = request.form.get("sqlCode")

        return condition_details
    except Exception as e:
        logging.error(f"Error in construct_condition_details: {e}")
        raise
