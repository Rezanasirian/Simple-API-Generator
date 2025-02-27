from flask import Blueprint, request, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from services.APIQueryBuilder import APIQueryBuilder
from services.logger import setup_logging

API_test_api_np = Blueprint('API_test_api', __name__)
logging = setup_logging()

@API_test_api_np.route("/test_api/<key>", methods=['GET'])
# @login_required
def test_api(key):
    # try:
        return render_template("apiTest.html",key=key)
    # except Exception:

