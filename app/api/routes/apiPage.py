from flask import Blueprint, request, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from services.APIQueryBuilder import APIQueryBuilder
from services.logger import setup_logging

API_ApiList = Blueprint('API_ApiList', __name__)
logger = setup_logging()

@API_ApiList.route('/apiList', methods=['GET'])
def apiList():
    try:
        tableList = ['Rpt_BOM_chq', 'Rpt_BOM_BORM', 'Rpt_BOM_Riz', 'Rpt_BOM_loan', 'Rpt_BOM_Riz1']
        colName = ['acct_no', 'customer_no', '1']

        api = APIQueryBuilder('config/ApiDoc.json')
        apilistname = api.API_list()
        return render_template("apiList.html",
                               ApiList=apilistname,
                                tableList=tableList,
                                colName=colName)
    except Exception as e:
        logger.error(f"Error in load apiList {e}")
        return render_template("error.html",error=str(e))