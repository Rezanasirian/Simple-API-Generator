from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from SimpleApiGenerator.services.APIQueryBuilder import APIQueryBuilder
from SimpleApiGenerator.services.logger import setup_logging


API_Condition_np = Blueprint('API_Condition', __name__)
logging = setup_logging()


@API_Condition_np.route("/apiCondition/<key>", methods=['POST'])
def apiCondition(key):
    try:
        api = APIQueryBuilder('config/ApiDoc.json')

        print("Processing JSON request...")
        data = request.get_json()

        if not data:
            return jsonify({"error": "Invalid or missing JSON body"}), 400

        if data["action"] == "update_condition":
            api.update_condition(key, data.get("Parameter"), data)
            return jsonify({"message": "Condition updated successfully"}), 200

        elif data["action"] == "delete_condition":
            api.delete_condition(key, data.get("Parameter"))
            return jsonify({"message": "Condition Deleted successfully"}), 200

    except Exception as e:
        logging.error(f"Error in `apiCondition`: {e}")
        return jsonify({"error": str(e)}), 500
