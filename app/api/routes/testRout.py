from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from services.APIQueryBuilder import APIQueryBuilder
from services.logger import setup_logging

testRout = Blueprint('testRout', __name__)
logging = setup_logging()

@testRout.route("/testRout", methods=['POST'])
# @login_required
def test_api():
    response = {'test_key': 1}
    return jsonify(response)


