from trino.dbapi import connect
# import mysql.connector
from services.connection_configs import trino_conn_config, mysql_conn_config
from services.logger import setup_logging
logging = setup_logging()

def trino_connection():
    try:
        config = trino_conn_config()
        conn = connect(**config)
        return conn
    except Exception as e:
        logging.error(f"Failed to establish Trino connection: {e}")
        raise
#
# def mysql_connection():
#     try:
#         config = mysql_conn_config()
#         mysqlconn = mysql.connector.connect(**config)
#         return mysqlconn
#     except mysql.connector.Error as e:
#         logging.error(f"Failed to establish MySQL connection: {e}")
#         raise
#     except Exception as e:
#         logging.error(f"Unexpected error in MySQL connection: {e}")
#         raise
