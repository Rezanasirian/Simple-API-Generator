from flask import Blueprint, request, render_template, redirect, url_for, flash,jsonify
from flask_login import login_required, current_user
from SimpleApiGenerator.services.APIQueryBuilder import APIQueryBuilder
from SimpleApiGenerator.services.logger import setup_logging


api_config_per_api_bp = Blueprint('api_configPerApi', __name__)
logger = setup_logging()

@api_config_per_api_bp.route("/configPerApi/<key>", methods=["GET"])
def get_config_per_api(key):
    # try:
        api = APIQueryBuilder('config/ApiDoc.json')
        api_config = api.get_api_prop(key)
        print(api_config)
        return jsonify(api_config)
    # except Exception as e:
    #     logger.error(f"Error getting API config: {e}")
    #     return jsonify({"error": "An error occurred while fetching API configuration"}), 500

