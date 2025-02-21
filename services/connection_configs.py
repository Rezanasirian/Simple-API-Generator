from trino.auth import BasicAuthentication
from services.logger import setup_logging
logging = setup_logging()
def trino_conn_config():
    try:
        return {
            "host": "SRV24682.agri-bank.com",
            "port": 8443,
            "user": "admin",
            "auth": BasicAuthentication("admin", "P@ssw0rd"),
            "catalog": "hive",
            "schema": "dw",
            "http_scheme": "https",
            "verify": False
        }
    except Exception as e:
        logging.error(f"Error in trino_conn_config: {e}")
        raise

def mysql_conn_config():
    try:
        return {
            "host": "10.0.246.86",
            "user": "hadoop",
            "password": "P@ssw0rd"
        }
    except Exception as e:
        logging.error(f"Error in mysql_conn_config: {e}")
        raise