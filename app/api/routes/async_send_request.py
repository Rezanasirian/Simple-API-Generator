# from flask import Blueprint, request, json
# from services.database import trino_connection,mysql_connection
# from utils.encoder import newEncoder
# from utils.helper_functions import GenerateDictOfRows

# async_request_bp = Blueprint('async_request', __name__)
# conn = trino_connection()
# mysqlconn = mysql_connection()

# @async_request_bp.route("/API_ASYNC_SendRequest", methods=['POST'])
# def API_ASYNC_SendRequest():
#     # Your existing function code here
#     return json.dumps(DataCount, default=newEncoder, ensure_ascii=False)
