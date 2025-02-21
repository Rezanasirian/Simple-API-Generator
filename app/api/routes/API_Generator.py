from flask import Blueprint, request, jsonify
from services.database import trino_connection
from utils.encoder import newEncoder
from utils.helper_functions import GenerateDictOfRows
from utils.construct_query import construct_query
from utils.update_query import update_query
import json
from services.logger import setup_logging

def create_api_blueprint(name, config):
    bp = Blueprint(name, __name__)
    conn = trino_connection()
    logger = setup_logging()
    
    @bp.route("/" + name, methods=['POST'])
    def handle_api():
        bodydata = request.get_data()
        bodydataJSON = json.loads(bodydata)
        limit = request.args.get('limit', type=int, default=100)
        offset = request.args.get('offset', type=int, default=1)
        sqlCommand = construct_query(api_name=name, parameters=bodydataJSON, offset=offset, limit=limit)
        sqlCommandUpdateCount = update_query(api_name=name, parameters=bodydataJSON)
        try:
            c = conn.cursor()
            logger.info(f"Executing SQL: {sqlCommand}")

            rows = c.execute(sqlCommand)
            columns = [desc[0] for desc in c.description]
            outputData = GenerateDictOfRows(columns, rows.fetchall())
            lastupdate = c.execute(sqlCommandUpdateCount[0]).fetchone()
            rowsCount = c.execute(sqlCommandUpdateCount[1]).fetchone()
            data_count = {
                "RowCount": rowsCount.__str__(),
                "LastUpdateDate": lastupdate.__str__(),
                "TableName": config["TableName"],
                "Data": outputData,
                "sql": sqlCommand
            }
            logger.info("API call successful: %s", sqlCommand)
        except Exception as e:
            logger.error("Error processing request: %s", e, exc_info=True)
            data_count = {
                "RowCount": "",
                "LastUpdateDate": "",
                "TableName": config["TableName"],
                "Data": {},
                "sql": sqlCommand
            }
        finally:
            c.close()
            return jsonify(data_count)

    return bp
