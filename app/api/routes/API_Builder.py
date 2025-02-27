from flask import Blueprint, request, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from services.APIQueryBuilder import APIQueryBuilder
from services.logger import setup_logging

API_Builder_np = Blueprint('API_Builder', __name__)
logging = setup_logging()

@API_Builder_np.route("/edit_api", methods=['GET', 'POST'])
# @login_required
def edit_api():
    # try:
        # if current_user.role not in ['admin', 'user']:
        #     flash('Access denied!', 'danger')
        #     return redirect(url_for('main.dashboard'))
        #
        table_list = {'Rpt_BOM_chq', 'Rpt_BOM_BORM', 'Rpt_BOM_Riz', 'Rpt_BOM_loan', 'Rpt_BOM_Riz1'}
        col_name = {'acct_no', 'customer_no', '1'}
        api = APIQueryBuilder('config/ApiDoc.json')

        api_name_list = api.API_list()

        if request.method == "POST":
            action = request.form.get('submit')
            if action == 'Save changes':
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
                api_name_list = api.API_list()
                return render_template("apiList.html", ApiName=api_name_list, TableList=table_list, ColName=col_name)
            elif action == 'Search':
                search_query = request.form.get('Search', '').lower()
                filtered_apis = [name for name in api_name_list if search_query in name.lower()]
                return render_template("apiList.html", ApiName=filtered_apis, TableList=table_list, ColName=col_name)
        
        return render_template("apiList.html", ApiName=api_name_list, TableList=table_list, ColName=col_name,
                               show_add_api=True, show_search=True, Page_name="API Generator")
    # except Exception as e:
    #     logging.error(f"Error in edit_api: {e}")
    #     return render_template("error.html", error=str(e))
