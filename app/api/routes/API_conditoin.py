from flask import Blueprint, request, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from SimpleApiGenerator.services.APIQueryBuilder import APIQueryBuilder
from SimpleApiGenerator.services.logger import setup_logging



# Blueprint definition
API_Condition_np = Blueprint('API_Condition', __name__)
logging = setup_logging()


@API_Condition_np.route("/apiCondition/<key>", methods=['GET', 'POST'])
# @login_required
def apiCondition(key):
    try:
        api = APIQueryBuilder('config/ApiDoc.json')
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
        get_parameter = request.form.get("Parameter")
        api.update_condition(key, get_parameter, condition_details)
        return redirect(url_for("API_Edit.edit_api", key=key))
    except Exception as e:
        logging.error(f"Error in construct_condition_details: {e}")
        raise
