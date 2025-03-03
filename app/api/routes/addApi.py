from flask import Blueprint, request, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from services.APIQueryBuilder import APIQueryBuilder
from services.logger import setup_logging

from SimpleApiGenerator.app.api.routes.apiPage import API_ApiList

API_addApi_np = Blueprint('API_addApi', __name__)
logging = setup_logging()


@API_addApi_np.route("/addApi", methods=['POST'])
# @login_required
def addApi():
    try:
    # if current_user.role not in ['admin', 'user']:
    #     flash('Access denied!', 'danger')
    #     return redirect(url_for('main.dashboard'))

        api = APIQueryBuilder('config/ApiDoc.json')
        api_name = request.form.get('APIName', '')
        table_name = request.form.get('TableName', '')
        order_by = request.form.get('OrderBy', '')
        order_type = request.form.get('OrderType', '')
        last_update_table_name = request.form.get('LastUpdateTableName', '')

        api_details = {
            "TableName": table_name,
            "OrderBy": order_by,
            "OrderType": order_type,
            "LastUpdateTableName": last_update_table_name,
            "conditions": {}
        }

        api.add_api(api_name, api_details)

        return redirect(url_for('API_ApiList.apiList'))

    except Exception as e:
        logging.error(f"Error in addApi: {e}")
        return render_template("error.html", error=str(e))
