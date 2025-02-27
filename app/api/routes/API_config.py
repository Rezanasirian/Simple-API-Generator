from flask import Blueprint, request, render_template, redirect, url_for, flash,jsonify
from flask_login import login_required, current_user
from SimpleApiGenerator.services.APIQueryBuilder import APIQueryBuilder
from SimpleApiGenerator.services.logger import setup_logging


api_config_bp = Blueprint('api_config', __name__)
logger = setup_logging()

@api_config_bp.route("/config", methods=["GET"])
def get_api_config():
    # try:
        api = APIQueryBuilder('config/ApiDoc.json')
        api_config = api._load_json()
        print(api_config)
        return jsonify(api_config)
    # except Exception as e:
    #     logger.error(f"Error getting API config: {e}")
    #     return jsonify({"error": "An error occurred while fetching API configuration"}), 500

